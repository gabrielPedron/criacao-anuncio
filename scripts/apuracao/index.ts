// Núcleo de apuração e auditoria de APIs — portátil, sem dependências.
//
// Uso típico, em qualquer projeto:
//
//   const coleta = await coletar(() => buscarJson(url), { repeticoes: 3 });
//   const amostras = coleta.amostras.map((a) => a.dados);
//
//   const catalogo = catalogar(amostras);              // o que a API devolveu
//   const achados = buscarPorTermo(catalogo, "reputação"); // onde está isso?
//   const auditoria = auditar(amostras, { toleranciaRelativa: 0.01 });
//   console.log(resumirAuditoria(auditoria));
//
// Ver `LEIAME.md` nesta pasta.

export {
  achatar,
  caminhoGenerico,
  segmentos,
  tipoDe,
  ultimoSegmento,
  CHAVES_DE_IDENTIDADE,
  SUFIXO_QUANTIDADE,
  type OpcoesAchatar,
} from "./achatar.ts";

export { catalogar, campoPorCaminho } from "./catalogo.ts";

export {
  buscarPorTermo,
  buscarPorValor,
  normalizar,
  type OpcoesBusca,
  type OpcoesBuscaPorValor,
} from "./busca.ts";

export { expandir, GRUPOS_DE_SINONIMOS } from "./sinonimos.ts";

export { auditar, valoresEleitos, type OpcoesAuditoria } from "./auditoria.ts";

export { coletar, type OpcoesColeta } from "./coleta.ts";

export { explicarCampo, resumirAuditoria, resumirCatalogo } from "./relatorio.ts";

export type {
  Amostra,
  Auditoria,
  Caminho,
  CampoAuditado,
  CampoCatalogo,
  Catalogo,
  Coleta,
  Confianca,
  FalhaColeta,
  ResultadoBusca,
  TipoValor,
  ValorJson,
  Variante,
} from "./tipos.ts";
