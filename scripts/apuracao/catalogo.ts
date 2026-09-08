// Monta o catálogo de campos de uma ou mais respostas.
//
// O catálogo é o "mapa do que veio": todo campo que a API devolveu, com o
// caminho real, o tipo, exemplos de valor e em quantas coletas apareceu.
// É o que responde "existe, mas com outro nome — qual?".

import { achatar, caminhoGenerico, tipoDe, type OpcoesAchatar } from "./achatar.ts";
import type { Caminho, CampoCatalogo, Catalogo, TipoValor, ValorJson } from "./tipos.ts";

const MAX_EXEMPLOS = 4;
const MAX_CONCRETOS = 3;

function chaveDeExemplo(valor: ValorJson): string {
  try {
    return JSON.stringify(valor) ?? "undefined";
  } catch {
    return String(valor);
  }
}

/**
 * Junta as amostras em um único catálogo. Campos que só diferem pelo índice
 * da lista são agrupados: `results[id=1].price` e `results[id=2].price`
 * viram uma linha só, `results[].price`.
 */
export function catalogar(amostras: unknown[], opcoes: OpcoesAchatar = {}): Catalogo {
  const acumulado = new Map<
    Caminho,
    {
      concretos: Set<string>;
      tipos: Set<TipoValor>;
      exemplos: Map<string, ValorJson>;
      ocorrencias: number;
      amostras: Set<number>;
    }
  >();

  amostras.forEach((amostra, indice) => {
    for (const [concreto, valor] of achatar(amostra, opcoes)) {
      const generico = caminhoGenerico(concreto);
      let campo = acumulado.get(generico);
      if (!campo) {
        campo = {
          concretos: new Set(),
          tipos: new Set(),
          exemplos: new Map(),
          ocorrencias: 0,
          amostras: new Set(),
        };
        acumulado.set(generico, campo);
      }
      if (campo.concretos.size < MAX_CONCRETOS) campo.concretos.add(concreto);
      campo.tipos.add(tipoDe(valor, concreto));
      campo.ocorrencias += 1;
      campo.amostras.add(indice);
      const chave = chaveDeExemplo(valor);
      if (campo.exemplos.size < MAX_EXEMPLOS && !campo.exemplos.has(chave)) {
        campo.exemplos.set(chave, valor);
      }
    }
  });

  const campos: CampoCatalogo[] = Array.from(acumulado, ([caminho, dados]) => ({
    caminho,
    concretos: Array.from(dados.concretos),
    tipos: Array.from(dados.tipos),
    exemplos: Array.from(dados.exemplos.values()),
    ocorrencias: dados.ocorrencias,
    amostrasComCampo: dados.amostras.size,
  }));

  campos.sort((a, b) => a.caminho.localeCompare(b.caminho, "pt-BR"));

  return { campos, totalAmostras: amostras.length };
}

/** Procura um campo pelo caminho exato (genérico ou concreto). */
export function campoPorCaminho(catalogo: Catalogo, caminho: Caminho): CampoCatalogo | undefined {
  const alvo = caminhoGenerico(caminho);
  return catalogo.campos.find((c) => c.caminho === alvo);
}
