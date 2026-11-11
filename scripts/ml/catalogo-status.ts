// Mapa de catálogo da própria conta: qual anúncio está ligado a qual produto de catálogo, em qual
// categoria, e o que o ML diz da elegibilidade para competir no catálogo. Só leitura.
//
//   npm run ml:catalogo-status -- MLB123 [MLB456 …]
//   npm run ml:catalogo-status -- --conta      → todos os anúncios ativos e pausados da conta
//
// Fonte: GET /items/<id>/catalog_listing_eligibility + GET /items/<id> (catalog_product_id,
// catalog_listing, category_id). Campos apurados e registrados no glossario.ts em 19/10/2026.
// Não vincula nada: ligar anúncio a catálogo é escrita e continua fora deste comando (backlog 26).
import { ml, morrer, anunciosDaConta } from "./api.js";
import { args } from "../cli.ts";

/** Status de elegibilidade → leitura em português. Status não visto ainda aparece cru. */
const LEITURA: Record<string, string> = {
  CATALOG_PRODUCT_ID_NULL: "sem produto de catálogo ligado — só orgânico",
  ALREADY_OPTED_IN: "já tem anúncio de catálogo ligado a este",
  COMPETING: "competindo no catálogo",
};

export type Linha = {
  id: string; titulo: string; categoria: string; status: string;
  catalogo: string | null; deCatalogo: boolean; elegibilidade: string; motivo: string | null;
};

export function leituraDaElegibilidade(status: string | null | undefined): string {
  if (!status) return "não lido";
  return LEITURA[status] ?? `${status} (status ainda não apurado — conferir antes de agir)`;
}

/**
 * Agrupa por produto de catálogo. Mostra os pares tradicional + catálogo e os produtos que a conta
 * vende em mais de uma categoria. Anúncio sem produto ligado fica de fora do grupo.
 */
export function agruparPorProduto(linhas: Linha[]) {
  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) {
    if (!l.catalogo) continue;
    if (!grupos.has(l.catalogo)) grupos.set(l.catalogo, []);
    grupos.get(l.catalogo)!.push(l);
  }
  return [...grupos].map(([produto, itens]) => ({
    produto,
    itens,
    categorias: [...new Set(itens.map((i) => i.categoria))],
    temCatalogo: itens.some((i) => i.deCatalogo),
    temTradicional: itens.some((i) => !i.deCatalogo),
  }));
}

if (import.meta.main) {
  const conta = args.includes("--conta");
  let ids = args.filter((a) => /^MLB\d+$/i.test(a));
  if (!ids.length && !conta) morrer(new Error("Uso: npm run ml:catalogo-status -- MLB123 [MLB456 …]   ou   --conta"));
  try {
    if (conta) {
      ids = (await anunciosDaConta()).ids;
    }
    const linhas: Linha[] = [];
    for (const id of ids) {
      const [item, e]: any[] = await Promise.all([
        ml(`/items/${id}`),
        ml(`/items/${id}/catalog_listing_eligibility`).catch((x: any) => ({ status: null, reason: String(x.message).split("\n")[0] })),
      ]);
      linhas.push({
        id, titulo: item.title ?? "", categoria: item.category_id, status: item.status,
        catalogo: item.catalog_product_id ?? null, deCatalogo: item.catalog_listing === true,
        elegibilidade: e.status, motivo: e.reason ?? null,
      });
    }

    console.log("\n| Anúncio | Tipo | Categoria | Produto de catálogo | Situação |");
    console.log("|---|---|---|---|---|");
    for (const l of linhas) {
      console.log(`| ${l.id} ${l.status === "active" ? "" : `(${l.status})`} | ${l.deCatalogo ? "catálogo" : "tradicional"} | ${l.categoria} | ${l.catalogo ?? "—"} | ${l.deCatalogo ? "é o anúncio de catálogo" : leituraDaElegibilidade(l.elegibilidade)} |`);
    }

    const grupos = agruparPorProduto(linhas);
    const semPar = grupos.filter((g) => g.temTradicional && !g.temCatalogo);
    const variasCat = grupos.filter((g) => g.categorias.length > 1);
    const soOrganicos = linhas.filter((l) => !l.catalogo);
    console.log(`\n${linhas.length} anúncios · ${grupos.length} produtos de catálogo · ${soOrganicos.length} anúncios sem produto ligado`);
    if (semPar.length) console.log(`Ligados a produto mas sem anúncio de catálogo: ${semPar.map((g) => g.produto).join(", ")}`);
    if (variasCat.length) {
      console.log("Mesmo produto de catálogo em mais de uma categoria (conferir se é proposital):");
      for (const g of variasCat) console.log(`  ${g.produto}: ${g.categorias.join(", ")} → ${g.itens.map((i) => i.id).join(", ")}`);
    }
    console.log("\nLeitura, não decisão. Ligar um anúncio a catálogo é escrita: só com o operador confirmando que é\n" +
      "exatamente o mesmo produto, embalagem e versão — e por um comando com trava, que ainda não existe.\n");
  } catch (e) { morrer(e as Error); }
}
