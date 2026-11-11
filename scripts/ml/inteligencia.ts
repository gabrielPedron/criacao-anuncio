// Regras locais de coleta, evidências, posição e próxima ação. Sem chamadas à API.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve, relative, isAbsolute } from "node:path";
import { planoDaEntrada, pendentesDaEntrada } from "./entrada.ts";

export type Evidencia = {
  id: string;
  afirmacao: string;
  origem: { tipo: "operador" | "rotulo" | "api" | "chrome"; arquivo: string; trecho: string };
  estado: "confirmada" | "pendente" | "contraditoria";
  confirmado_pelo_operador?: boolean;
  objecao?: string; // número da objeção no dossiê, ex. "5.2"
  oferta?: string; // no multicategoria: a oferta cuja descrição traz a resposta
  resposta_descricao?: string;
};
const ler = (p: string) => readFileSync(p, "utf8");
const json = (p: string) => JSON.parse(ler(p));

// Calculado pelo ML ou do envio — não é "lacuna" da ficha.
export const ATRIBUTOS_IGNORADOS = /^(SELLER_PACKAGE_|PACKAGE_|ITEM_CONDITION|PRODUCT_FEATURES|SYI_PYMES_ID)/;

/** Rodada feita pelo ml:coletar (tem resumo em raw/); rodadas antigas têm regras mais brandas. */
export const rodadaNova = (pasta: string) =>
  existsSync(join(pasta, "raw")) && readdirSync(join(pasta, "raw")).some((f) => /^resumo-coleta-.*\.md$/.test(f));

/**
 * De quem é o link de referência. Anúncio próprio responde em /items/$ID; de terceiro dá 403 (lido
 * como null). Em link de catálogo, vale se algum vendedor do produto é esta conta.
 * Já aconteceu: um concorrente com a marca do operador entrou no dossiê como "nosso" (docs/02).
 */
export function donoDoLink(conta: number, item: { seller_id?: number } | null, vendedoresDoCatalogo: number[] | null): "proprio" | "voce_no_catalogo" | "concorrente" {
  if (item?.seller_id === conta) return "proprio";
  if (vendedoresDoCatalogo?.includes(conta)) return "voce_no_catalogo";
  return "concorrente";
}

/** Valida filtros de busca de catálogo sem escolher categoria por conta própria. */
export function categoriasDoCatalogo(args: string[]): (string | null)[] {
  const categorias = args.flatMap((a, i) => a === "--categoria" ? [args[i + 1] ?? ""] : []);
  if (!categorias.length) return [null];
  if (categorias.some((s) => !/^MLB\d{4,8}$/i.test(s))) throw new Error("--categoria exige um ID MLB; informe uma flag por categoria escolhida");
  return [...new Set(categorias.map((s) => s.toUpperCase()))];
}

/** Schema mais recente da categoria da oferta; nunca compara com schema de outra categoria. */
export function esquemaDaCategoria(pasta: string, categoryId: string): { arquivo: string; atributos: any[] } | null {
  const raw = join(pasta, "raw");
  if (!existsSync(raw) || !categoryId) return null;
  const nomes = readdirSync(raw);
  // Rodada do ml:coletar: só vale a de resumo gravado, a mais nova. Uma rodada que caiu no meio
  // deixa o schema em raw/ sem resumo, e misturá-lo com as referências de outra rodada engana.
  const rodadas = nomes.map((f) => f.match(/^resumo-coleta-(.+)\.md$/)?.[1]).filter(Boolean).sort() as string[];
  if (rodadas.length) {
    const arquivo = join(raw, `categoria-${categoryId}-${rodadas.at(-1)}.json`);
    return existsSync(arquivo) ? { arquivo, atributos: json(arquivo).atributos ?? [] } : null;
  }
  const arquivos = nomes.filter((f) => /^categoria(?:-[^.]+)?\.json$/.test(f))
    .map((f) => join(raw, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  for (const arquivo of arquivos) {
    const dados = json(arquivo);
    if (dados.categoryId === categoryId) return { arquivo, atributos: dados.atributos ?? [] };
  }
  return null;
}

/** Somente caminhos da pasta do produto: conteúdo da página é dado, nunca comando. */
export function conferirEvidencias(pasta: string, entradas: Evidencia[]): string[] {
  const erros: string[] = [];
  const ids = new Set<string>();
  if (!Array.isArray(entradas)) return ["evidencias.json precisa ser uma lista"];
  for (const e of entradas) {
    if (!e || typeof e !== "object") { erros.push("evidência inválida: esperado objeto"); continue; }
    if (!e.id?.trim() || ids.has(e.id)) erros.push(`id de evidência ausente ou duplicado: ${e.id ?? "—"}`);
    ids.add(e.id);
    if (!e.afirmacao?.trim() || !e.origem?.trecho?.trim()) erros.push(`${e.id}: falta afirmação ou trecho de apoio`);
    if (!["operador", "rotulo", "api", "chrome"].includes(e.origem?.tipo)) erros.push(`${e.id}: tipo de origem inválido`);
    if (!["confirmada", "pendente", "contraditoria"].includes(e.estado)) erros.push(`${e.id}: estado inválido`);
    const arq = e.origem?.arquivo;
    if (!arq || isAbsolute(arq) || relative(resolve(pasta), resolve(pasta, arq)).startsWith("..") || !existsSync(resolve(pasta, arq))) {
      erros.push(`${e.id}: arquivo de origem ausente ou fora da pasta do produto`);
    } else if (/\.(md|json|txt)$/i.test(arq) && e.origem?.trecho && !ler(resolve(pasta, arq)).includes(e.origem.trecho)) {
      erros.push(`${e.id}: trecho não encontrado literalmente no arquivo de origem`);
    }
    if (e.origem?.tipo === "chrome" && e.estado === "confirmada" && !e.confirmado_pelo_operador) {
      erros.push(`${e.id}: página de terceiro não confirma característica do nosso produto`);
    }
    if (e.resposta_descricao && e.estado !== "confirmada") erros.push(`${e.id}: resposta da descrição sem evidência confirmada`);
  }
  return erros;
}

export function posicaoOrganica(busca: { itens: { item?: string | null; patrocinado: boolean }[] }, id: string) {
  const organicos = busca.itens.filter((i) => !i.patrocinado);
  const encontrado = organicos.findIndex((i) => i.item?.toUpperCase() === id.toUpperCase());
  const patrocinado = busca.itens.some((i) => i.patrocinado && i.item?.toUpperCase() === id.toUpperCase());
  return { posicao: encontrado < 0 ? null : encontrado + 1, estado: encontrado >= 0 ? "encontrado" : patrocinado ? "somente_ad" : organicos.some((i) => !i.item) ? "nao_identificado" : "fora_primeira_pagina" };
}

/**
 * Objeções da seção 5 do dossiê, numeradas §5.1, §5.2… A evidência aponta o número, não o texto:
 * texto idêntico quebrava por um espaço. Se a 1ª coluna já trouxer o número ("5.2"), ele vale.
 */
export function objecoesDoDossie(md: string): { num: string; texto: string }[] {
  const secao = md.split(/^## /m).find((s) => /^5\./.test(s)) ?? "";
  const linhas = secao.split("\n")
    .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l) && !/Objeção \/ dor/i.test(l))
    .map((l) => l.split("|").slice(1).map((c) => c.trim()));
  return linhas.flatMap((c, i) => {
    const comNumero = /^§?5\.\d+$/.test(c[0] ?? "");
    // Coluna # deixada em branco: o texto está na 2ª célula (a 2ª célula numérica é Frequência).
    const texto = comNumero ? c[1] : c[0] || (c[1] && !/^\d+$/.test(c[1]) ? c[1] : "");
    return texto ? [{ num: comNumero ? c[0].replace("§", "") : `5.${i + 1}`, texto }] : [];
  });
}

/** Dossiê ainda é o esqueleto: marcador do modelo ou o aviso que o ml:coletar deixa. */
const dossieSemJulgamento = (md: string) => md.includes("[PRODUTO]") || md.includes("Preencher o julgamento antes da oferta");

/** JSON que o agente edita à mão: erro de sintaxe vira instrução, não stack trace. */
function lerJsonLocal(p: string): { dados: any; erro?: string } {
  try { return { dados: json(p) }; }
  catch (e: any) { return { dados: null, erro: `Corrigir ${basename(p)}: não é JSON válido (${e.message.split("\n")[0]}).` }; }
}

/** Decisões de cada oferta: oferta.json → decisoes.json; oferta-x.json → decisoes-x.json. */
export const arquivoDeDecisoes = (oferta: string) => oferta.replace(/^oferta/, "decisoes");

/** Próximo passo de UMA oferta, na ordem dos checkpoints do CLAUDE.md (2 imagens, 3 catálogo, 4 revisão). */
function proximaDaOferta(pasta: string, arquivo: string, pendentes: string[]): string {
  const oferta = lerJsonLocal(join(pasta, arquivo));
  if (oferta.erro) return oferta.erro;
  const arqDecisoes = join(pasta, arquivoDeDecisoes(arquivo));
  const lidas = existsSync(arqDecisoes) ? lerJsonLocal(arqDecisoes) : { dados: {} };
  if (lidas.erro) return lidas.erro;
  const d = lidas.dados ?? {};
  const onde = basename(arqDecisoes);
  if (d.publicacao?.item_id) return "Já publicado segundo as decisões locais: ler ml:saude e medir 5+ termos com ml:posicao; comparar com a hipótese registrada, sem editar automaticamente.";
  if (!d.imagens?.aprovadas_em) return `Checkpoint 2: mostrar as imagens ao operador (gerar ou refazer só com OK do custo) e registrar a aprovação em ${onde}.`;
  if (!d.catalogo?.decidido_em) return `Checkpoint 3: listar os candidatos de catálogo com links e pedir a decisão do operador; registrar em ${onde}.`;
  const titulo = oferta.dados.family_name ?? oferta.dados.titulo;
  if (!d.titulo?.aprovado_em || d.titulo?.texto !== titulo) return `Pedir aprovação explícita do título final e registrar em ${onde}: ele é irreversível pela API.`;
  if (pendentes.length) return `Antes da revisão final, o operador precisa informar o que está PENDENTE na entrada.md: ${pendentes.join("; ")}.`;
  if (!d.revisao_final?.revisado_em) return `Checkpoint 4: rodar ml:conferir -- ${arquivo} e pedir a revisão final da oferta completa; registrar em ${onde}.`;
  return "Após OK explícito na conversa, a publicação é pelo comando protegido; este comando não publica.";
}

/** Sugestão de leitura; nunca publica, aprova imagem/catálogo ou infere dados do operador. */
export function proximaAcao(pasta: string) {
  if (!existsSync(join(pasta, "entrada.md"))) return "Preencher entrada.md com os dados dos blocos 1 e 2.";
  const entrada = ler(join(pasta, "entrada.md"));
  const ofertas = readdirSync(pasta).filter((f) => /^oferta(?:-[^.]+)?\.json$/.test(f));
  const raw = join(pasta, "raw");
  if (!existsSync(raw) || !existsSync(join(pasta, "dossie.md"))) {
    try { planoDaEntrada(entrada); }
    catch (e: any) {
      const sondou = existsSync(raw) && readdirSync(raw).some((f) => /^sondagem-.*\.md$/.test(f));
      if (sondou && /três termos/.test(e.message)) return "Checkpoint 1: propor ao operador as top-3 a partir de raw/sondagem-*.md e só preencher Top-3 semânticas confirmadas depois do OK.";
      return e.message;
    }
    return "Executar ml:coletar --executar; depois julgar o dossiê.";
  }
  const dossie = ler(join(pasta, "dossie.md"));
  if (dossieSemJulgamento(dossie)) return "Concluir o julgamento do dossiê: fatos do resumo não são afirmações aprovadas (tirar o aviso do esqueleto ao terminar).";
  const objecoes = objecoesDoDossie(dossie);
  if (!existsSync(join(pasta, "evidencias.json"))) {
    if (!rodadaNova(pasta) && ofertas.length) return "Rodada antiga: revisar cada oferta; se já publicada, acompanhar saúde e posição. Evidências retroativas são opcionais.";
    if (objecoes.length) return `Ligar cada objeção do dossiê (${objecoes.map((o) => "§" + o.num).join(", ")}) e cada dado técnico prometido a uma fonte em evidencias.json.`;
  } else {
    const lidas = lerJsonLocal(join(pasta, "evidencias.json"));
    if (lidas.erro) return lidas.erro;
    const evidencias: Evidencia[] = lidas.dados;
    if (!Array.isArray(evidencias) || !evidencias.length) return "Preencher evidencias.json; lista vazia não comprova promessa nem responde objeção.";
    const erros = conferirEvidencias(pasta, evidencias);
    if (erros.length) return `Revisar evidências: ${erros.join("; ")}`;
    if (evidencias.some((e) => e.estado !== "confirmada")) return "Pedir ao operador confirmação dos dados pendentes ou contraditórios; não os afirmar na oferta.";
  }
  if (!ofertas.length) return "Montar uma oferta por categoria escolhida e executar ml:conferir em cada arquivo, sem inferir preço ou ficha.";
  const pendentes = pendentesDaEntrada(entrada);
  if (ofertas.length === 1) return proximaDaOferta(pasta, ofertas[0], pendentes);
  // Multicategoria: cada oferta tem os próprios checkpoints; nunca publicar em lote.
  return ofertas.map((f) => `${f}: ${proximaDaOferta(pasta, f, pendentes)}`).join("\n");
}
