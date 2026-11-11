// Funções puras do leitor de páginas. Não abre Chrome.
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugDaBusca, idsDoLink, limparAvaliacao, pausaEntrePaginas, motivoParaParar, contarPagina, cacheValido, diaLocal, numeroDoEnv } from "./chrome.ts";

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
  // Link de catálogo com o filtro de um vendedor, como o operador costuma colar.
  assert.deepEqual(idsDoLink("https://www.mercadolivre.com.br/x/p/MLB22222222?pdp_filters=item_id:MLB5555555555"),
    { item: "MLB5555555555", catalogo: "MLB22222222" });
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

// ---------- ritmo ----------

test("pausaEntrePaginas: 2,5–5 s no normal, 6–12 s na pausa longa", () => {
  const fila = (...xs: number[]) => () => xs.shift()!;
  assert.equal(pausaEntrePaginas(fila(0.5, 0)), 2500);
  assert.equal(pausaEntrePaginas(fila(0.99, 1)), 5000);
  assert.equal(pausaEntrePaginas(fila(0.1, 0)), 6000);   // sorteio < 1/6 = pausa de leitura
  assert.equal(pausaEntrePaginas(fila(0.1, 1)), 12000);
  for (let i = 0; i < 500; i++) {
    const p = pausaEntrePaginas();
    assert.ok(p >= 2500 && p <= 12000, `pausa fora da faixa: ${p}`);
  }
});

test("motivoParaParar: teto do dia e pausa de 6 h depois de barreira", () => {
  const agora = new Date(2026, 10, 11, 15, 0);   // 11/11/2026 15:00, hora local
  const hoje = diaLocal(agora);
  const limpo = { dia: hoje, paginas: 0, barrado_em: null };
  assert.equal(motivoParaParar(limpo, agora, 80), null);
  assert.match(motivoParaParar({ ...limpo, paginas: 80 }, agora, 80)!, /Limite de 80/);
  assert.equal(motivoParaParar({ ...limpo, dia: "2026-11-10", paginas: 80 }, agora, 80), null);   // dia virou
  const barrou = (h: number) => ({ ...limpo, barrado_em: new Date(agora.getTime() - h * 3_600_000).toISOString() });
  assert.match(motivoParaParar(barrou(1), agora, 80)!, /barrou/);
  assert.match(motivoParaParar(barrou(5.9), agora, 80)!, /--sem-chrome/);
  assert.equal(motivoParaParar(barrou(6.1), agora, 80), null);
});

test("contarPagina soma no mesmo dia e zera na virada", () => {
  const agora = new Date(2026, 10, 11, 23, 59);
  const r = contarPagina({ dia: diaLocal(agora), paginas: 7, barrado_em: null }, agora);
  assert.equal(r.paginas, 8);
  const amanha = new Date(2026, 10, 12, 0, 1);
  assert.deepEqual(contarPagina(r, amanha), { dia: "2026-11-12", paginas: 1, barrado_em: null });
});

test("cacheValido: menos de 12 h vale; mais velho ou do futuro, não", () => {
  const agora = new Date("2026-11-11T15:00:00Z");
  assert.equal(cacheValido("2026-11-11T04:00:00Z", agora), true);    // 11 h
  assert.equal(cacheValido("2026-11-11T02:59:00Z", agora), false);   // 12 h e 1 min
  assert.equal(cacheValido("2026-11-11T16:00:00Z", agora), false);   // relógio voltou: não confia
  assert.equal(cacheValido("lixo", agora), false);
});

test("numeroDoEnv: vazio, texto ou negativo usa o padrão; 0 vale", () => {
  assert.equal(numeroDoEnv(undefined, 80), 80);
  assert.equal(numeroDoEnv("", 80), 80);          // linha do .env.example copiada sem valor
  assert.equal(numeroDoEnv("  ", 80), 80);
  assert.equal(numeroDoEnv("oitenta", 80), 80);   // NaN tiraria o teto
  assert.equal(numeroDoEnv("-5", 80), 80);
  assert.equal(numeroDoEnv(" 40 ", 80), 40);
  assert.equal(numeroDoEnv("0", 80), 0);          // 0 de propósito: Chrome desligado
});
