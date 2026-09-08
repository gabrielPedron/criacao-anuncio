// Recria um anúncio existente MUDANDO SÓ O TÍTULO.
//
// Existe porque o título é irreversível no fluxo User Products: publicado com family_name,
// o ML não deixa editar o título nem pelo item, nem pela família (docs/16). O único caminho
// por API é publicar um anúncio novo, idêntico, com a família certa.
//
//   npm run ml:recriar -- MLB7566538598 "Novo Título"            → mostra o payload, dry-run
//   npm run ml:recriar -- MLB7566538598 "Novo Título" --publicar --confirmo
//
// O clone é fiel de propósito: preço, estoque, tipo de anúncio, fotos (mesmos ids, sem
// re-upload), atributos, sale_terms e descrição vêm do item vivo. Nada é recalculado.
import { ml, morrer } from "./api.js";
import { validar, publicar, enviarDescricao, avisarSobreDescricao } from "./publicar.ts";

// Atributos que o ML calcula sozinho — mandar de volta gera "ignored because it is not modifiable".
const NAO_COPIAR = new Set([
  "ITEM_CONDITION", "SYI_PYMES_ID", "PACKAGE_DATA_SOURCE", "PRODUCT_FEATURES",
  "PACKAGE_HEIGHT", "PACKAGE_WIDTH", "PACKAGE_LENGTH", "PACKAGE_WEIGHT",
]);

const args = process.argv.slice(2);
const livres = args.filter((a) => !a.startsWith("--"));
const [origem, novoTitulo] = livres;
const querPublicar = args.includes("--publicar");
const confirmou = args.includes("--confirmo");

if (!origem || !novoTitulo) {
  morrer(new Error('Uso: npm run ml:recriar -- MLB1234 "Novo Título" [--publicar --confirmo]'));
}

try {
  const it: any = await ml(`/items/${origem}`);
  let descricao = "";
  try {
    const d: any = await ml(`/items/${origem}/description`);
    descricao = d.plain_text || d.text || "";
  } catch { /* item sem descrição */ }
  if (descricao) avisarSobreDescricao(descricao);   // copia de anuncio antigo pode carregar vicio

  const payload: any = {
    family_name: novoTitulo,           // no User Products é ela que vira o título
    category_id: it.category_id,
    price: it.price,
    currency_id: it.currency_id,
    available_quantity: it.available_quantity,
    buying_mode: it.buying_mode,
    condition: it.condition,
    listing_type_id: it.listing_type_id,
    pictures: (it.pictures ?? []).map((p: any) => ({ id: p.id })),   // reaproveita as fotos já no ML
    attributes: (it.attributes ?? [])
      .filter((a: any) => a.value_name && !NAO_COPIAR.has(a.id))
      .map((a: any) => ({ id: a.id, value_name: a.value_name })),
    ...(it.sale_terms?.length
      ? { sale_terms: it.sale_terms.map((s: any) => ({ id: s.id, value_name: s.value_name })) }
      : {}),
  };

  console.log(`\nOrigem : ${origem} — "${it.title}"`);
  console.log(`Família: "${novoTitulo}" (${novoTitulo.length} chars)`);
  console.log(`Cópia  : R$ ${it.price} · ${it.available_quantity} un · ${it.listing_type_id} · ` +
              `${payload.pictures.length} fotos · ${payload.attributes.length} atributos · ${descricao.length} chars de descrição`);
  console.log(`\n⚠ O título final quem monta é o ML (família + atributos). Só dá pra conferir depois de publicado.`);

  const v = await validar(payload);
  console.log(`\nDry-run: ${v.ok ? "✓ o ML aceita" : "✗ o ML recusa"}`);
  v.erros.forEach((e: any) => console.log(`   erro : ${e.message}`));
  v.avisos.forEach((a: any) => console.log(`   aviso: ${a.message}`));
  if (!v.ok) process.exit(1);

  if (!querPublicar) {
    console.log("\n(nada foi criado — some --publicar --confirmo para valer)\n");
    process.exit(0);
  }
  if (!confirmou) morrer(new Error("--publicar exige --confirmo junto."));

  const novo: any = await publicar(payload, true);
  console.log(`\n✓ Criado: ${novo.id}`);
  console.log(`  título que o ML montou: "${novo.title}"`);
  console.log(`  ${novo.permalink}`);
  if (descricao) {
    await enviarDescricao(novo.id, descricao, confirmou);
    console.log("✓ Descrição copiada.");
  }
  console.log(`\n⚠ ${origem} continua ATIVO. Dois anúncios iguais no ar é duplicidade — feche o antigo.`);
} catch (e) { morrer(e as Error); }
