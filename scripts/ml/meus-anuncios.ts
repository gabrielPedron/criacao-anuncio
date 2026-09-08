// Varre TODOS os anúncios da própria conta e junta ficha + descrição + perguntas.
// Saída: produtos/_catalogo/raw/anuncios.json (bruto) e catalogo.json (enxuto, agrupado por SKU).
//   npm run ml:meus-anuncios
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ml, morrer } from "./api.js";
import { RAIZ, lerTokens } from "./auth.js";

const DESTINO = resolve(RAIZ, "produtos/_catalogo/raw");

/** Percorre um endpoint paginado até acabar. */
async function paginar<T>(url: (offset: number) => string, extrai: (r: any) => T[], limite = 50): Promise<T[]> {
  const tudo: T[] = [];
  for (let offset = 0; ; offset += limite) {
    const r = await ml(url(offset));
    const lote = extrai(r);
    tudo.push(...lote);
    const total = r.paging?.total ?? r.total ?? 0;
    if (lote.length === 0 || tudo.length >= total || offset > 2000) break;
  }
  return tudo;
}

const idsDeAnuncios = (userId: string) =>
  paginar<string>(
    (o) => `/users/${userId}/items/search?limit=50&offset=${o}`,
    (r) => r.results ?? [],
  );

const perguntasDoItem = (itemId: string) =>
  paginar<any>(
    (o) => `/questions/search?item=${itemId}&limit=50&offset=${o}&sort_fields=date_created&sort_types=ASC`,
    (r) => r.questions ?? [],
  );

const perguntasRecebidas = () =>
  paginar<any>((o) => `/my/received_questions/search?limit=50&offset=${o}`, (r) => r.questions ?? []);

async function descricao(itemId: string) {
  try {
    const d = await ml(`/items/${itemId}/description`);
    return d.plain_text || d.text || "";
  } catch (e: any) {
    return e.status === 404 ? "" : `[erro ao ler descrição: ${e.message.slice(0, 120)}]`;
  }
}

/** Atributo pelo id, já que a ordem de attributes[] não é estável. */
const attr = (item: any, id: string) => (item.attributes ?? []).find((a: any) => a.id === id)?.value_name ?? null;

try {
  const userId = String(lerTokens()?.user_id ?? morrer(new Error("Sem .tokens.json — rode npm run ml:teste.")));
  mkdirSync(DESTINO, { recursive: true });

  process.stderr.write("Listando anúncios da conta… ");
  const ids = await idsDeAnuncios(userId);
  console.error(`${ids.length} anúncios.`);

  const anuncios: any[] = [];
  for (const [i, id] of ids.entries()) {
    process.stderr.write(`\r  lendo ${i + 1}/${ids.length} (${id})…      `);
    const item = await ml(`/items/${id}`);
    item._descricao = await descricao(id);
    item._perguntas = await perguntasDoItem(id);
    anuncios.push(item);
  }
  console.error("\r  ✓ fichas, descrições e perguntas lidas.        ");

  // Perguntas de anúncios que já saíram do ar não aparecem na varredura acima.
  process.stderr.write("Conferindo perguntas recebidas na conta… ");
  const recebidas = await perguntasRecebidas();
  const conhecidos = new Set(ids);
  const orfas = recebidas.filter((q: any) => !conhecidos.has(q.item_id));
  console.error(`${recebidas.length} no total, ${orfas.length} de anúncios fora da lista.`);

  writeFileSync(resolve(DESTINO, "anuncios.json"), JSON.stringify({ lido_em: new Date().toISOString(), anuncios, perguntas_orfas: orfas }, null, 2));

  // Versão enxuta: o que interessa pra documentar o produto.
  const catalogo = anuncios.map((it) => ({
    id: it.id,
    sku: attr(it, "SELLER_SKU") ?? it.seller_custom_field,
    titulo: it.title,
    status: it.status,
    sub_status: it.sub_status,
    preco: it.price,
    vendidos: it.sold_quantity,
    estoque: it.available_quantity,
    categoria: it.category_id,
    dominio: it.domain_id,
    gtin: attr(it, "GTIN"),
    marca: attr(it, "BRAND"),
    peso: attr(it, "WEIGHT") ?? attr(it, "NET_WEIGHT") ?? attr(it, "VOLUME") ?? attr(it, "UNIT_VOLUME"),
    rendimento: attr(it, "YIELD_OF_SALES_UNIT") ?? attr(it, "YIELD"),
    cor: attr(it, "COLOR"),
    garantia: it.warranty,
    permalink: it.permalink,
    atributos: Object.fromEntries((it.attributes ?? []).filter((a: any) => a.value_name).map((a: any) => [a.name, a.value_name])),
    descricao: it._descricao,
    perguntas: it._perguntas.map((q: any) => ({ data: q.date_created?.slice(0, 10), pergunta: q.text, resposta: q.answer?.text ?? null })),
  }));

  writeFileSync(resolve(DESTINO, "catalogo.json"), JSON.stringify(catalogo, null, 2));

  const totalPerguntas = catalogo.reduce((s, c) => s + c.perguntas.length, 0);
  console.error(`\n✓ ${catalogo.length} anúncios, ${totalPerguntas} perguntas → produtos/_catalogo/raw/\n`);
} catch (e) {
  morrer(e as Error);
}
