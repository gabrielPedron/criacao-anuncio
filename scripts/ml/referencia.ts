// Anúncios de referência que o operador já validou como sendo o MESMO produto.
// Vale mais que a minha descoberta automática: ele sabe o que é o mesmo produto,
// eu só sei o que tem nome parecido.
//
//   npm run ml:referencia -- "https://..." "https://..." --salvar produtos/x/raw/ref.json
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ml, morrer, opc } from "./api.js";
import { args, brl } from "../cli.ts";

const destino = args.indexOf("--salvar") > -1 ? args[args.indexOf("--salvar") + 1] : null;
const urls = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!urls.length) morrer(new Error('Uso: npm run ml:referencia -- "url1" "url2" [--salvar arquivo.json]'));


/** Da URL tira o id de catálogo (/p/MLB...) e/ou o id do anúncio (MLB-...). */
function idsDaUrl(u: string) {
  const catalogo = (u.match(/\/p\/(MLB\d+)/i) || [])[1] ?? null;
  const item = (u.match(/MLB-?(\d{9,})/) || [])[1];
  const pdpFiltro = (u.match(/item_id[:=](MLB\d+)/i) || [])[1] ?? null;
  return { catalogo, item: pdpFiltro ?? (item ? "MLB" + item : null) };
}

try {
  const refs: any[] = [];
  for (const u of urls) {
    const { catalogo, item } = idsDaUrl(u);
    if (!catalogo && !item) { console.log(`✗ não reconheci id em ${u.slice(0, 60)}`); continue; }

    const ref: any = { url: u, catalog_product_id: catalogo, item_id: item };

    if (catalogo) {
      const p = await opc(`/products/${catalogo}`);
      const itens = await opc(`/products/${catalogo}/items?limit=20`);
      if (p) {
        ref.nome = p.name;
        ref.atributos = (p.attributes ?? []).filter((a: any) => a.value_name).map((a: any) => ({ id: a.id, nome: a.name, valor: a.value_name }));
        ref.fotos = (p.pictures ?? []).map((x: any) => x.url ?? x.secure_url);
      }
      const precos = (itens?.results ?? []).map((i: any) => i.price).filter((n: any) => typeof n === "number").sort((a: number, b: number) => a - b);
      ref.vendedores = precos.length;
      ref.menor = precos[0] ?? null;
      ref.mediana = precos.length ? precos[Math.floor(precos.length / 2)] : null;
      ref.itens = (itens?.results ?? []).map((i: any) => i.item_id);
    }

    // Perguntas e visitas funcionam por item mesmo sem /items/$ID (que é 403 p/ terceiro).
    const alvos: string[] = ref.itens?.length ? ref.itens.slice(0, 5) : item ? [item] : [];
    ref.perguntas = [];
    ref.visitas30d = 0;
    for (const it of alvos) {
      const q = await opc(`/questions/search?item=${it}&limit=50&api_version=4`);
      for (const p of q?.questions ?? []) ref.perguntas.push({ item: it, pergunta: p.text, resposta: p.answer?.text ?? null });
      const v = await opc(`/items/${it}/visits/time_window?last=30&unit=day`);
      ref.visitas30d += v?.total_visits ?? 0;
    }
    refs.push(ref);
  }

  console.log(`\n${refs.length} anúncio(s) de referência lidos:\n`);
  for (const r of refs) {
    console.log(`── ${r.nome ?? r.item_id ?? "(sem nome)"}`);
    console.log(`   ${r.catalog_product_id ? "catálogo " + r.catalog_product_id : "anúncio tradicional " + r.item_id}`);
    if (r.vendedores) console.log(`   ${r.vendedores} vendedor(es) · ${brl(r.menor)} a ${brl(r.mediana)}`);
    console.log(`   ${r.visitas30d.toLocaleString("pt-BR")} visitas/30d · ${r.perguntas.length} perguntas · ${(r.atributos ?? []).length} atributos na ficha`);
    console.log("");
  }

  const todasPerguntas = refs.flatMap((r) => r.perguntas);
  if (todasPerguntas.length) {
    console.log(`Perguntas somadas: ${todasPerguntas.length}. Amostra:`);
    todasPerguntas.slice(0, 10).forEach((q) => console.log(`   P: ${q.pergunta.replace(/\s+/g, " ").slice(0, 95)}`));
  }

  const atrs = new Map<string, Set<string>>();
  for (const r of refs) for (const a of r.atributos ?? []) {
    if (!atrs.has(a.nome)) atrs.set(a.nome, new Set());
    atrs.get(a.nome)!.add(a.valor);
  }
  if (atrs.size) {
    console.log(`\nFicha que os concorrentes preenchem (${atrs.size} atributos) — o que faltar na nossa é lacuna:`);
    [...atrs].slice(0, 25).forEach(([nome, vals]) => console.log(`   ${nome}: ${[...vals].join(" | ").slice(0, 70)}`));
  }

  if (destino) {
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify({ refs }, null, 2));
    console.log(`\n✓ Salvo em ${destino}`);
  }
  console.log("");
} catch (e) { morrer(e as Error); }
