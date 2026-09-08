// Adaptador de apuração do Mercado Livre.
// O núcleo (scripts/apuracao/) não sabe que API é esta — quem sabe é este arquivo.
import { coletar, catalogar, buscarPorTermo, buscarPorValor, auditar, resumirAuditoria } from "../apuracao/index.ts";
import { GLOSSARIO, SINONIMOS_ML, RECURSOS_SUGERIDOS } from "./glossario.ts";
import { ml } from "./api.js";

const HOST_PERMITIDO = "api.mercadolibre.com";

/**
 * Trava de segurança: o caminho pode vir digitado, e a chamada sai COM O TOKEN.
 * Um caminho como "//outro-servidor.com/x" mandaria o token para fora.
 */
export function validarCaminho(caminho: string): string {
  const limpo = String(caminho ?? "").trim();
  if (!limpo) throw new Error("Caminho vazio.");
  const url = new URL(limpo, `https://${HOST_PERMITIDO}`);
  if (url.hostname !== HOST_PERMITIDO) {
    throw new Error(
      `Bloqueado: "${limpo}" aponta para ${url.hostname}, não para ${HOST_PERMITIDO}. ` +
      `A chamada sai com o seu token — não vou mandá-lo para outro servidor.`,
    );
  }
  if (url.protocol !== "https:") throw new Error(`Bloqueado: só https, veio ${url.protocol}`);
  return url.pathname + url.search;
}

export type OpcoesApuracao = { repeticoes?: number; intervaloMs?: number; toleranciaRelativa?: number };

/** Coleta o mesmo recurso N vezes, cataloga os campos e audita os valores. */
export async function apurar(caminho: string, opcoes: OpcoesApuracao = {}) {
  const seguro = validarCaminho(caminho);
  const { repeticoes = 3, intervaloMs = 700, toleranciaRelativa = 0.01 } = opcoes;

  const coleta = await coletar(() => ml(seguro), { repeticoes, intervaloMs });
  const amostras = coleta.amostras.map((a) => a.dados);
  if (!amostras.length) throw new Error(`Nenhuma amostra válida de ${seguro}. Falhas: ${coleta.falhas.map((f) => f.erro).join(" | ")}`);

  return {
    caminho: seguro,
    coleta,
    catalogo: catalogar(amostras),
    auditoria: auditar(amostras, { toleranciaRelativa }),
  };
}

/** Normaliza recurso: tira query e troca id real / placeholder por um curinga. */
function chaveRecurso(r: string): string {
  return r.split("?")[0].replace(/ML[A-Z]?\d+/g, "*").replace(/\$[A-Z]+/g, "*").replace(/\/+$/, "");
}

/** Confere o glossário contra o que a apuração realmente devolveu. */
export function conferirGlossario(catalogo: any, recurso: string) {
  const lista = catalogo?.campos ?? catalogo ?? [];
  const caminhos = new Set<string>((Array.isArray(lista) ? lista : Object.values(lista)).map((c: any) => c?.caminho ?? c));
  const generico = (c: string) => c.replace(/\[[^\]]*\]/g, "[]");
  const alvo = chaveRecurso(recurso);
  const doRecurso = GLOSSARIO.filter((t) => chaveRecurso(t.recurso) === alvo);
  return doRecurso.map((t) => {
    const achou = [...caminhos].some((c) => generico(c) === generico(t.caminho) || generico(c).startsWith(generico(t.caminho)));
    return { ...t, apareceu: achou };
  });
}

export { buscarPorTermo, buscarPorValor, resumirAuditoria, SINONIMOS_ML, RECURSOS_SUGERIDOS, GLOSSARIO };
