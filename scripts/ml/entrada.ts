// Leitura da ficha produtos/<slug>/entrada.md. Só texto: não chama a API nem infere valores.

export type Plano = { categoria: string; categorias: string[]; termos: string[]; referencias: string[]; avisos: string[] };

const campo = (md: string, nome: string) => md.match(new RegExp(`^[-*] \\*\\*${nome}(?::\\*\\*\\s*|\\*\\*[^:\\n]*:\\s*)(.*)$`, "mi"))?.[1]?.trim() ?? "";

/** Somente IDs escritos pelo operador; não inferir categoria a partir de link ou concorrente. */
export function categoriasDaEntrada(md: string): string[] {
  const principal = campo(md, "Categoria");
  if (!/^MLB\d{4,8}$/i.test(principal)) throw new Error("a categoria principal como ID MLB (ex.: MLB123456) no campo **Categoria** da entrada.md");
  const texto = campo(md, "Categorias adicionais aprovadas");
  if (!texto || /^nenhuma$/i.test(texto)) return [principal.toUpperCase()];
  const adicionais = texto.split(/[,;]/).map((s) => s.trim());
  if (adicionais.some((s) => !/^MLB\d{4,8}$/i.test(s))) throw new Error("categorias adicionais aprovadas devem ser IDs MLB separados por vírgula, ou 'nenhuma'");
  const categorias = [principal, ...adicionais].map((s) => s.toUpperCase());
  if (new Set(categorias).size !== categorias.length) throw new Error("categoria repetida na entrada.md");
  return categorias;
}

/** Nome do produto no título da ficha ("# Ficha de entrada — X"); vazio se ainda for o modelo. */
export function nomeDoProduto(md: string): string {
  const nome = md.match(/^# Ficha de entrada — (.+)$/m)?.[1]?.trim() ?? "";
  return /^\[/.test(nome) ? "" : nome;
}

/**
 * Entrada humana é livre: não adivinhar categoria nem transformar números em termos.
 * Trava só o que é checkpoint (categoria em ID e top-3 confirmadas, na coleta completa) e link de
 * fora do ML. Sem os 2 links ou sem a pesquisa do operador a coleta segue, com aviso (CLAUDE.md).
 */
export function planoDaEntrada(md: string, etapa: "sondagem" | "coleta" = "coleta"): Plano {
  let categorias: string[] = [];
  const faltam: string[] = [];
  const avisos: string[] = [];
  try { categorias = categoriasDaEntrada(md); }
  catch (e: any) { if (etapa === "coleta") faltam.push(e.message); }
  const categoria = categorias[0] ?? "";
  const bloco = md.match(/^[-*] \*\*Concorrentes[^\n]*\*\*[^\n]*\n([\s\S]*?)(?=^[-*] \*\*|^## |$(?![\s\S]))/mi)?.[1] ?? "";
  const referencias = [...bloco.matchAll(/^\s+-\s+(https:\/\/[^\s]+)/gm)].map((m) => m[1].replace(/[),.;]+$/, ""));
  // Somente termos explicitamente aprovados entram na coleta completa.
  const termos = campo(md, "Top-3 semânticas confirmadas").split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  if (referencias.some((u) => {
    try { const host = new URL(u).hostname; return host !== "mercadolivre.com.br" && !host.endsWith(".mercadolivre.com.br"); }
    catch { return true; }
  })) faltam.push("links HTTPS do Mercado Livre, sem outros domínios");
  const termosOk = termos.length === 3 && !termos.some((t) => /PENDENTE|\[|\]/i.test(t));
  if (etapa === "coleta" && !termosOk) faltam.push("três termos aprovados em Top-3 semânticas confirmadas (rode antes a sondagem: --sondar)");
  if (faltam.length) throw new Error("Coleta parada: faltam " + faltam.join("; ") + ". Não inferi valores.");
  if (referencias.length < 2) avisos.push(`só ${referencias.length} link(s) validado(s) em Concorrentes: a coleta segue, mas o resultado fica pior sem 2 ou mais`);
  const semantica = campo(md, "Semântica");
  if (!semantica || /^\[|não tenho|nenhuma|PENDENTE/i.test(semantica)) avisos.push("sem a pesquisa de semântica do operador: o título fica mais fraco (só sugestões e busca do ML, sem volume)");
  return { categoria, categorias, termos: termosOk ? termos : [], referencias, avisos };
}

/**
 * O que ainda está PENDENTE no entrada.md. Linha de cabeçalho ("**Ainda PENDENTE:**") traz os itens
 * da lista logo abaixo; item riscado (~~) já foi resolvido; a frase de instrução do modelo não conta.
 */
export function pendentesDaEntrada(md: string): string[] {
  const linhas = md.split("\n");
  const out: string[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!/PENDENTE/.test(l) || /~~/.test(l) || /Campo vazio fica/.test(l)) continue;
    if (/PENDENTE[^:]*:\**\s*$/.test(l.trim())) {
      for (let j = i + 1; j < linhas.length && /^\s*-/.test(linhas[j]); j++) {
        if (!/~~/.test(linhas[j])) out.push(linhas[j].replace(/^\s*-\s*/, "").trim());
      }
      continue;
    }
    out.push(l.replace(/^[\s>*|-]+/, "").trim());
  }
  return out;
}
