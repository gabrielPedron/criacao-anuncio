// Achata um JSON em pares caminho → valor.
//
// É a base de tudo: com a resposta achatada dá para procurar um campo pelo
// nome, procurar pelo valor que apareceu, e comparar duas coletas campo a
// campo. Parte portátil — não conhece nenhuma API específica.

import type { Caminho, TipoValor, ValorJson } from "./tipos.ts";

const PROFUNDIDADE_MAX = 12;
const ITENS_POR_LISTA = 50;

/**
 * Quando um item de lista tem uma destas chaves, o caminho usa a identidade
 * dele (`results[id=123].price`) no lugar da posição (`results[0].price`).
 *
 * Isso existe por um motivo prático: muita API devolve a mesma lista em ordem
 * diferente a cada chamada. Sem isso, a auditoria acusaria divergência em
 * todos os campos só porque os itens trocaram de lugar.
 */
export const CHAVES_DE_IDENTIDADE = [
  "id",
  "order_id",
  "item_id",
  "user_id",
  "claim_id",
  "shipment_id",
  "question_id",
  "code",
  "sku",
  "seller_sku",
  "key",
  "name",
];

export type OpcoesAchatar = {
  profundidadeMax?: number;
  itensPorLista?: number;
  chavesDeIdentidade?: string[];
};

/** Sufixo do campo sintético que guarda o tamanho de uma lista. */
export const SUFIXO_QUANTIDADE = "#quantidade";

const ISO_DATA = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}|$)/;

export function tipoDe(valor: unknown, caminho?: Caminho): TipoValor {
  if (caminho && caminho.endsWith(SUFIXO_QUANTIDADE)) return "quantidade";
  if (valor === null) return "nulo";
  if (Array.isArray(valor)) return valor.length === 0 ? "lista-vazia" : "quantidade";
  if (typeof valor === "boolean") return "booleano";
  if (typeof valor === "number") return "numero";
  if (typeof valor === "object") return "objeto-vazio";
  if (typeof valor === "string") return ISO_DATA.test(valor) ? "data" : "texto";
  return "texto";
}

/**
 * Percorre o JSON inteiro e devolve só as folhas, cada uma com seu caminho.
 *
 * Além das folhas de verdade, grava para cada lista um campo sintético
 * `caminho#quantidade` com o tamanho dela. É de propósito: "vieram 23 ou 20
 * pedidos?" é exatamente o tipo de divergência que a auditoria precisa pegar,
 * e sem esse campo o tamanho da lista passaria batido.
 */
export function achatar(raiz: unknown, opcoes: OpcoesAchatar = {}): Map<Caminho, ValorJson> {
  const saida = new Map<Caminho, ValorJson>();
  const profundidadeMax = opcoes.profundidadeMax ?? PROFUNDIDADE_MAX;
  const itensPorLista = opcoes.itensPorLista ?? ITENS_POR_LISTA;
  const identidade = opcoes.chavesDeIdentidade ?? CHAVES_DE_IDENTIDADE;
  const naPilha = new Set<object>();

  function rotuloDoItem(item: unknown, indice: number): string {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const chave of identidade) {
        const v = (item as Record<string, unknown>)[chave];
        if (typeof v === "string" || typeof v === "number") return `[${chave}=${v}]`;
      }
    }
    return `[${indice}]`;
  }

  function andar(valor: unknown, caminho: string, profundidade: number) {
    const chave = caminho || "«raiz»";

    if (valor === null || typeof valor !== "object") {
      saida.set(chave, valor as ValorJson);
      return;
    }
    if (naPilha.has(valor)) {
      saida.set(chave, "«referência circular»");
      return;
    }
    if (profundidade >= profundidadeMax) {
      saida.set(chave, "«profundidade máxima»");
      return;
    }

    naPilha.add(valor);
    try {
      if (Array.isArray(valor)) {
        saida.set(`${chave}${SUFIXO_QUANTIDADE}`, valor.length);
        if (valor.length === 0) {
          saida.set(chave, []);
          return;
        }
        const visiveis = valor.slice(0, itensPorLista);
        for (let i = 0; i < visiveis.length; i++) {
          andar(visiveis[i], `${caminho}${rotuloDoItem(visiveis[i], i)}`, profundidade + 1);
        }
        return;
      }

      const entradas = Object.entries(valor as Record<string, unknown>);
      if (entradas.length === 0) {
        saida.set(chave, {});
        return;
      }
      for (const [nome, v] of entradas) {
        andar(v, caminho ? `${caminho}.${nome}` : nome, profundidade + 1);
      }
    } finally {
      naPilha.delete(valor);
    }
  }

  andar(raiz, "", 0);
  return saida;
}

/**
 * Tira a identidade dos índices de lista, para agrupar campos equivalentes.
 * `results[id=123].price` e `results[id=999].price` viram `results[].price`.
 */
export function caminhoGenerico(caminho: Caminho): Caminho {
  return caminho.replace(/\[[^\]]*\]/g, "[]");
}

/** Só o último pedaço do caminho — normalmente é o nome do campo. */
export function ultimoSegmento(caminho: Caminho): string {
  const semQuantidade = caminho.endsWith(SUFIXO_QUANTIDADE)
    ? caminho.slice(0, -SUFIXO_QUANTIDADE.length)
    : caminho;
  const partes = semQuantidade.split(".");
  return (partes[partes.length - 1] ?? "").replace(/\[[^\]]*\]/g, "");
}

/** Todos os pedaços do caminho, sem os índices de lista e sem vazios. */
export function segmentos(caminho: Caminho): string[] {
  const semQuantidade = caminho.endsWith(SUFIXO_QUANTIDADE)
    ? caminho.slice(0, -SUFIXO_QUANTIDADE.length)
    : caminho;
  return semQuantidade
    .replace(/\[[^\]]*\]/g, ".")
    .split(".")
    .filter(Boolean);
}
