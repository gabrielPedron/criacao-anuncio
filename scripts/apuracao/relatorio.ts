// Resumo em português da auditoria, para ler no terminal, no log ou na tela.

import type { Auditoria, CampoAuditado, Catalogo } from "./tipos.ts";

function mostrar(valor: unknown): string {
  if (typeof valor === "string")
    return valor.length > 60 ? `"${valor.slice(0, 60)}…"` : `"${valor}"`;
  if (valor === null) return "nulo";
  if (typeof valor === "object") return Array.isArray(valor) ? "[]" : "{}";
  return String(valor);
}

const ROTULO_CONFIANCA: Record<CampoAuditado["confianca"], string> = {
  unanime: "unânime",
  maioria: "maioria",
  empate: "empate",
  divergente: "divergente",
};

/** Uma linha explicando o campo, do jeito que a gente fala. */
export function explicarCampo(campo: CampoAuditado): string {
  const partes = [`${campo.caminho} = ${mostrar(campo.valor)}`];
  partes.push(`(${ROTULO_CONFIANCA[campo.confianca]}, ${campo.votos}/${campo.presenteEm})`);

  if (campo.variantes.length > 1) {
    const outras = campo.variantes
      .slice(1)
      .map((v) => `${mostrar(v.valor)}×${v.votos}`)
      .join(", ");
    partes.push(`— também veio: ${outras}`);
  }
  if (campo.ausenteEm > 0) partes.push(`— faltou em ${campo.ausenteEm} coleta(s)`);

  return partes.join(" ");
}

export function resumirAuditoria(auditoria: Auditoria): string {
  const linhas: string[] = [];
  const estaveis = auditoria.campos.length - auditoria.instaveis.length;

  linhas.push(
    `${auditoria.coletas} coleta(s) · ${auditoria.campos.length} campo(s) · ` +
      `${estaveis} estável(is), ${auditoria.instaveis.length} instável(is)`,
  );

  if (auditoria.respostasIdenticas) {
    linhas.push(
      "Ressalva: as coletas voltaram idênticas. Pode ser dado estável de verdade " +
        "ou cache devolvendo a mesma resposta — nesse caso a repetição não confirmou nada.",
    );
  }
  if (auditoria.tolerancia.relativa > 0 || auditoria.tolerancia.absoluta > 0) {
    linhas.push(
      `Números foram comparados com margem de ${auditoria.tolerancia.relativa * 100}% ` +
        `ou ${auditoria.tolerancia.absoluta} — valores dentro dela contam como iguais.`,
    );
  }

  if (auditoria.instaveis.length > 0) {
    linhas.push("", "Campos que não bateram entre as coletas:");
    for (const campo of auditoria.instaveis) linhas.push(`  · ${explicarCampo(campo)}`);
  }

  return linhas.join("\n");
}

export function resumirCatalogo(catalogo: Catalogo, limite = 40): string {
  const linhas = [`${catalogo.campos.length} campo(s) em ${catalogo.totalAmostras} amostra(s):`];
  for (const campo of catalogo.campos.slice(0, limite)) {
    const exemplo = campo.exemplos.length > 0 ? mostrar(campo.exemplos[0]) : "—";
    linhas.push(`  ${campo.caminho}: ${campo.tipos.join("|")} = ${exemplo}`);
  }
  if (catalogo.campos.length > limite) {
    linhas.push(`  … e mais ${catalogo.campos.length - limite} campo(s).`);
  }
  return linhas.join("\n");
}
