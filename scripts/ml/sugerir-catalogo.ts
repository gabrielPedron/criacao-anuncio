// Sugere um produto novo ao catálogo do ML.
// É SUGESTÃO: entra como UNDER_REVIEW e o ML cura antes de virar produto de catálogo.
//
//   npm run ml:sugerir-catalogo -- MLB7566538598              → monta e mostra o corpo
//   npm run ml:sugerir-catalogo -- MLB7566538598 --confirmo   → envia
//   npm run ml:sugerir-catalogo -- --status MLB7575844910     → consulta uma sugestão
//
// CONTRATO (descoberto por tentativa em 31/08/2026, não estava documentado para nós):
//   • body: { domain_id, item_id, title, attributes[], pictures[] }
//   • attributes usa o formato NOVO: { id, values: [{ id, name }] }
//     — com `value_name` o ML responde "attributes.null_values" e não lê nada
//   • title precisa de várias características, senão dá TitleMinimumLength
//   • obrigatórios do domínio de impermeabilizantes: BRAND, PAINT_TYPE, BASE_TYPE
//   • pictures são obrigatórias
import { ml, morrer } from "./api.js";
import { args, pega } from "../cli.ts";

const confirmou = args.includes("--confirmo");
const statusDe = pega("--status");
const itemId = args.find((a, i) => /^MLB\d+$/.test(a) && !args[i - 1]?.startsWith("--"));

const ATRIBUTOS = ["BRAND", "PAINT_TYPE", "BASE_TYPE", "GTIN", "COLOR", "MAIN_COLOR", "NET_WEIGHT",
  "NET_VOLUME", "FINISH", "YIELD_OF_SALES_UNIT", "APT_SURFACES", "AMBIENTS", "IS_ELASTIC", "LINE", "MODEL"];

try {
  if (statusDe) {
    const s = await ml(`/catalog_suggestions/${statusDe}`);
    console.log(`\nSugestão ${statusDe}`);
    console.log(`  status: ${s.status}${s.status_last_updated ? " (desde " + new Date(s.status_last_updated).toLocaleString("pt-BR") + ")" : ""}`);
    console.log(`  título: ${s.title}`);
    console.log(`  produto de catálogo: ${s.catalog_product_id ?? "(ainda não gerado)"}`);
    if (s.rejected_reasons?.length) console.log(`  ⚠ recusas: ${JSON.stringify(s.rejected_reasons)}`);
    console.log("");
  } else {

  if (!itemId) morrer(new Error("Uso: npm run ml:sugerir-catalogo -- MLB<id do anúncio> [--confirmo]\n   ou: -- --status MLB<id da sugestão>"));

  const item = await ml(`/items/${itemId}`);
  const dom = item.domain_id ?? (await ml(`/categories/${item.category_id}`)).attributable_domain_id;
  if (!dom) morrer(new Error("Não achei o domínio do item."));

  const attributes = ATRIBUTOS.map((id) => {
    const a = (item.attributes ?? []).find((x: any) => x.id === id);
    if (!a?.value_name) return null;
    // formato novo: values[]. Com value_name o ML ignora e acusa null_values.
    return a.value_id ? { id, values: [{ id: a.value_id, name: a.value_name }] } : { id, values: [{ name: a.value_name }] };
  }).filter(Boolean);

  const pictures = (item.pictures ?? []).map((p: any) => ({ id: p.id }));
  const corpo = { domain_id: dom, item_id: itemId, title: item.title, attributes, pictures };

  console.log(`\nAnúncio: ${item.title}`);
  console.log(`Domínio: ${dom}`);
  console.log(`Atributos: ${attributes.length} · Fotos: ${pictures.length}`);
  const faltando = ["BRAND", "PAINT_TYPE", "BASE_TYPE"].filter((id) => !attributes.some((a: any) => a.id === id));
  if (faltando.length) console.log(`⚠ Obrigatórios ausentes no anúncio: ${faltando.join(", ")}`);

  if (!confirmou) {
    console.log(`\n${JSON.stringify(corpo, null, 2).slice(0, 900)}\n…`);
    console.log("\n(nada foi enviado — use --confirmo)");
    console.log("Lembrete: é SUGESTÃO. Entra como UNDER_REVIEW e o ML cura antes de aprovar.\n");
  } else {
    const r = await ml("/catalog_suggestions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo), confirmadoPeloHumano: true,
    } as any);
    console.log(`\n✓ Sugestão enviada: ${r.id} · status ${r.status}`);
    console.log(`  Acompanhe com: npm run ml:sugerir-catalogo -- --status ${r.id}\n`);
  }
  }
} catch (e) { morrer(e as Error); }
