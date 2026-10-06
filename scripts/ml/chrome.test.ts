// Funções puras do leitor de páginas. Não abre Chrome.
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugDaBusca, idsDoLink, limparAvaliacao } from "./chrome.ts";

test("slugDaBusca tira acento, caixa e pontuação", () => {
  assert.equal(slugDaBusca("Tinta Acrílica p/ Piso"), "tinta-acrilica-p-piso");
  assert.equal(slugDaBusca("  tinta  jateada  "), "tinta-jateada");
  assert.equal(slugDaBusca("Efeito 260g!"), "efeito-260g");
});

// Ids fictícios de propósito: este arquivo vai para o repo público e não pode apontar anúncio real.
test("idsDoLink separa anúncio de catálogo", () => {
  assert.deepEqual(idsDoLink("https://produto.mercadolivre.com.br/MLB-1111111111-produto-_JM"),
    { item: "MLB1111111111", catalogo: null });
  assert.deepEqual(idsDoLink("https://www.mercadolivre.com.br/x/p/MLB22222222#position=1"),
    { item: null, catalogo: "MLB22222222" });
  assert.deepEqual(idsDoLink("https://www.mercadolivre.com.br/x/p/MLB22222222#wid=MLB3333333333&sid=search"),
    { item: "MLB3333333333", catalogo: "MLB22222222" });
  // /up/MLBU... é página de User Product: o id do anúncio só vem no wid.
  assert.deepEqual(idsDoLink("https://www.mercadolivre.com.br/x/up/MLBU4444444444"),
    { item: null, catalogo: null });
});

// Já quebrou uma vez: "dia|dias" na ordem errada deixava um "s" solto no começo do texto.
test("limparAvaliacao tira nota, data e rodapé sem deixar sobra", () => {
  assert.deepEqual(
    limparAvaliacao("Avaliação 5 de 5 Há 5 dias Não usei ainda, mas chegou inteiro e bem embalado. Útil 0 Mais opções"),
    { nota: 5, util: 0, texto: "Não usei ainda, mas chegou inteiro e bem embalado." },
  );
  assert.deepEqual(
    limparAvaliacao("Avaliação 4 de 5 Brasil Há mais de 1 ano Cumpriu o prometido, ideal com pistola. Saiba mais Útil 14 Mais opções"),
    { nota: 4, util: 14, texto: "Cumpriu o prometido, ideal com pistola." },
  );
  assert.equal(limparAvaliacao("Avaliação 5 de 5 Há 3 meses Ok. Útil 1"), null);   // curta demais
  assert.equal(limparAvaliacao("Texto qualquer"), null);
});
