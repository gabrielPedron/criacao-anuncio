// Busca por termo no ML, lida no Chrome do projeto (a API bloqueia /sites/MLB/search).
// Devolve o total de resultados (medida de concorrência) e os anúncios da 1ª página, marcando
// os patrocinados — a metodologia manda desconsiderar o "Ad" ao ler ranqueamento orgânico.
//
//   npm run ml:busca -- "tinta para piso" "verniz fosco" [--salvar produtos/x/raw/busca.json] [--recarregar]
//
// Termo lido há menos de 12 h vem do cache, sem abrir o Chrome; --recarregar força ler de novo.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { morrer } from "./api.js";
import { args, pega } from "../cli.ts";
import { conectar, slugDaBusca, idsDoLink, doCache, guardarNoCache, horaDoCache } from "./chrome.ts";

const destino = pega("--salvar");
// Só --salvar leva valor; --recarregar (ignora o cache de 12 h) é flag solta.
const termos = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--salvar");
if (!termos.length) morrer(new Error('Uso: npm run ml:busca -- "termo 1" "termo 2" [--salvar arquivo.json]'));

/** Roda dentro da página de resultados. */
function lerResultados() {
  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return (async () => {
    // O ML às vezes redireciona a busca depois do "complete" (visto em 07/10/2026): o documento novo
    // ainda está sem body. Espera um pouco em vez de quebrar em document.body.scrollHeight.
    for (let i = 0; i < 40 && !document.body; i++) await espera(250);
    if (!document.body) return { total: null, itens: [] };
    for (let i = 1; i <= 6; i++) { window.scrollTo(0, (document.body?.scrollHeight ?? 0) * i / 6); await espera(400); }
    let cards = [...document.querySelectorAll("li.ui-search-layout__item")];
    if (!cards.length) cards = [...document.querySelectorAll(".poly-card")];
    const vistos = new Set<string>();
    const itens = cards.map((el: any) => {
      const t = (s: string) => el.querySelector(s)?.innerText?.replace(/\s+/g, " ").trim() ?? null;
      return {
        titulo: t(".poly-component__title, h2, h3"),
        preco: t(".poly-price__current .andes-money-amount__fraction, .andes-money-amount__fraction"),
        nota: t(".poly-reviews__rating"),
        avaliacoes: t(".poly-reviews__total"),
        // Ad: selo "Ad" no card e link de clique pago (/mclics/). Visto em 06/10/2026.
        patrocinado: !!el.querySelector(".poly-component__ads-promotions") ||
          /\/mclics\//.test(el.querySelector("a")?.href ?? "") || /Patrocinado/i.test(el.innerText),
        link: el.querySelector("a")?.href ?? "",
      };
    }).filter((i: any) => i.titulo && !vistos.has(i.titulo + i.link) && vistos.add(i.titulo + i.link));
    const total = document.querySelector(".ui-search-search-result__quantity-results")?.textContent?.trim() ?? null;
    return { total, itens };
  })();
}

try {
  // O Chrome só abre se algum termo não estiver no cache de 12 h.
  let pagina: Awaited<ReturnType<typeof conectar>> | null = null;
  const saida: any[] = [];
  for (const termo of termos) {
    const url = `https://lista.mercadolivre.com.br/${slugDaBusca(termo)}`;
    const guardado = doCache(url);
    let r: any, lidoEm: string;
    if (guardado) {
      r = guardado.dado;
      lidoEm = guardado.lido_em;
    } else {
      const aba = pagina ??= await conectar();
      // Navegação no meio da leitura (redirecionamento do ML) destrói o contexto do JS: vira
      // "nada lido" e cai na 2ª tentativa, em vez de derrubar a rodada inteira.
      let falha = "";
      const ler = async () => {
        try { return await aba.avaliar(lerResultados); }
        catch (e: any) { falha = e.message; return { total: null, itens: [] }; }
      };
      await aba.abrir(url);
      r = await ler();
      if (!r.itens.length) {
        // Uma segunda tentativa antes de desistir: página que ainda montava os cards.
        await aba.abrir(url);
        r = await ler();
      }
      if (!r.itens.length) {
        // Falha alta, sem salvar: um JSON vazio em raw/ seria lido depois como "não tem concorrência".
        await aba.fechar();
        throw new Error(`Nenhum anúncio lido em "${termo}" (${url}), nem na 2ª tentativa. ` +
          `O layout da busca pode ter mudado. Nada foi salvo.${falha ? ` Último erro: ${falha}` : ""}`);
      }
      guardarNoCache(url, r);
      lidoEm = new Date().toISOString();
    }
    const itens = r.itens.map((i: any, n: number) => ({
      posicao: n + 1, ...i, ...idsDoLink(i.link), link: i.link.split(/[?#]/)[0],
    }));
    saida.push({ termo, url, lido_em: lidoEm, resultados: r.total, itens });

    const organicos = itens.filter((i: any) => !i.patrocinado);
    console.log(`\n── "${termo}" — ${r.total ?? "total não lido"} · ${itens.length} na 1ª página (${itens.length - organicos.length} patrocinados)` +
      (guardado ? ` · lida às ${horaDoCache(lidoEm)}, do cache (--recarregar lê de novo)` : ""));
    for (const i of itens.slice(0, 15)) {
      console.log(`  ${String(i.posicao).padStart(2)}. ${i.patrocinado ? "[Ad] " : ""}${i.titulo.slice(0, 70)} · R$ ${i.preco ?? "-"}${i.avaliacoes ? ` · ${i.nota}★ ${i.avaliacoes}` : ""}`);
    }
  }
  await pagina?.fechar();

  if (destino) {
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify({ lido_em: new Date().toISOString(), buscas: saida }, null, 2));
    console.log(`\n✓ Salvo em ${destino}`);
  }
  console.log("\nO total de resultados mede concorrência, não volume de busca. Volume continua vindo da pesquisa do operador.\n");
} catch (e) { morrer(e as Error); }
