import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparPorProduto, leituraDaElegibilidade, type Linha } from "./catalogo-status.ts";

const linha = (p: Partial<Linha>): Linha => ({
  id: "MLB1111111111", titulo: "t", categoria: "MLB123456", status: "active",
  catalogo: null, deCatalogo: false, elegibilidade: "CATALOG_PRODUCT_ID_NULL", motivo: null, ...p,
});

test("elegibilidade traduz status apurados e não inventa leitura para status novo", () => {
  assert.match(leituraDaElegibilidade("CATALOG_PRODUCT_ID_NULL"), /só orgânico/);
  assert.match(leituraDaElegibilidade("ALREADY_OPTED_IN"), /já tem anúncio de catálogo/);
  assert.match(leituraDaElegibilidade("COMPETING"), /competindo/);
  assert.match(leituraDaElegibilidade("READY_FOR_OPTIN"), /ainda não apurado/);
  assert.equal(leituraDaElegibilidade(null), "não lido");
});

test("agrupa par tradicional + catálogo e acusa produto em mais de uma categoria", () => {
  const grupos = agruparPorProduto([
    linha({ id: "MLB1", catalogo: "MLB900" }),
    linha({ id: "MLB2", catalogo: "MLB900", deCatalogo: true }),
    linha({ id: "MLB3", catalogo: "MLB901", categoria: "MLB234567" }),
    linha({ id: "MLB4", catalogo: "MLB901", categoria: "MLB345678" }),
    linha({ id: "MLB5" }), // sem produto ligado: fica fora dos grupos
  ]);
  assert.equal(grupos.length, 2);
  const par = grupos.find((g) => g.produto === "MLB900")!;
  assert.ok(par.temCatalogo && par.temTradicional);
  assert.deepEqual(par.categorias, ["MLB123456"]);
  const duas = grupos.find((g) => g.produto === "MLB901")!;
  assert.equal(duas.temCatalogo, false);
  assert.deepEqual(duas.categorias, ["MLB234567", "MLB345678"]);
});
