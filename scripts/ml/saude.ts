// Nota de qualidade que o próprio ML dá ao anúncio, e o que ele aponta como pendente.
// Último passo depois de publicar, e ponto de partida para revisar anúncio antigo.
//
//   npm run ml:saude -- MLB123 [MLB456 …]
//   npm run ml:saude -- --conta          → todos os anúncios ativos da conta, do pior para o melhor
//
// Fonte: GET /item/<id>/performance (apurado em 06/10/2026: estável em 3 leituras). Só leitura.
// O que o ML sugere é sugestão: preço, tipo de anúncio e vídeo continuam sendo decisão do operador.
import { ml, morrer } from "./api.js";
import { args } from "../cli.ts";

const conta = args.includes("--conta");
let ids = args.filter((a) => /^MLB\d+$/i.test(a));
if (!ids.length && !conta) morrer(new Error("Uso: npm run ml:saude -- MLB123 [MLB456 …]   ou   npm run ml:saude -- --conta"));

/** Pendências do /performance: regras com status PENDING, agrupadas pelo título da variável. */
export function pendencias(p: any): { grupo: string; acao: string }[] {
  const out: { grupo: string; acao: string }[] = [];
  for (const b of p.buckets ?? []) {
    for (const v of b.variables ?? []) {
      for (const r of v.rules ?? []) {
        if (r.status === "PENDING") out.push({ grupo: v.title ?? v.key, acao: r.wordings?.title ?? r.key });
      }
    }
  }
  return out;
}

try {
  if (conta) {
    const me = await ml("/users/me");
    const r: any = await ml(`/users/${me.id}/items/search?status=active&limit=100`);
    ids = r.results;
  }
  const linhas: any[] = [];
  for (const id of ids) {
    const [item, p]: any[] = await Promise.all([
      ml(`/items/${id}`),
      ml(`/item/${id}/performance`).catch((e: any) => ({
        // Anúncio de catálogo: o ML responde 400 "Product items are not supported" (visto em 06/10/2026).
        erro: /Product items are not supported/.test(String(e.message))
          ? "catálogo: o ML não dá nota a anúncio de catálogo"
          : String(e.message).split("\n")[0],
      })),
    ]);
    linhas.push({ id, titulo: item.title, score: p.score ?? null, nivel: p.level ?? p.erro ?? "-", pend: p.erro ? [] : pendencias(p) });
  }
  linhas.sort((a, b) => (a.score ?? 999) - (b.score ?? 999));

  for (const l of linhas) {
    console.log(`\n── ${l.id} · ${l.score ?? "-"} (${l.nivel}) · ${l.titulo.slice(0, 60)}`);
    if (!l.pend.length && l.score !== null) console.log("   nada pendente segundo o ML");
    for (const p of l.pend) console.log(`   • ${p.grupo}: ${p.acao}`);
  }
  if (linhas.length > 1) {
    const notas = linhas.map((l) => l.score).filter((n) => typeof n === "number");
    console.log(`\n${linhas.length} anúncios · média ${(notas.reduce((a, b) => a + b, 0) / (notas.length || 1)).toFixed(0)} · ` +
      `${linhas.filter((l) => (l.score ?? 100) < 70).length} abaixo de 70`);
  }
  console.log("\nSugestão do ML não é ordem: preço, clássico/premium e vídeo são decisão do operador.\n");
} catch (e) { morrer(e as Error); }
