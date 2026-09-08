// Busca reversa dentro do catálogo.
//
// Duas entradas, os dois jeitos de perguntar quando o nome não bate:
//   - por TERMO  ("reputação") → quais campos da API falam disso?
//   - por VALOR  (23)          → qual campo trouxe esse número?

import { segmentos, ultimoSegmento } from "./achatar.ts";
import { expandir, GRUPOS_DE_SINONIMOS } from "./sinonimos.ts";
import type { CampoCatalogo, Catalogo, ResultadoBusca } from "./tipos.ts";

/** Minúsculas, sem acento, só letras e números. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Quebra `date_created` e `logisticType` em palavras soltas e normalizadas. */
function palavrasDe(texto: string): string[] {
  return normalizar(texto.replace(/([a-z0-9])([A-Z])/g, "$1 $2"))
    .split(" ")
    .filter(Boolean);
}

type Perfil = { finais: Set<string>; todas: Set<string>; textoDeExemplos: string };

function perfilar(campo: CampoCatalogo): Perfil {
  const finais = new Set(palavrasDe(ultimoSegmento(campo.caminho)));
  const todas = new Set<string>(finais);
  for (const seg of segmentos(campo.caminho)) {
    for (const palavra of palavrasDe(seg)) todas.add(palavra);
  }
  const textoDeExemplos = normalizar(campo.exemplos.filter((v) => typeof v === "string").join(" "));
  return { finais, todas, textoDeExemplos };
}

function pontuarVariante(perfil: Perfil, variante: string): { pontos: number; motivo: string } {
  if (perfil.finais.has(variante)) return { pontos: 100, motivo: "nome do campo" };

  for (const palavra of perfil.finais) {
    if (variante.length >= 4 && (palavra.startsWith(variante) || variante.startsWith(palavra))) {
      return { pontos: 70, motivo: "nome do campo parecido" };
    }
  }
  if (perfil.todas.has(variante)) return { pontos: 50, motivo: "caminho" };

  for (const palavra of perfil.todas) {
    if (variante.length >= 4 && palavra.includes(variante)) {
      return { pontos: 30, motivo: "caminho parecido" };
    }
  }
  if (variante.length >= 3 && perfil.textoDeExemplos.includes(variante)) {
    return { pontos: 18, motivo: "valor de exemplo" };
  }
  return { pontos: 0, motivo: "" };
}

export type OpcoesBusca = {
  /** Grupos extras de equivalência, somados ao dicionário padrão. */
  sinonimos?: string[][];
  limite?: number;
};

/**
 * Procura campos que falem do termo pedido — em português ou em inglês,
 * com ou sem acento, no nome do campo, no caminho ou no valor de exemplo.
 *
 * Acerto no nome exato vale mais que acerto por sinônimo: se `claims` existe,
 * ele ganha de um campo que só bate porque "reclamação" está no dicionário.
 */
export function buscarPorTermo(
  catalogo: Catalogo,
  consulta: string,
  opcoes: OpcoesBusca = {},
): ResultadoBusca[] {
  const grupos = opcoes.sinonimos
    ? [...GRUPOS_DE_SINONIMOS, ...opcoes.sinonimos]
    : GRUPOS_DE_SINONIMOS;
  const tokens = normalizar(consulta).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const achados: ResultadoBusca[] = [];

  for (const campo of catalogo.campos) {
    const perfil = perfilar(campo);
    let total = 0;
    const motivos: string[] = [];

    for (const token of tokens) {
      const variantes = expandir(token, grupos);
      let melhor = { pontos: 0, motivo: "", variante: "" };

      variantes.forEach((variante, posicao) => {
        const { pontos, motivo } = pontuarVariante(perfil, variante);
        // Sinônimo vale 80% do acerto direto — o nome literal manda.
        const ajustado = posicao === 0 ? pontos : Math.round(pontos * 0.8);
        if (ajustado > melhor.pontos) melhor = { pontos: ajustado, motivo, variante };
      });

      if (melhor.pontos > 0) {
        total += melhor.pontos;
        motivos.push(
          melhor.variante === token
            ? `"${token}" no ${melhor.motivo}`
            : `"${token}" → "${melhor.variante}" no ${melhor.motivo}`,
        );
      }
    }

    if (total > 0) {
      achados.push({ campo, pontos: total, motivo: motivos.join("; ") });
    }
  }

  achados.sort((a, b) => b.pontos - a.pontos || a.campo.caminho.localeCompare(b.campo.caminho));
  return achados.slice(0, opcoes.limite ?? 30);
}

export type OpcoesBuscaPorValor = {
  /** Margem para números, em fração. 0.02 aceita 2% de diferença. */
  toleranciaRelativa?: number;
  limite?: number;
};

/**
 * "A API me deu 23 em algum lugar — onde?" Procura o valor entre os exemplos
 * de todos os campos. Para números aceita uma margem; para texto, comparação
 * sem acento e sem diferenciar maiúsculas.
 */
export function buscarPorValor(
  catalogo: Catalogo,
  alvo: string | number,
  opcoes: OpcoesBuscaPorValor = {},
): ResultadoBusca[] {
  const tolerancia = opcoes.toleranciaRelativa ?? 0;
  const alvoNumero = typeof alvo === "number" ? alvo : Number(normalizar(String(alvo)));
  const alvoTexto = normalizar(String(alvo));
  const achados: ResultadoBusca[] = [];

  for (const campo of catalogo.campos) {
    let melhor = { pontos: 0, motivo: "" };

    for (const exemplo of campo.exemplos) {
      if (typeof exemplo === "number" && Number.isFinite(alvoNumero)) {
        if (exemplo === alvoNumero) {
          melhor = { pontos: 100, motivo: "valor idêntico" };
        } else if (
          melhor.pontos < 70 &&
          tolerancia > 0 &&
          Math.abs(exemplo - alvoNumero) <=
            Math.max(Math.abs(exemplo), Math.abs(alvoNumero)) * tolerancia
        ) {
          melhor = { pontos: 70, motivo: "valor dentro da margem" };
        }
        continue;
      }
      if (typeof exemplo === "string") {
        const texto = normalizar(exemplo);
        if (texto === alvoTexto) melhor = { pontos: 100, motivo: "valor idêntico" };
        else if (melhor.pontos < 50 && alvoTexto.length >= 2 && texto.includes(alvoTexto)) {
          melhor = { pontos: 50, motivo: "valor contém o texto" };
        }
      }
    }

    if (melhor.pontos > 0) achados.push({ campo, pontos: melhor.pontos, motivo: melhor.motivo });
  }

  achados.sort((a, b) => b.pontos - a.pontos || a.campo.caminho.localeCompare(b.campo.caminho));
  return achados.slice(0, opcoes.limite ?? 30);
}
