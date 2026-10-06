// Edita um anúncio JÁ publicado: garantia, atributo da ficha ou descrição. Escrita — exige --confirmo.
//
//   npm run ml:editar -- MLB123 --garantia "fabrica:3 meses"            → mostra o antes e o que mudaria
//   npm run ml:editar -- MLB123 --atributo "DRY_TIME=8 h" --atributo "GTIN=789..."
//   npm run ml:editar -- MLB123 --descricao produtos/<slug>/oferta.json  → usa o campo "descricao"
//   ... --confirmo                                                        → grava e confere
//
// Toda edição pode mexer no ranqueamento (metodologia, regra de ouro da edição): anúncio que já
// vende só se edita com motivo. O título NÃO se edita por aqui: no fluxo User Products ele é
// irreversível (docs/16); para isso existe o ml:recriar.
//
// Conferência depois de gravar: título, status, preço e a contagem de atributos não podem mudar
// (exceto o atributo que se quis acrescentar). Um PUT com um atributo só preserva os demais —
// visto em 06/10/2026 —, mas isso é conferido a cada vez, não assumido.
import { readFileSync } from "node:fs";
import { ml, morrer } from "./api.js";
import { args } from "../cli.ts";
import { termosDeGarantia, TIPOS_GARANTIA, avisarSobreDescricao } from "./publicar.ts";

const ids = args.filter((a, i) => /^MLB\d+$/i.test(a) && !args[i - 1]?.startsWith("--"));
const confirmou = args.includes("--confirmo");
const valoresDe = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]] : []));

const garantiaTxt = valoresDe("--garantia")[0];
const atributos = valoresDe("--atributo").map((par) => {
  const i = par.indexOf("=");
  if (i < 1) morrer(new Error(`--atributo "${par}" não está no formato ID=valor (ex.: "DRY_TIME=8 h").`));
  return { id: par.slice(0, i).trim().toUpperCase(), value_name: par.slice(i + 1).trim() };
});
const arqDescricao = valoresDe("--descricao")[0];

if (!ids.length || (!garantiaTxt && !atributos.length && !arqDescricao)) {
  morrer(new Error(
    'Uso: npm run ml:editar -- MLB123 [MLB456 …] [--garantia "fabrica:3 meses"] ' +
    '[--atributo "ID=valor" …] [--descricao produtos/<slug>/oferta.json] [--confirmo]',
  ));
}

let saleTerms: ReturnType<typeof termosDeGarantia> | null = null;
if (garantiaTxt) {
  const [tipo, prazo] = garantiaTxt.split(":").map((s) => s.trim());
  if (!(tipo in TIPOS_GARANTIA)) morrer(new Error(`--garantia: tipo "${tipo}" inválido. Use fabrica, vendedor ou sem.`));
  if (tipo !== "sem" && !/^\d+ (dias|meses|anos)$/.test(prazo ?? "")) {
    morrer(new Error(`--garantia: prazo "${prazo ?? ""}" inválido. Use "fabrica:3 meses", "vendedor:90 dias"…`));
  }
  saleTerms = termosDeGarantia({ tipo: tipo as keyof typeof TIPOS_GARANTIA, prazo });
}

let descricao: string | null = null;
if (arqDescricao) {
  const bruto = readFileSync(arqDescricao, "utf8");
  descricao = arqDescricao.endsWith(".json") ? JSON.parse(bruto).descricao : bruto;
  if (!descricao?.trim()) morrer(new Error(`${arqDescricao} não tem descrição.`));
  avisarSobreDescricao(descricao!);
}

const resumo = (i: any) => ({
  titulo: i.title, status: i.status, preco: i.price, atributos: i.attributes.length,
  garantia: i.sale_terms.filter((s: any) => /WARRANTY/.test(s.id)).map((s: any) => s.value_name).join(", ") || "—",
});

try {
  const me = await ml("/users/me");
  let falhas = 0;
  for (const id of ids) {
    const antes: any = await ml(`/items/${id}`);
    if (antes.seller_id !== me.id) { console.log(`\n✗ ${id} não é desta conta. Pulei.`); falhas++; continue; }
    const r0 = resumo(antes);
    console.log(`\n── ${id} · ${r0.titulo}`);
    console.log(`   hoje: ${r0.status} · R$ ${r0.preco} · ${r0.atributos} atributos · garantia ${r0.garantia}`);
    if (saleTerms) console.log(`   garantia → ${saleTerms.map((s) => s.value_name).join(", ")}`);
    for (const a of atributos) {
      const atual = antes.attributes.find((x: any) => x.id === a.id)?.value_name ?? "—";
      console.log(`   ${a.id}: ${atual} → ${a.value_name}`);
    }
    if (descricao) console.log(`   descrição → ${descricao.length} caracteres`);

    if (!confirmou) continue;

    const corpo: any = {};
    if (saleTerms) corpo.sale_terms = saleTerms;
    if (atributos.length) corpo.attributes = atributos;
    if (Object.keys(corpo).length) {
      await ml(`/items/${id}`, {
        method: "PUT", confirmadoPeloHumano: true,
        headers: { "content-type": "application/json" }, body: JSON.stringify(corpo),
      } as any);
    }
    if (descricao) {
      await ml(`/items/${id}/description`, {
        method: "PUT", confirmadoPeloHumano: true,
        headers: { "content-type": "application/json" }, body: JSON.stringify({ plain_text: descricao }),
      } as any);
    }

    const depois: any = await ml(`/items/${id}`);
    const r1 = resumo(depois);
    const novos = atributos.filter((a) => !antes.attributes.some((x: any) => x.id === a.id)).length;
    const problemas = [
      r1.titulo !== r0.titulo && "o título mudou",
      r1.status !== r0.status && `o status mudou (${r0.status} → ${r1.status})`,
      r1.preco !== r0.preco && "o preço mudou",
      r1.atributos !== r0.atributos + novos && `atributos ${r0.atributos} → ${r1.atributos} (esperado ${r0.atributos + novos})`,
      ...atributos.filter((a) => !depois.attributes.some((x: any) => x.id === a.id)).map((a) => `${a.id} não ficou gravado`),
      saleTerms && r1.garantia !== saleTerms.map((s) => s.value_name).join(", ") && `garantia ficou "${r1.garantia}"`,
    ].filter(Boolean);
    if (problemas.length) { falhas++; console.log(`   ✗ CONFERIR NO PAINEL: ${problemas.join("; ")}`); }
    else console.log(`   ✓ gravado · ${r1.atributos} atributos · garantia ${r1.garantia} · título, status e preço intactos`);
  }
  if (!confirmou) console.log("\n(nada foi gravado — confira acima e rode de novo com --confirmo)\n");
  else console.log(falhas ? `\n${falhas} anúncio(s) com problema — veja acima.\n` : "\n✓ Tudo gravado e conferido.\n");
  process.exitCode = falhas ? 1 : 0;
} catch (e) { morrer(e as Error); }
