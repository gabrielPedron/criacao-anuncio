import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, utimesSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planoDaEntrada, categoriasDaEntrada } from "./entrada.ts";
import { donoDoLink, objecoesDoDossie, categoriasDoCatalogo, esquemaDaCategoria, conferirEvidencias, posicaoOrganica, proximaAcao } from "./inteligencia.ts";

const entrada = `## 1. Para começar a pesquisa
- **Categoria** (escolha do operador): MLB123456
- **Concorrentes validados pelo operador** (2 ou mais links):
  - https://www.mercadolivre.com.br/produto/p/MLB1111111
  - https://www.mercadolivre.com.br/MLB-2222222222
- **Semântica:** termo informado pela ferramenta
- **Top-3 semânticas confirmadas:** tinta para piso, tinta piso fosca, tinta 1kg
## 2. Dados técnicos
`;
const raizTemporaria = process.env.HERMES_HOME ? join(process.env.HERMES_HOME, "cache", "scratch") : tmpdir();
function pastaTemporaria() { mkdirSync(raizTemporaria, { recursive: true }); return mkdtempSync(join(raizTemporaria, "inteligencia-")); }

test("coleta respeita termos confirmados e links validados, não infere categoria", () => {
  assert.deepEqual(planoDaEntrada(entrada), {
    categoria: "MLB123456", categorias: ["MLB123456"], termos: ["tinta para piso", "tinta piso fosca", "tinta 1kg"],
    referencias: ["https://www.mercadolivre.com.br/produto/p/MLB1111111", "https://www.mercadolivre.com.br/MLB-2222222222"],
    avisos: [],
  });
  assert.throws(() => planoDaEntrada(entrada.replace("MLB123456", "a mesma do link")), /categoria principal como ID MLB/);
  assert.throws(() => planoDaEntrada(entrada.replace("tinta piso fosca", "[PENDENTE]")), /três termos aprovados/);
  // Sem os 2 links ou sem pesquisa do operador: segue e avisa (CLAUDE.md), não recusa.
  const umLink = planoDaEntrada(entrada.replace("  - https://www.mercadolivre.com.br/MLB-2222222222\n", ""));
  assert.match(umLink.avisos.join(" "), /resultado fica pior/);
  assert.match(planoDaEntrada(entrada.replace("termo informado pela ferramenta", "não tenho")).avisos.join(" "), /sem a pesquisa/);
  assert.throws(() => planoDaEntrada(entrada.replace("produto/p/MLB1111111", "MLB1111111").replace("https://www.mercadolivre", "https://outro-site")), /links HTTPS do Mercado Livre/);
});

test("sondagem roda sem top-3 e sem categoria; a coleta completa recusa sem as top-3", () => {
  const semTop3 = entrada.replace("tinta para piso, tinta piso fosca, tinta 1kg", "[termo 1, termo 2, termo 3]").replace("MLB123456", "tintas");
  assert.deepEqual(planoDaEntrada(semTop3, "sondagem").termos, []);
  assert.throws(() => planoDaEntrada(semTop3), /três termos aprovados.*--sondar/);
});

test("categorias extras exigem escolha explícita, sem duplicar nem misturar schemas", () => {
  const duas = entrada.replace("- **Categoria** (escolha do operador): MLB123456", "- **Categoria** (escolha do operador): MLB123456\n- **Categorias adicionais aprovadas:** MLB234567");
  assert.deepEqual(categoriasDaEntrada(duas), ["MLB123456", "MLB234567"]);
  assert.deepEqual(planoDaEntrada(duas).categorias, ["MLB123456", "MLB234567"]);
  assert.deepEqual(categoriasDoCatalogo(["produto", "--categoria", "MLB123456", "--categoria", "MLB234567"]), ["MLB123456", "MLB234567"]);
  assert.deepEqual(categoriasDoCatalogo(["produto"]), [null]);
  assert.throws(() => categoriasDaEntrada(duas.replace("MLB234567", "MLB123456")), /repetida/);
  assert.throws(() => categoriasDaEntrada(duas.replace("MLB234567", "outra categoria")), /IDs MLB/);
  assert.throws(() => categoriasDoCatalogo(["--categoria", "tintas"]), /ID MLB/);
  const pasta = pastaTemporaria();
  try {
    mkdirSync(join(pasta, "raw"));
    const anterior = join(pasta, "raw", "categoria-MLB123456-antiga.json");
    const outra = join(pasta, "raw", "categoria-MLB234567-recente.json");
    const atual = join(pasta, "raw", "categoria-MLB123456-recente.json");
    writeFileSync(anterior, JSON.stringify({ categoryId: "MLB123456", atributos: [{ id: "A" }] }));
    writeFileSync(outra, JSON.stringify({ categoryId: "MLB234567", atributos: [{ id: "B" }] }));
    writeFileSync(atual, JSON.stringify({ categoryId: "MLB123456", atributos: [{ id: "C" }] }));
    utimesSync(anterior, new Date("2020-01-01"), new Date("2020-01-01"));
    assert.deepEqual(esquemaDaCategoria(pasta, "MLB123456")?.atributos, [{ id: "C" }]);
    assert.deepEqual(esquemaDaCategoria(pasta, "MLB234567")?.atributos, [{ id: "B" }]);
    assert.equal(esquemaDaCategoria(pasta, "MLB345678"), null);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("evidência não aceita arquivo ausente, caminho externo nem promessa só da página de terceiro", () => {
  const pasta = pastaTemporaria();
  try {
    writeFileSync(join(pasta, "entrada.md"), entrada + "\nOperador confirmou: 3 m².\n");
    const e = { id: "rendimento", afirmacao: "Rende 3 m²", origem: { tipo: "operador" as const, arquivo: "entrada.md", trecho: "3 m²" }, estado: "confirmada" as const };
    assert.deepEqual(conferirEvidencias(pasta, [e]), []);
    assert.match(conferirEvidencias(pasta, [e, e]).join(" "), /duplicado/);
    assert.match(conferirEvidencias(pasta, [{ ...e, origem: { ...e.origem, arquivo: "../OPERACAO.md" } }]).join(" "), /fora/);
    assert.match(conferirEvidencias(pasta, [{ ...e, origem: { ...e.origem, tipo: "chrome" } }]).join(" "), /terceiro/);
    assert.match(conferirEvidencias(pasta, [{ ...e, estado: "pendente", resposta_descricao: "Rende 3 m²" }]).join(" "), /sem evidência confirmada/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("posição conta só orgânicos e distingue patrocinado/ausente/sem id", () => {
  const itens = [{ item: "MLB111111111", patrocinado: true }, { item: "MLB222222222", patrocinado: false }, { item: "MLB111111111", patrocinado: false }];
  assert.deepEqual(posicaoOrganica({ itens }, "MLB111111111"), { posicao: 2, estado: "encontrado" });
  assert.equal(posicaoOrganica({ itens: itens.slice(0, 2) }, "MLB111111111").estado, "somente_ad");
  assert.equal(posicaoOrganica({ itens }, "MLB333333333").estado, "fora_primeira_pagina");
  assert.equal(posicaoOrganica({ itens: [{ item: null, patrocinado: false }] }, "MLB333333333").estado, "nao_identificado");
});

test("próxima ação segue os checkpoints do CLAUDE.md e nunca publica por conta própria", () => {
  const pasta = pastaTemporaria();
  const grava = (nome: string, dados: unknown) => writeFileSync(join(pasta, nome), typeof dados === "string" ? dados : JSON.stringify(dados));
  const aprovado = { imagens: { aprovadas_em: "d" }, catalogo: { decidido_em: "d", escolha: "orgânico" }, titulo: { aprovado_em: "d", texto: "Título aprovado" } };
  try {
    assert.match(proximaAcao(pasta), /Preencher entrada/);
    grava("entrada.md", entrada.replace("tinta para piso, tinta piso fosca, tinta 1kg", "[termo 1, termo 2, termo 3]"));
    assert.match(proximaAcao(pasta), /três termos/);
    mkdirSync(join(pasta, "raw"));
    grava("raw/sondagem-teste.md", "sondagem");
    assert.match(proximaAcao(pasta), /Checkpoint 1/);
    grava("entrada.md", entrada);
    assert.match(proximaAcao(pasta), /ml:coletar --executar/);
    grava("dossie.md", "# Dossiê — [PRODUTO]\n");
    assert.match(proximaAcao(pasta), /Concluir o julgamento/);
    grava("dossie.md", "# Dossiê — Tinta\n\n## Fontes desta rodada\nPreencher o julgamento antes da oferta.\n");
    assert.match(proximaAcao(pasta), /Concluir o julgamento/);
    // Sem objeção no dossiê, evidência não é exigida.
    grava("dossie.md", "# Dossiê — Tinta\n## 5. Objeções\n");
    assert.match(proximaAcao(pasta), /Montar uma oferta/);
    grava("raw/resumo-coleta-teste.md", "resumo");
    grava("dossie.md", "# Dossiê — Tinta\n## 5. Objeções\n| Objeção / dor | Frequência | Anúncio |\n|---|---|---|\n| É lavável? | 1 | x |\n");
    assert.match(proximaAcao(pasta), /§5\.1/);
    grava("evidencias.json", "[{ quebrado");
    assert.match(proximaAcao(pasta), /Corrigir evidencias.json: não é JSON válido/);
    grava("evidencias.json", [{ id: "lavagem", afirmacao: "lavável", origem: { tipo: "operador", arquivo: "entrada.md", trecho: "tinta para piso" }, estado: "confirmada", objecao: "5.1" }]);
    grava("oferta.json", { titulo: "Título aprovado" });
    assert.match(proximaAcao(pasta), /Checkpoint 2/);
    grava("decisoes.json", { imagens: { aprovadas_em: "d" } });
    assert.match(proximaAcao(pasta), /Checkpoint 3/);
    grava("decisoes.json", { ...aprovado, titulo: undefined });
    assert.match(proximaAcao(pasta), /título final/);
    grava("decisoes.json", aprovado);
    grava("entrada.md", entrada + "\n| Preço | PENDENTE |\n");
    assert.match(proximaAcao(pasta), /PENDENTE na entrada.md: Preço/);
    grava("entrada.md", entrada);
    assert.match(proximaAcao(pasta), /Checkpoint 4: rodar ml:conferir -- oferta.json/);
    grava("decisoes.json", { ...aprovado, revisao_final: { revisado_em: "d" } });
    assert.match(proximaAcao(pasta), /não publica/);
    // Multicategoria: cada oferta com as próprias decisões, sem travar na primeira mensagem.
    grava("oferta-segunda.json", { titulo: "Outro título" });
    const duas = proximaAcao(pasta).split("\n");
    assert.match(duas.find((l) => l.startsWith("oferta-segunda.json"))!, /Checkpoint 2.*decisoes-segunda.json/);
    assert.match(duas.find((l) => l.startsWith("oferta.json"))!, /não publica/);
    grava("decisoes-segunda.json", "{");
    assert.match(proximaAcao(pasta), /Corrigir decisoes-segunda.json/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("CLIs: coleta em prévia não escreve; posição com busca salva histórico de 5 termos", () => {
  const pasta = pastaTemporaria();
  try {
    writeFileSync(join(pasta, "entrada.md"), entrada);
    const coleta = spawnSync(process.execPath, [join(import.meta.dirname, "coletar.ts"), pasta], { encoding: "utf8" });
    assert.equal(coleta.status, 0, coleta.stderr);
    assert.match(coleta.stdout, /Prévia apenas/);
    assert.equal(existsSync(join(pasta, "raw")), false);
    // Sem top-3 a coleta completa recusa sem ler nada; sem Chrome e sem categoria, nem a sondagem tem fonte.
    writeFileSync(join(pasta, "entrada.md"), entrada.replace("tinta para piso, tinta piso fosca, tinta 1kg", "[termo 1, termo 2, termo 3]").replace("MLB123456", "tintas"));
    const semTop3 = spawnSync(process.execPath, [join(import.meta.dirname, "coletar.ts"), pasta, "--executar"], { encoding: "utf8" });
    assert.notEqual(semTop3.status, 0);
    assert.match(semTop3.stderr, /--sondar/);
    const semFonte = spawnSync(process.execPath, [join(import.meta.dirname, "coletar.ts"), pasta, "--sondar", "tinta", "--sem-chrome"], { encoding: "utf8" });
    assert.notEqual(semFonte.status, 0);
    assert.match(semFonte.stderr, /categoria principal como ID MLB/);
    assert.equal(existsSync(join(pasta, "raw")), false);
    writeFileSync(join(pasta, "entrada.md"), entrada);

    const termos = ["tinta para piso", "tinta piso fosca", "tinta 1kg", "tinta lavável", "tinta clara"];
    const busca = join(pasta, "busca.json");
    writeFileSync(busca, JSON.stringify({ buscas: termos.map((termo) => ({
      termo, url: "https://lista.mercadolivre.com.br/teste", itens: [
        { item: "MLB999999999", patrocinado: true }, { item: "MLB111111111", patrocinado: false },
      ],
    })) }));
    const medicao = spawnSync(process.execPath, [join(import.meta.dirname, "posicao.ts"), pasta, "MLB111111111", ...termos, "--arquivo", busca], { encoding: "utf8" });
    assert.equal(medicao.status, 0, medicao.stderr);
    const csv = readFileSync(join(pasta, "posicao.csv"), "utf8").trim().split("\n");
    assert.equal(csv.length, 6); // cabeçalho + uma medição por termo
    assert.ok(csv.slice(1).every((linha) => linha.includes(",1,encontrado,")));
    const incompleto = spawnSync(process.execPath, [join(import.meta.dirname, "posicao.ts"), pasta, "MLB111111111", ...termos, "termo ausente", "--arquivo", busca], { encoding: "utf8" });
    assert.notEqual(incompleto.status, 0);
    assert.equal(readFileSync(join(pasta, "posicao.csv"), "utf8").trim().split("\n").length, 6);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("conferência de rodada nova exige prova e resposta literal para objeção", () => {
  const pasta = pastaTemporaria();
  try {
    writeFileSync(join(pasta, "entrada.md"), entrada + "\nOperador: pode ser lavado após secagem.\n");
    mkdirSync(join(pasta, "raw"));
    writeFileSync(join(pasta, "raw", "resumo-coleta-teste.md"), "Resumo de teste");
    writeFileSync(join(pasta, "raw", "categoria-MLB123456-teste.json"), JSON.stringify({ categoryId: "MLB123456", atributos: [] }));
    writeFileSync(join(pasta, "dossie.md"), "## 5. Objeções\n| Objeção / dor | Frequência | Anúncio |\n|---|---|---|\n| É lavável? | 1 | teste |\n");
    writeFileSync(join(pasta, "foto.jpg"), "foto de teste");
    writeFileSync(join(pasta, "oferta.json"), JSON.stringify({
      titulo: "Produto de teste", category_id: "MLB123456", preco: 50, quantidade: 1,
      tipo_anuncio: "gold_special", garantia: { tipo: "sem" }, sem_gtin_motivo: "operador declarou ausência",
      descricao: "O operador confirmou: pode ser lavado após secagem.", fotos_locais: [join(pasta, "foto.jpg")],
      atributos: ["HEIGHT", "WIDTH", "LENGTH", "WEIGHT"].map((x) => ({ id: "SELLER_PACKAGE_" + x, value_name: "10 cm" })),
    }));
    const rodar = () => spawnSync(process.execPath, [join(import.meta.dirname, "conferir.ts"), pasta], { encoding: "utf8" });
    const semProva = rodar();
    assert.equal(semProva.status, 1);
    assert.match(semProva.stdout, /sem evidencias.json/);
    writeFileSync(join(pasta, "evidencias.json"), JSON.stringify([{
      id: "lavagem", afirmacao: "pode ser lavado após secagem", origem: { tipo: "operador", arquivo: "entrada.md", trecho: "pode ser lavado após secagem" },
      estado: "confirmada", objecao: "É lavável?", resposta_descricao: "pode ser lavado após secagem",
    }]));
    const comProva = rodar();
    assert.equal(comProva.status, 0, comProva.stderr + comProva.stdout);
    assert.match(comProva.stdout, /objeção §5.1 respondida por lavagem/);

    // Mesmo produto em outra categoria: o schema da primeira nunca valida a segunda.
    writeFileSync(join(pasta, "entrada.md"), (entrada + "\nOperador: pode ser lavado após secagem.\n")
      .replace("- **Categoria** (escolha do operador): MLB123456", "- **Categoria** (escolha do operador): MLB123456\n- **Categorias adicionais aprovadas:** MLB234567"));
    const segunda = join(pasta, "oferta-segunda.json");
    const nova = { ...JSON.parse(readFileSync(join(pasta, "oferta.json"), "utf8")), category_id: "MLB234567" };
    writeFileSync(segunda, JSON.stringify(nova));
    const conferirSegunda = () => spawnSync(process.execPath, [join(import.meta.dirname, "conferir.ts"), segunda], { encoding: "utf8" });
    assert.match(conferirSegunda().stdout, /sem schema da categoria MLB234567/);
    writeFileSync(join(pasta, "raw", "categoria-MLB234567-teste.json"), JSON.stringify({
      categoryId: "MLB234567", atributos: [{ id: "SECOND_CATEGORY_REQUIRED", name: "Campo próprio", tags: { required: true } }],
    }));
    assert.match(conferirSegunda().stdout, /obrigatório vazio: SECOND_CATEGORY_REQUIRED/);
    nova.atributos.push({ id: "SECOND_CATEGORY_REQUIRED", value_name: "   " });
    writeFileSync(segunda, JSON.stringify(nova));
    assert.match(conferirSegunda().stdout, /obrigatório vazio: SECOND_CATEGORY_REQUIRED/);
    nova.atributos.at(-1)!.value_name = "confirmado pelo operador";
    writeFileSync(segunda, JSON.stringify(nova));
    assert.equal(conferirSegunda().status, 0);
    nova.category_id = "MLB345678";
    writeFileSync(segunda, JSON.stringify(nova));
    assert.match(conferirSegunda().stdout, /não consta entre as escolhidas pelo operador/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("dono do link: próprio só com o vendedor desta conta; 403 de terceiro é concorrente", () => {
  assert.equal(donoDoLink(1, { seller_id: 1 }, null), "proprio");
  assert.equal(donoDoLink(1, null, null), "concorrente");
  assert.equal(donoDoLink(1, { seller_id: 2 }, [2, 3]), "concorrente");
  assert.equal(donoDoLink(1, null, [2, 1]), "voce_no_catalogo");
});

test("objeções do dossiê saem numeradas; número escrito na tabela vale", () => {
  const semNumero = "## 5. Objeções\n| Objeção / dor | Frequência |\n|---|---|\n| É lavável? | 2 |\n| Precisa de primer? | 1 |\n";
  assert.deepEqual(objecoesDoDossie(semNumero), [{ num: "5.1", texto: "É lavável?" }, { num: "5.2", texto: "Precisa de primer?" }]);
  const comNumero = "## 5. Objeções\n| # | Objeção / dor | Frequência |\n|---|---|---|\n| 5.3 | Cheiro forte? | 1 |\n|  |  |  |\n";
  assert.deepEqual(objecoesDoDossie(comNumero), [{ num: "5.3", texto: "Cheiro forte?" }]);
});

test("objeção com a coluna # em branco não se perde", () => {
  const md = "## 5. Objeções\n| # | Objeção / dor | Frequência |\n|---|---|---|\n|  | Seca em quanto tempo? | 3 |\n";
  assert.deepEqual(objecoesDoDossie(md), [{ num: "5.1", texto: "Seca em quanto tempo?" }]);
});

test("ml:posicao aceita o ID em minúsculas", () => {
  const pasta = pastaTemporaria();
  try {
    writeFileSync(join(pasta, "entrada.md"), entrada);
    const termos = ["a", "b", "c", "d", "e"];
    const busca = join(pasta, "busca.json");
    writeFileSync(busca, JSON.stringify({ buscas: termos.map((termo) => ({ termo, url: "u", itens: [{ item: "MLB111111111", patrocinado: false }] })) }));
    const r = spawnSync(process.execPath, [join(import.meta.dirname, "posicao.ts"), pasta, "mlb111111111", ...termos, "--arquivo", busca], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(join(pasta, "posicao.csv"), "utf8"), /MLB111111111,"a",1,encontrado/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});
