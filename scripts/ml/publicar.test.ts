// Checks do caminho que gasta dinheiro: o que decide o anúncio que vai ao ar.
// Não chama a API — só monta e valida em memória.
//   node --test scripts/ml/publicar.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { carregarOferta, montarPayload } from "./publicar.ts";

const COMPLETA = {
  titulo: "Produto De Teste 1kg Para Uso Generico Em Superficie",
  category_id: "MLB419508",
  preco: 44.9,
  quantidade: 10,
  descricao: "Descricao de teste, texto corrido, sem bullet e sem emoji, com tamanho suficiente.",
  tipo_anuncio: "gold_special",
  atributos: [
    { id: "BRAND", value_name: "Marca De Teste" },
    { id: "SELLER_PACKAGE_HEIGHT", value_name: "30 cm" },
    { id: "SELLER_PACKAGE_WIDTH", value_name: "20 cm" },
    { id: "SELLER_PACKAGE_LENGTH", value_name: "20 cm" },
    { id: "SELLER_PACKAGE_WEIGHT", value_name: "4800 g" },
  ],
};

/** Escreve um oferta.json temporário e devolve o caminho do arquivo. */
function arquivoCom(campos: Record<string, unknown>) {
  const arq = join(mkdtempSync(join(tmpdir(), "oferta-")), "oferta.json");
  writeFileSync(arq, JSON.stringify(campos));
  return arq;
}

test("carregarOferta aceita uma oferta completa", () => {
  const o = carregarOferta(arquivoCom(COMPLETA));
  assert.equal(o.preco, 44.9);
});

test("carregarOferta recusa e diz QUAL campo falta", () => {
  for (const campo of ["titulo", "category_id", "preco", "quantidade", "descricao"]) {
    const incompleta: Record<string, unknown> = { ...COMPLETA };
    delete incompleta[campo];
    assert.throws(
      () => carregarOferta(arquivoCom(incompleta)),
      (e: Error) => e.message.includes("falta") && e.message.includes(campo),
      `deveria recusar oferta sem "${campo}"`,
    );
  }
});

test("carregarOferta recusa preço zero, negativo e estoque zero", () => {
  for (const ruim of [{ preco: 0 }, { preco: -1 }, { quantidade: 0 }]) {
    assert.throws(() => carregarOferta(arquivoCom({ ...COMPLETA, ...ruim })));
  }
});

test("carregarOferta explica o que fazer quando o arquivo não existe", () => {
  assert.throws(
    () => carregarOferta(join(tmpdir(), "pasta-que-nao-existe-" + Date.now())),
    /Falta .*oferta\.json|Falta .*[\\/]/,
  );
});

// A regra do fluxo User Products: mandar `title` junto com `family_name` faz o ML RECUSAR o item.
// Se alguém reintroduzir o campo, o anúncio para de subir — e o erro só aparece na publicação.
test("montarPayload NUNCA manda title (o ML recusa junto com family_name)", () => {
  const p = montarPayload(carregarOferta(arquivoCom(COMPLETA)));
  assert.equal("title" in p, false);
  assert.equal(p.family_name, COMPLETA.titulo);
});

test("montarPayload respeita family_name explícito em vez do título", () => {
  const p = montarPayload(carregarOferta(arquivoCom({ ...COMPLETA, family_name: "Familia Escolhida" })));
  assert.equal(p.family_name, "Familia Escolhida");
});

// Cortar em silêncio era o comportamento antigo. É perigoso porque o título é IRREVERSÍVEL
// depois de publicado, e o ML ainda acrescenta COLOR + FINISH no fim (docs/16).
test("montarPayload RECUSA family_name acima de 60 em vez de cortar", () => {
  const oferta = carregarOferta(arquivoCom({ ...COMPLETA, titulo: "T".repeat(90) }));
  assert.throws(
    () => montarPayload(oferta),
    (e: Error) => e.message.includes("90") && /IRREVERS/i.test(e.message),
    "deveria recusar, não truncar — o título não muda depois de publicado",
  );
});

test("montarPayload aceita family_name de exatamente 60", () => {
  const p = montarPayload(carregarOferta(arquivoCom({ ...COMPLETA, titulo: "T".repeat(60) })));
  assert.equal(p.family_name.length, 60);
});

test("montarPayload separa foto já no ML (id) de foto por URL (source)", () => {
  const p = montarPayload(carregarOferta(arquivoCom({
    ...COMPLETA,
    fotos: ["635157-MLB115801234932_092026", "https://http2.mlstatic.com/foto.jpg"],
  })));
  assert.deepEqual(p.pictures, [
    { id: "635157-MLB115801234932_092026" },
    { source: "https://http2.mlstatic.com/foto.jpg" },
  ]);
});

test("montarPayload NÃO inventa o tipo de anúncio — usa o que a oferta declarou", () => {
  const classico = montarPayload(carregarOferta(arquivoCom(COMPLETA)));
  assert.equal(classico.listing_type_id, "gold_special");
  const premium = montarPayload(carregarOferta(arquivoCom({ ...COMPLETA, tipo_anuncio: "gold_pro" })));
  assert.equal(premium.listing_type_id, "gold_pro");
});

test("montarPayload usa os padrões do projeto: novo, BRL, compra imediata", () => {
  const p = montarPayload(carregarOferta(arquivoCom(COMPLETA)));
  assert.equal(p.condition, "new");
  assert.equal(p.currency_id, "BRL");
  assert.equal(p.buying_mode, "buy_it_now");
  assert.equal("video_id" in p, false);              // só entra quando existe
});

// CLAUDE.md: "clássico ou premium ... dimensões e peso bruto. Nada disso se adivinha."
// Antes o código assumia gold_special calado e nunca olhava as dimensões.
test("carregarOferta exige o tipo de anúncio em vez de assumir clássico", () => {
  const semTipo: Record<string, unknown> = { ...COMPLETA };
  delete semTipo.tipo_anuncio;
  assert.throws(
    () => carregarOferta(arquivoCom(semTipo)),
    (e: Error) => e.message.includes("tipo_anuncio") && e.message.includes("gold_pro"),
  );
  assert.throws(() => carregarOferta(arquivoCom({ ...COMPLETA, tipo_anuncio: "gold_premium" })));
});

test("carregarOferta exige dimensões e peso, e diz quais faltam", () => {
  const semPeso = {
    ...COMPLETA,
    atributos: COMPLETA.atributos.filter((a) => a.id !== "SELLER_PACKAGE_WEIGHT"),
  };
  assert.throws(
    () => carregarOferta(arquivoCom(semPeso)),
    (e: Error) => e.message.includes("SELLER_PACKAGE_WEIGHT") && !e.message.includes("SELLER_PACKAGE_HEIGHT"),
    "deve citar só o que falta, não a lista inteira",
  );
});

test("montarPayload leva preço e estoque como vieram — nada é recalculado", () => {
  const p = montarPayload(carregarOferta(arquivoCom({ ...COMPLETA, preco: 44.9, quantidade: 7 })));
  assert.equal(p.price, 44.9);
  assert.equal(p.available_quantity, 7);
});
