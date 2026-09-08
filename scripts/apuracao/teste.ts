// Testes do núcleo de apuração e auditoria — sem framework, sem dependência.
// Roda com:  bun run src/lib/apuracao/teste.ts
//
// O caso da seção 4 (23, 20, 23) é o exemplo que originou a auditoria: a mesma
// chamada devolvendo números diferentes, e a moda decidindo qual vale.

import {
  achatar,
  catalogar,
  buscarPorTermo,
  buscarPorValor,
  auditar,
  coletar,
  resumirAuditoria,
  resumirCatalogo,
} from "./index.ts";

let falhas = 0;
function conferir(nome: string, condicao: boolean, extra?: unknown) {
  if (condicao) console.log(`  ok  ${nome}`);
  else {
    falhas++;
    console.log(`  FALHOU  ${nome}`, extra ?? "");
  }
}

console.log("\n=== 1. achatar ===");
const bruto = {
  paging: { total: 23, offset: 0 },
  seller_reputation: { level_id: "5_green", metrics: { claims: { rate: 0.012, value: 3 } } },
  results: [
    { id: "MLB1", price: 99.9 },
    { id: "MLB2", price: 50 },
  ],
  vazio: [],
  nada: null,
};
const plano = achatar(bruto);
for (const [k, v] of plano) console.log(`  ${k} = ${JSON.stringify(v)}`);
conferir("caminho aninhado", plano.get("seller_reputation.metrics.claims.value") === 3);
conferir("lista indexada por id", plano.get("results[id=MLB1].price") === 99.9);
conferir("quantidade sintética da lista", plano.get("results#quantidade") === 2);
conferir("lista vazia preservada", Array.isArray(plano.get("vazio")));

console.log("\n=== 2. catálogo + busca por termo ===");
const catalogo = catalogar([bruto]);
console.log(resumirCatalogo(catalogo));
conferir(
  "results[] agrupa os dois itens",
  catalogo.campos.some((c) => c.caminho === "results[].price"),
);

for (const termo of ["reputação", "reclamações", "preço", "total de vendas", "nível"]) {
  const achados = buscarPorTermo(catalogo, termo, { limite: 3 });
  console.log(`  "${termo}" →`);
  for (const a of achados) console.log(`      ${a.campo.caminho}  (${a.pontos}) ${a.motivo}`);
}
conferir(
  "'reclamações' acha claims",
  buscarPorTermo(catalogo, "reclamações")[0]?.campo.caminho.includes("claims"),
);
conferir(
  "'preço' acha price",
  buscarPorTermo(catalogo, "preço")[0]?.campo.caminho.includes("price"),
);

console.log("\n=== 3. busca por valor (o 23 do exemplo) ===");
const porValor = buscarPorValor(catalogo, 23);
for (const a of porValor) console.log(`  ${a.campo.caminho} — ${a.motivo}`);
conferir("acha o 23 em paging.total", porValor[0]?.campo.caminho === "paging.total");

console.log("\n=== 4. auditoria: 23, 20, 23 ===");
const c = (total: number, extra: Record<string, unknown> = {}) => ({
  paging: { total },
  seller_reputation: { level_id: "5_green" },
  results: [{ id: "MLB1", price: 99.9 }],
  ...extra,
});
const auditoria = auditar([c(23), c(20), c(23)]);
console.log(resumirAuditoria(auditoria));
const totalAuditado = auditoria.campos.find((x) => x.caminho === "paging.total")!;
conferir("moda elege 23", totalAuditado.valor === 23, totalAuditado);
conferir("confiança = maioria", totalAuditado.confianca === "maioria");
conferir(
  "guarda a variante 20",
  totalAuditado.variantes.some((v) => v.valor === 20 && v.votos === 1),
);
conferir(
  "level_id sai como unânime",
  auditoria.campos.find((x) => x.caminho === "seller_reputation.level_id")!.confianca === "unanime",
);
conferir(
  "só paging.total entrou em instáveis",
  auditoria.instaveis.length === 1 && auditoria.instaveis[0].caminho === "paging.total",
  auditoria.instaveis.map((i) => i.caminho),
);

console.log("\n=== 5. empate e campo ausente ===");
const empate = auditar([c(10), c(20)]);
conferir(
  "2 valores diferentes = empate",
  empate.campos.find((x) => x.caminho === "paging.total")!.confianca === "empate",
);

const ausente = auditar([c(23, { bonus: 1 }), c(23), c(23)]);
const campoBonus = ausente.campos.find((x) => x.caminho === "bonus")!;
conferir(
  "campo que só veio 1x é instável",
  campoBonus.ausenteEm === 2 && campoBonus.confianca !== "unanime",
);
conferir(
  "campo intermitente entra em instáveis",
  ausente.instaveis.some((i) => i.caminho === "bonus"),
);

console.log("\n=== 6. tolerância numérica ===");
const preco = (v: number) => ({ preco: v });
const semMargem = auditar([preco(100), preco(100.4), preco(100.2)]);
const comMargem = auditar([preco(100), preco(100.4), preco(100.2)], { toleranciaRelativa: 0.01 });
conferir(
  "sem margem, três valores distintos",
  semMargem.campos.find((x) => x.caminho === "preco")!.variantes.length === 3,
);
conferir(
  "com margem de 1%, viram um só",
  comMargem.campos.find((x) => x.caminho === "preco")!.votos === 3,
  comMargem.campos.find((x) => x.caminho === "preco"),
);

console.log("\n=== 7. lista fora de ordem não vira divergência falsa ===");
const listaA = {
  results: [
    { id: "A", price: 10 },
    { id: "B", price: 20 },
  ],
};
const listaB = {
  results: [
    { id: "B", price: 20 },
    { id: "A", price: 10 },
  ],
};
const ordem = auditar([listaA, listaB]);
conferir(
  "mesma lista embaralhada = tudo unânime",
  ordem.instaveis.length === 0,
  ordem.instaveis.map((i) => `${i.caminho}: ${JSON.stringify(i.variantes)}`),
);

console.log("\n=== 8. coleta com falha isolada e respostas idênticas ===");
let n = 0;
const coleta = await coletar(
  async () => {
    n++;
    if (n === 2) throw new Error("500 do servidor");
    return c(23);
  },
  { repeticoes: 3, intervaloMs: 5 },
);
conferir("2 amostras válidas, 1 falha", coleta.amostras.length === 2 && coleta.falhas.length === 1);
conferir("detecta respostas idênticas", coleta.respostasIdenticas === true);

console.log("\n=== 9. ignorar carimbos de tempo ===");
const comData = (t: string) => ({ paging: { total: 23 }, date_created: t });
const semIgnorar = auditar([comData("a"), comData("b")]);
const comIgnorar = auditar([comData("a"), comData("b")], { ignorar: [/date_/] });
conferir(
  "sem ignorar, date_created polui",
  semIgnorar.instaveis.some((i) => i.caminho === "date_created"),
);
conferir("com ignorar, some", comIgnorar.instaveis.length === 0);

console.log(falhas === 0 ? "\nTODOS OS TESTES PASSARAM\n" : `\n${falhas} TESTE(S) FALHARAM\n`);
process.exit(falhas === 0 ? 0 : 1);
