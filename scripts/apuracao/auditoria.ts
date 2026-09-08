// Auditoria por moda: várias coletas da mesma chamada, um valor eleito.
//
// O problema real: API de terceiro tem réplica, cache e consistência
// eventual. A mesma pergunta feita três vezes seguidas pode devolver 23, 20 e
// 23. O valor mais provável é 23 — e, mais importante que isso, o fato de ter
// divergido é a informação que a gente precisa ver.
//
// A auditoria não promete o número exato. Ela promete duas coisas: o valor
// mais provável e o quanto ele é confiável.

import { achatar, type OpcoesAchatar } from "./achatar.ts";
import type { Auditoria, Caminho, CampoAuditado, Confianca, ValorJson, Variante } from "./tipos.ts";

export type OpcoesAuditoria = OpcoesAchatar & {
  /** Margem para números, em fração. 0.01 trata 100 e 100,9 como o mesmo valor. */
  toleranciaRelativa?: number;
  /** Margem fixa para números. Vale junto com a relativa (a maior das duas). */
  toleranciaAbsoluta?: number;
  /**
   * Caminhos que não interessam auditar — normalmente carimbos de tempo e
   * ids de requisição, que mudam a cada chamada por natureza e só poluiriam
   * a lista de divergências.
   */
  ignorar?: (string | RegExp)[];
};

function deveIgnorar(caminho: Caminho, regras: (string | RegExp)[]): boolean {
  return regras.some((r) => (typeof r === "string" ? caminho.includes(r) : r.test(caminho)));
}

function chaveDeValor(valor: unknown): string {
  try {
    return JSON.stringify(valor) ?? "«indefinido»";
  } catch {
    return String(valor);
  }
}

function proximos(a: number, b: number, relativa: number, absoluta: number): boolean {
  const diferenca = Math.abs(a - b);
  if (diferenca <= absoluta) return true;
  if (relativa <= 0) return false;
  return diferenca <= Math.max(Math.abs(a), Math.abs(b)) * relativa;
}

type Grupo = { valor: ValorJson; votos: number; primeiraOrdem: number };

/**
 * Agrupa números que estão perto o bastante para contarem como o mesmo valor.
 * Dentro de cada grupo, o valor eleito é o que mais se repetiu exatamente;
 * havendo empate, a mediana do grupo.
 */
function agruparNumeros(
  valores: { valor: number; ordem: number }[],
  relativa: number,
  absoluta: number,
): Grupo[] {
  const ordenados = [...valores].sort((a, b) => a.valor - b.valor);
  const blocos: { valor: number; ordem: number }[][] = [];

  for (const item of ordenados) {
    const atual = blocos[blocos.length - 1];
    if (atual && proximos(atual[atual.length - 1].valor, item.valor, relativa, absoluta)) {
      atual.push(item);
    } else {
      blocos.push([item]);
    }
  }

  return blocos.map((bloco) => {
    const contagem = new Map<number, number>();
    for (const { valor } of bloco) contagem.set(valor, (contagem.get(valor) ?? 0) + 1);

    let eleito = bloco[Math.floor(bloco.length / 2)].valor; // mediana como desempate
    let melhor = 0;
    for (const [valor, vezes] of contagem) {
      if (vezes > melhor) {
        melhor = vezes;
        eleito = valor;
      }
    }

    return {
      valor: eleito,
      votos: bloco.length,
      primeiraOrdem: Math.min(...bloco.map((b) => b.ordem)),
    };
  });
}

function agruparOutros(valores: { valor: ValorJson; ordem: number }[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const { valor, ordem } of valores) {
    const chave = chaveDeValor(valor);
    const existente = mapa.get(chave);
    if (existente) existente.votos += 1;
    else mapa.set(chave, { valor, votos: 1, primeiraOrdem: ordem });
  }
  return Array.from(mapa.values());
}

function classificar(grupos: Grupo[], presenteEm: number, coletas: number): Confianca {
  if (grupos.length === 1 && presenteEm === coletas) return "unanime";
  const [primeiro, segundo] = grupos;
  if (segundo && segundo.votos === primeiro.votos) return "empate";
  if (primeiro.votos > coletas / 2) return "maioria";
  return "divergente";
}

/**
 * Compara as coletas campo a campo e elege cada valor pela moda.
 *
 * Um campo que faltou em alguma coleta conta como instável mesmo que os
 * valores presentes concordem: "às vezes vem, às vezes não" é justamente o
 * tipo de coisa que quebra integração em produção.
 */
export function auditar(coletas: unknown[], opcoes: OpcoesAuditoria = {}): Auditoria {
  const relativa = opcoes.toleranciaRelativa ?? 0;
  const absoluta = opcoes.toleranciaAbsoluta ?? 0;
  const ignorar = opcoes.ignorar ?? [];

  const achatadas = coletas.map((c) => achatar(c, opcoes));
  const caminhos = new Set<Caminho>();
  for (const mapa of achatadas) {
    for (const caminho of mapa.keys()) {
      if (!deveIgnorar(caminho, ignorar)) caminhos.add(caminho);
    }
  }

  const campos: CampoAuditado[] = [];

  for (const caminho of caminhos) {
    const observados: { valor: ValorJson; ordem: number }[] = [];
    let ausenteEm = 0;

    achatadas.forEach((mapa, ordem) => {
      if (mapa.has(caminho)) observados.push({ valor: mapa.get(caminho) as ValorJson, ordem });
      else ausenteEm += 1;
    });

    if (observados.length === 0) continue;

    const numericos = observados.filter(
      (o): o is { valor: number; ordem: number } =>
        typeof o.valor === "number" && Number.isFinite(o.valor),
    );
    const grupos =
      numericos.length === observados.length
        ? agruparNumeros(numericos, relativa, absoluta)
        : agruparOutros(observados);

    // Mais votos ganha; empate desempata por quem apareceu primeiro.
    grupos.sort((a, b) => b.votos - a.votos || a.primeiraOrdem - b.primeiraOrdem);

    const variantes: Variante[] = grupos.map((g) => ({ valor: g.valor, votos: g.votos }));

    campos.push({
      caminho,
      valor: grupos[0].valor,
      confianca: classificar(grupos, observados.length, coletas.length),
      votos: grupos[0].votos,
      presenteEm: observados.length,
      ausenteEm,
      variantes,
    });
  }

  campos.sort((a, b) => a.caminho.localeCompare(b.caminho, "pt-BR"));

  const assinaturas = coletas.map((c) => chaveDeValor(c));
  const respostasIdenticas = coletas.length > 1 && assinaturas.every((a) => a === assinaturas[0]);

  return {
    campos,
    instaveis: campos.filter((c) => c.confianca !== "unanime" || c.ausenteEm > 0),
    coletas: coletas.length,
    respostasIdenticas,
    tolerancia: { relativa, absoluta },
  };
}

/** Só o valor eleito de cada campo, no formato caminho → valor. */
export function valoresEleitos(auditoria: Auditoria): Record<Caminho, ValorJson> {
  const saida: Record<Caminho, ValorJson> = {};
  for (const campo of auditoria.campos) saida[campo.caminho] = campo.valor;
  return saida;
}
