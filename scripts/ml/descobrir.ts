// Descoberta de concorrentes que REALMENTE vendem.
//
// A busca de anúncios do ML é 403 na API (com e sem token). O caminho aberto é varrer o
// catálogo e filtrar pelos que têm vendedor ativo. O ranking era por VISITAS; desde out/2026
// a visita de concorrente dá 403, e aí ele cai para mais vendidos + total de perguntas.
//
//   npm run ml:descobrir -- MLB<categoria> "<termo generico>" "<termo especifico>"
//   ... --paginas 4 --min-visitas 500 --salvar produtos/x/raw/descoberta.json
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ml, morrer, opc, visitas30d, AVISO_VISITAS } from "./api.js";
import { lerEnv } from "./auth.js";
import { args, brl, pega } from "../cli.ts";

const paginas = Number(pega("--paginas", "3"));
const minVisitas = Number(pega("--min-visitas", "0"));
const destino = args.indexOf("--salvar") > -1 ? args[args.indexOf("--salvar") + 1] : null;

const livres = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const categoria = livres.find((a) => /^ML[A-Z]\d+$/i.test(a));
const termos = livres.filter((a) => a !== categoria);
if (!categoria) morrer(new Error('Uso: npm run ml:descobrir -- MLB277663 "termo1" "termo2" [--paginas 3] [--min-visitas 500]'));
if (!termos.length) morrer(new Error("Informe pelo menos um termo genérico de busca."));


// Roda `fn` sobre os itens em lotes, preservando a ordem. Os passos 3, 4 e 5 fazem centenas de
// chamadas independentes; em serie isso levava ~5 min, quase tudo esperando resposta.
// Lote de 8 e conservador de proposito: o ml() ja trata 429 com backoff, mas nao ha motivo
// para provocar. Medido: 5 chamadas em serie = 1208 ms, as mesmas 5 em paralelo = 252 ms.
const LOTE = 8;
async function emLotes<T, R>(itens: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = [];
  for (let i = 0; i < itens.length; i += LOTE) {
    saida.push(...(await Promise.all(itens.slice(i, i + LOTE).map(fn))));
  }
  return saida;
}

try {
  const site = lerEnv().ML_SITE;
  const candidatos = new Map<string, string>();   // id -> nome
  const maisVendidos = new Map<string, number>(); // id -> posição nos mais vendidos da categoria

  // 1. mais vendidos da categoria
  const hl = await opc(`/highlights/${site}/category/${categoria}`);
  for (const c of hl?.content ?? []) {
    if (c.type !== "PRODUCT") continue;
    candidatos.set(c.id, "");
    maisVendidos.set(c.id, c.position);
  }
  console.log(`\n[1] highlights: ${candidatos.size} produtos`);

  // 2. varredura do catálogo por termo, paginada
  for (const t of termos) {
    for (let off = 0; off < paginas * 50; off += 50) {
      const r = await opc(`/products/search?site_id=${site}&category_id=${categoria}&q=${encodeURIComponent(t)}&limit=50&offset=${off}`);
      for (const p of r?.results ?? []) candidatos.set(p.id, p.name);
      if (!r?.results?.length) break;
    }
    console.log(`[2] após "${t}": ${candidatos.size} candidatos`);
  }

  // 3. expande a família de tamanhos (parent -> children) — é assim que outras embalagens aparecem
  const sementes = [...candidatos.keys()].slice(0, 40);
  const familias = await emLotes(sementes, async (id) => {
    const p = await opc(`/products/${id}`);
    if (!p?.parent_id) return [];
    const pai = await opc(`/products/${p.parent_id}`);
    return (pai?.children_ids ?? []) as string[];
  });
  for (const filhos of familias) for (const c of filhos) candidatos.set(c, "");
  console.log(`[3] após expandir famílias: ${candidatos.size} candidatos`);

  // 4. mantém só quem tem vendedor ativo
  console.log(`\nFiltrando quem tem vendedor ativo (${candidatos.size} candidatos, em lotes de ${LOTE})…`);
  const avaliados = await emLotes([...candidatos], async ([id, nome]) => {
    const it = await opc(`/products/${id}/items?limit=20`);
    const itens = it?.results ?? [];
    if (!itens.length) return null;
    const precos = itens.map((i: any) => i.price).filter((n: any) => typeof n === "number").sort((a: number, b: number) => a - b);
    return {
      id, nome, vendedores: itens.length,
      menor: precos[0] ?? null,
      mediana: precos.length ? precos[Math.floor(precos.length / 2)] : null,
      itens: itens.map((i: any) => i.item_id),
    };
  });
  const vivos: any[] = avaliados.filter((v) => v !== null);
  console.log(`→ ${vivos.length} de ${candidatos.size} têm vendedor ativo.`);

  // 5. ranking. Visitas de 30 dias eram o proxy de venda, mas desde out/2026 o ML dá 403 para
  // anúncio de outro vendedor. Testa em até 3 produtos antes de gastar centenas de chamadas: se
  // bloqueou, ranqueia pelos mais vendidos da categoria (ranking de venda do próprio ML) e, fora
  // deles, pelo total de perguntas — proxy mais fraco: é o acumulado da vida do anúncio, não 30 dias.
  for (const v of vivos) v.mais_vendidos = maisVendidos.get(v.id) ?? null;
  const amostra = await Promise.all(vivos.slice(0, 3).map((v) => visitas30d(v.itens[0])));
  const porVisitas = !amostra.some((x) => x?.bloqueado);
  let criterio: string;
  if (porVisitas) {
    criterio = "visitas de 30 dias";
    console.log(`Medindo visitas de 30 dias…`);
    await emLotes(vivos, async (v) => {
      const visitas = await Promise.all(v.itens.slice(0, 5).map((item: string) => visitas30d(item)));
      v.visitas30d = visitas.reduce((t: number, x: any) => t + (x?.total ?? 0), 0);
      v.visitas_bloqueadas = visitas.filter((x: any) => x?.bloqueado).length;
    });
  } else {
    criterio = "mais vendidos da categoria, depois total de perguntas";
    console.log(`⚠ ${AVISO_VISITAS}`);
    console.log(`Ranqueando por ${criterio}…`);
    if (minVisitas) console.log(`  --min-visitas ${minVisitas} ignorado: sem visitas de concorrente não há como filtrar.`);
    await emLotes(vivos, async (v) => {
      const qs = await Promise.all(v.itens.slice(0, 5).map((item: string) => opc(`/questions/search?item=${item}&limit=1&api_version=4`)));
      v.visitas30d = null;
      v.perguntas = qs.reduce((t: number, q: any) => t + (q?.total ?? 0), 0);
    });
  }
  await emLotes(vivos.filter((v) => !v.nome), async (v) => { v.nome = (await opc(`/products/${v.id}`))?.name ?? v.id; });

  const pos = (v: any) => v.mais_vendidos ?? Infinity;
  const ranking = porVisitas
    ? vivos.filter((v) => v.visitas30d >= minVisitas).sort((a, b) => b.visitas30d - a.visitas30d)
    : [...vivos].sort((a, b) => pos(a) - pos(b) || b.perguntas - a.perguntas);
  const coluna = porVisitas ? "Visitas/30d" : "Perguntas";
  const valor = (v: any) => (porVisitas ? v.visitas30d : v.perguntas).toLocaleString("pt-BR");

  console.log(`\n${ranking.length} concorrentes com vendedor ativo${porVisitas && minVisitas ? ` e ≥${minVisitas} visitas` : ""} — ordem: ${criterio}:\n`);
  console.log(`| # | Produto | Vend. | Menor | Mediana | Mais vendidos | ${coluna} | ID |`);
  console.log("|---|---|---|---|---|---|---|---|");
  ranking.slice(0, 20).forEach((v, n) =>
    console.log(`| ${n + 1} | ${String(v.nome).slice(0, 48).replace(/\|/g, "/")} | ${v.vendedores} | ${brl(v.menor)} | ${brl(v.mediana)} | ${v.mais_vendidos ? `#${v.mais_vendidos}` : "—"} | ${valor(v)} | \`${v.id}\` |`));

  console.log("\n→ Aprofundar: npm run ml:produto -- <id>   (ficha, vendedores e perguntas)");
  console.log(porVisitas
    ? "⚠ Visitas é tráfego, não venda. O ML não expõe quantidade vendida para terceiros."
    : "⚠ Perguntas é proxy fraco de demanda (acumulado, favorece anúncio antigo). Vendidos de verdade só pela página (ml:pagina).");

  // Esta lista só enxerga quem passou por catálogo. Quem nunca entrou é invisível para a API
  // (testado e reprovado: /users/$ID/items/search de terceiro, _CategoryId_ na lista, busca por
  // termo). Sem este aviso, a lista parece completa e não é.
  console.log("\n⚠ ESTA LISTA NÃO É COMPLETA — e o buraco é sempre o mesmo:");
  console.log("  Só aparece aqui quem JÁ entrou em algum produto de catálogo. Concorrente que só");
  console.log("  vende anúncio tradicional é invisível para a API — não há caminho, foi testado.");
  console.log("  O que fazer: se você conhece vendedor forte que não apareceu, cole a URL dele:");
  console.log(`    npm run ml:referencia -- "url1" "url2"`);
  console.log("  É a Fase 0 (docs/02) — justamente o que a automação não alcança sozinha.");

  if (destino) {
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify({ categoria, termos, criterio, ranking }, null, 2));
    console.log(`\n✓ Salvo em ${destino}`);
  }
  console.log("");
} catch (e) { morrer(e as Error); }
