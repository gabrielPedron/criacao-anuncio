import { test } from "node:test";
import assert from "node:assert/strict";
import { pendentesDaEntrada, categoriasDaEntrada } from "./entrada.ts";

test("pendências da entrada: lista sob cabeçalho, riscado resolvido, instrução do modelo ignorada", () => {
  const md = [
    "Campo vazio fica `PENDENTE`, nunca estimado.",
    "| Preço | PENDENTE |",
    "| Estoque | 10 |",
    "**Ainda PENDENTE:**",
    "- peso bruto",
    "- ~~GTIN~~",
    "texto solto",
  ].join("\n");
  assert.deepEqual(pendentesDaEntrada(md), ["Preço | PENDENTE |", "peso bruto"]);
});

test("categoria ausente diz o que falta e onde preencher", () => {
  assert.throws(() => categoriasDaEntrada("- **Categoria:** tintas"), /ID MLB \(ex\.: MLB123456\) no campo \*\*Categoria\*\*/);
  assert.deepEqual(categoriasDaEntrada("- **Categoria:** mlb123456"), ["MLB123456"]);
});
