// Tipos do núcleo de apuração e auditoria de APIs.
//
// Este módulo é PORTÁTIL: nada aqui conhece o Mercado Livre, o Supabase, o
// TanStack ou este projeto. Ele resolve dois problemas que aparecem em toda
// integração com API de terceiro:
//
//   1. APURAR  — o nome que a gente usa não é o nome que a API usa. O apurador
//      achata a resposta inteira em caminhos e deixa procurar de trás pra
//      frente: por termo em português ou pelo próprio valor que apareceu.
//
//   2. AUDITAR — a mesma chamada, repetida, às vezes devolve números
//      diferentes. O auditor coleta N vezes e elege o valor por moda, dizendo
//      com que confiança.

/** Caminho de um campo dentro do JSON. Ex.: `seller_reputation.metrics.claims.rate`. */
export type Caminho = string;

/**
 * Qualquer valor que caiba em JSON. É de propósito mais estreito que `unknown`:
 * tudo aqui atravessa a fronteira servidor → navegador, e o serializador do
 * TanStack recusa `unknown`. Como a origem é sempre uma resposta de API, isto
 * também é o tipo honesto.
 */
export type ValorJson =
  | string
  | number
  | boolean
  | null
  | ValorJson[]
  | { [chave: string]: ValorJson };

export type TipoValor =
  | "texto"
  | "numero"
  | "booleano"
  | "nulo"
  | "data"
  | "lista-vazia"
  | "objeto-vazio"
  | "quantidade";

// ---------------------------------------------------------------- catálogo

export type CampoCatalogo = {
  /** Caminho genérico: os índices de lista viram `[]`. Ex.: `results[].id`. */
  caminho: Caminho;
  /** Até alguns caminhos concretos que geraram este genérico. */
  concretos: string[];
  tipos: TipoValor[];
  /** Valores distintos observados, cortados para caberem na tela. */
  exemplos: ValorJson[];
  /** Quantas vezes o campo apareceu somando todas as amostras. */
  ocorrencias: number;
  /** Em quantas das amostras coletadas o campo existiu. */
  amostrasComCampo: number;
};

export type Catalogo = {
  campos: CampoCatalogo[];
  totalAmostras: number;
};

// ------------------------------------------------------------------ busca

export type ResultadoBusca = {
  campo: CampoCatalogo;
  /** Quanto o campo combina com o que foi procurado. Maior é melhor. */
  pontos: number;
  /** Por que este campo entrou no resultado — em português, para exibir. */
  motivo: string;
};

// -------------------------------------------------------------- auditoria

/**
 * - `unanime`    todas as coletas devolveram o mesmo valor.
 * - `maioria`    a moda ganhou de mais da metade das coletas.
 * - `empate`     a moda empatou com outro valor — não dá para eleger.
 * - `divergente` nenhum valor alcançou maioria.
 */
export type Confianca = "unanime" | "maioria" | "empate" | "divergente";

export type Variante = { valor: ValorJson; votos: number };

export type CampoAuditado = {
  caminho: Caminho;
  /** O valor eleito pela moda. */
  valor: ValorJson;
  confianca: Confianca;
  /** Votos do valor eleito. */
  votos: number;
  /** Em quantas coletas o campo existiu. */
  presenteEm: number;
  /** Em quantas coletas o campo simplesmente não veio. */
  ausenteEm: number;
  /** Todos os valores observados, do mais votado para o menos. */
  variantes: Variante[];
};

export type Auditoria = {
  campos: CampoAuditado[];
  /** Só os campos que não foram unânimes ou que faltaram em alguma coleta. */
  instaveis: CampoAuditado[];
  coletas: number;
  /**
   * Todas as coletas voltaram byte a byte iguais. Parece ótimo, mas pode ser
   * só cache do servidor respondendo a mesma coisa — nesse caso a repetição
   * não confirmou nada. Ver `coletar()`.
   */
  respostasIdenticas: boolean;
  tolerancia: { relativa: number; absoluta: number };
};

// ----------------------------------------------------------------- coleta

export type Amostra<T> = {
  tentativa: number;
  em: string;
  duracaoMs: number;
  dados: T;
};

export type FalhaColeta = {
  tentativa: number;
  em: string;
  erro: string;
};

export type Coleta<T> = {
  amostras: Amostra<T>[];
  falhas: FalhaColeta[];
  respostasIdenticas: boolean;
};
