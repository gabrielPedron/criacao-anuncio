// Sugestões de busca do ML (o autocompletar), lidas de dentro do Chrome do projeto.
// É o sinal de semântica que dá para ter sem ferramenta paga: a ordem segue a popularidade da
// busca, mas NÃO traz volume. O endpoint dá 403 fora do navegador.
//
//   npm run ml:sugestoes -- "tinta para piso" "verniz fosco" [--salvar produtos/x/raw/sugestoes.json]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { morrer } from "./api.js";
import { args, pega } from "../cli.ts";
import { conectar } from "./chrome.ts";

const destino = pega("--salvar");
const termos = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!termos.length) morrer(new Error('Uso: npm run ml:sugestoes -- "termo 1" "termo 2" [--salvar arquivo.json]'));

/** Roda dentro de uma página do ML (mesma origem que o autocompletar espera). */
function sugerir(lista: string[]) {
  return (async () => {
    const out: Record<string, string[] | string> = {};
    for (const q of lista) {
      try {
        const r = await fetch("https://http2.mlstatic.com/resources/sites/MLB/autosuggest?showFilters=true&limit=10&api_version=2&q=" + encodeURIComponent(q));
        out[q] = r.ok ? ((await r.json()).suggested_queries || []).map((x: any) => x.q) : `erro ${r.status}`;
      } catch (e: any) { out[q] = "erro " + e.message; }
      await new Promise((r) => setTimeout(r, 400));
    }
    return out;
  })();
}

try {
  const pagina = await conectar();
  await pagina.abrir("https://www.mercadolivre.com.br/");
  const sugestoes: Record<string, string[] | string> = await pagina.avaliar(sugerir, termos);
  await pagina.fechar();

  for (const [termo, lista] of Object.entries(sugestoes)) {
    console.log(`\n── "${termo}"`);
    if (typeof lista === "string") console.log(`  ✗ ${lista}`);
    else if (!lista.length) console.log("  (sem sugestão — termo pouco buscado, ou grafia que ninguém usa)");
    else lista.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s}`));
  }
  if (destino) {
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify({ lido_em: new Date().toISOString(), sugestoes }, null, 2));
    console.log(`\n✓ Salvo em ${destino}`);
  }
  console.log("\nA ordem é a do ML (mais buscado primeiro), sem volume. Cruze com ml:busca para ver a concorrência.\n");
} catch (e) { morrer(e as Error); }
