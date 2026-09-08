// Repete a mesma leitura N vezes para a auditoria ter o que comparar.
//
// Cuidado que vale registrar: três GETs seguidos podem ser servidos do mesmo
// cache e voltar byte a byte iguais. Isso PARECE confirmação e não é — a
// pergunta foi feita uma vez só. Por isso duas coisas aqui: um intervalo entre
// as tentativas (dá tempo de cair em outra réplica) e o sinal
// `respostasIdenticas`, que a interface mostra como ressalva em vez de
// selo de qualidade.

import type { Amostra, Coleta, FalhaColeta } from "./tipos.ts";

export type OpcoesColeta = {
  /** Quantas vezes repetir. Padrão 3 — o mínimo que permite desempate por moda. */
  repeticoes?: number;
  /** Espera entre as tentativas, em milissegundos. */
  intervaloMs?: number;
  /** Quantas coletas bem-sucedidas bastam para valer a pena auditar. */
  minimoValido?: number;
};

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chama `buscar` várias vezes, em sequência, com intervalo.
 *
 * Sequencial de propósito: em paralelo as três chamadas saem no mesmo
 * instante, batem na mesma réplica e no mesmo cache — e a auditoria vira
 * teatro. Falha isolada não derruba a coleta; fica registrada em `falhas`.
 */
export async function coletar<T>(
  buscar: (tentativa: number) => Promise<T>,
  opcoes: OpcoesColeta = {},
): Promise<Coleta<T>> {
  const repeticoes = Math.max(1, opcoes.repeticoes ?? 3);
  const intervaloMs = opcoes.intervaloMs ?? 700;
  const minimoValido = opcoes.minimoValido ?? 1;

  const amostras: Amostra<T>[] = [];
  const falhas: FalhaColeta[] = [];

  for (let tentativa = 1; tentativa <= repeticoes; tentativa++) {
    if (tentativa > 1 && intervaloMs > 0) await esperar(intervaloMs);

    const inicio = Date.now();
    try {
      const dados = await buscar(tentativa);
      amostras.push({
        tentativa,
        em: new Date().toISOString(),
        duracaoMs: Date.now() - inicio,
        dados,
      });
    } catch (erro) {
      falhas.push({
        tentativa,
        em: new Date().toISOString(),
        erro: erro instanceof Error ? erro.message : "falha desconhecida",
      });
    }
  }

  if (amostras.length < minimoValido) {
    const detalhe = falhas.map((f) => `tentativa ${f.tentativa}: ${f.erro}`).join(" · ");
    throw new Error(
      `A coleta não conseguiu ${minimoValido} leitura(s) válida(s) em ${repeticoes} tentativa(s). ${detalhe}`,
    );
  }

  const assinaturas = amostras.map((a) => {
    try {
      return JSON.stringify(a.dados);
    } catch {
      return String(a.dados);
    }
  });

  return {
    amostras,
    falhas,
    respostasIdenticas: amostras.length > 1 && assinaturas.every((a) => a === assinaturas[0]),
  };
}
