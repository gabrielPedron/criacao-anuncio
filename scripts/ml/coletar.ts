// Coleta assistida, só leitura, em dois momentos (docs/02 e docs/18):
//   1. sondagem: sugestões e 1ª página da busca, para o agente propor as top-3 (checkpoint 1);
//   2. coleta completa: só com as top-3 confirmadas na entrada.md.
// Nunca decide equivalência por semelhança: os links validados pelo operador ancoram a coleta.
//
//   npm run ml:coletar -- produtos/<slug>                        prévia, não lê nada
//   npm run ml:coletar -- produtos/<slug> --sondar ["termo" …]   sondagem (sem termos: o nome do produto)
//   npm run ml:coletar -- produtos/<slug> --executar             coleta completa
//   --sem-chrome   para quem não tem o Google Chrome: só API, e a semântica fica bem mais fraca
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { planoDaEntrada, categoriasDaEntrada, nomeDoProduto } from "./entrada.ts";
import { ATRIBUTOS_IGNORADOS, donoDoLink, posicaoOrganica } from "./inteligencia.ts";
import { idsDoLink } from "./chrome.ts";
import { morrer, anunciosDaConta } from "./api.js";
import { args } from "../cli.ts";

const pasta = resolve(args[0] ?? "");
if (!args[0] || args[0].startsWith("--") || !existsSync(join(pasta, "entrada.md"))) {
  morrer(new Error('Uso: npm run ml:coletar -- produtos/<slug> [--sondar ["termo" …] | --executar] [--sem-chrome]. Falta entrada.md.'));
}
const sondar = args.includes("--sondar");
const executar = args.includes("--executar");
const chrome = !args.includes("--sem-chrome");
if (sondar && executar) morrer(new Error("Use --sondar (antes do checkpoint 1) ou --executar (depois), não os dois."));

const md = readFileSync(join(pasta, "entrada.md"), "utf8");
const raw = join(pasta, "raw");
const rodada = new Date().toISOString().replace(/[:.]/g, "-");
const arquivo = (nome: string) => join(raw, `${nome}-${rodada}.json`);
const lerJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rodar = (script: string, params: string[]) => {
  console.log(`Lendo ${script}…`);
  const r = spawnSync(process.execPath, [join(import.meta.dirname, script), ...params], { encoding: "utf8", stdio: "pipe" });
  if (r.status !== 0 || r.error) throw new Error(`${script} falhou. ${r.stderr || r.error || r.stdout}`);
};

/** Fonte complementar (tendências, fotos): a falha vira aviso no resumo em vez de derrubar a rodada. */
const complementares: string[] = [];
const rodarComplementar = (script: string, params: string[]) => {
  try { rodar(script, params); return true; }
  catch (e: any) {
    complementares.push(`${script} ${params[0]} não leu: ${e.message.split("\n")[0].slice(0, 160)}`);
    console.log(`! ${complementares.at(-1)}`);
    return false;
  }
};

/** Anúncios da conta, lidos uma vez só; sem API (token vencido, rede) a marcação fica "não conferida". */
let daContaLido: Promise<{ conta: number; ids: string[] } | null> | null = null;
const daConta = () => (daContaLido ??= anunciosDaConta().catch(() => null));

/** Onde os anúncios da conta aparecem na 1ª página: posição orgânica, só Ad ou ausente. */
function seusNaBusca(b: any, conta: { ids: string[] } | null) {
  if (!conta) return "**Seus anúncios:** não conferido (a API da conta não respondeu).";
  const seus = [...new Set(b.itens.map((i: any) => i.item).filter((id: string) => conta.ids.includes(id)))] as string[];
  if (!seus.length) return `**Seus anúncios:** nenhum na 1ª página (${b.itens.length} cards lidos; card de catálogo só mostra quem ganha).`;
  return "**Seus anúncios:** " + seus.map((id) => {
    const r = posicaoOrganica(b, id);
    return `${id} — ${r.posicao ? `${r.posicao}ª orgânica` : r.estado === "somente_ad" ? "só como Ad" : r.estado}`;
  }).join("; ") + ".";
}

/** 1ª página de cada termo, como o comprador vê. Total de resultados é concorrência, não volume. */
const tabelaDaBusca = (buscas: any[], origem: string, conta: { ids: string[] } | null) => [
  `## Busca (${origem})`, "",
  ...buscas.flatMap((b) => [
    `### "${b.termo}" — ${b.resultados ?? "total não lido"}`, "",
    seusNaBusca(b, conta), "",
    "| Pos. | Anúncio | Preço | Ad | ID |", "|---:|---|---:|:---:|---|",
    ...b.itens.slice(0, 20).map((i: any) =>
      `| ${i.posicao} | ${String(i.titulo).replaceAll("|", "/").slice(0, 80)} | ${i.preco ?? "—"} | ${i.patrocinado ? "Ad" : ""} | ${i.item ?? i.catalogo ?? "—"}${conta?.ids.includes(i.item) ? " **(seu)**" : ""} |`), "",
  ]),
];
const tabelaDeSugestoes = (sugestoes: Record<string, unknown>, origem: string) => [
  `## Sugestões do ML (${origem})`, "", "| Termo | Sugestões (ordem recebida, sem volume) |", "|---|---|",
  ...Object.entries(sugestoes).map(([termo, lista]) => `| ${termo} | ${Array.isArray(lista) ? lista.join("; ") : String(lista)} |`), "",
];

try {
  if (sondar) {
    const plano = planoDaEntrada(md, "sondagem");
    const sementes = args.slice(1).filter((a) => !a.startsWith("--"));
    if (!sementes.length && nomeDoProduto(md)) sementes.push(nomeDoProduto(md));
    if (!sementes.length) throw new Error('Sem termo para sondar: passe os termos (--sondar "termo 1" "termo 2") ou preencha o título da entrada.md.');
    plano.avisos.forEach((a) => console.log(`! ${a}`));
    const categorias = chrome ? [] : categoriasDaEntrada(md); // sem Chrome, só a tendência da categoria serve de fonte
    mkdirSync(raw, { recursive: true });
    const linhas = [`# Sondagem — ${rodada}`, "", `Termos de partida: ${sementes.join("; ")}`, ""];
    if (chrome) {
      const sug = arquivo("sugestoes"), bus = arquivo("busca");
      rodar("sugestoes.ts", [...sementes, "--salvar", sug]);
      rodar("busca.ts", [...sementes, "--salvar", bus]);
      linhas.push(...tabelaDeSugestoes(lerJson(sug).sugestoes ?? {}, `raw/${basename(sug)}`), ...tabelaDaBusca(lerJson(bus).buscas ?? [], `raw/${basename(bus)}`, await daConta()));
    } else {
      // Sem Chrome sobra só a tendência da categoria, que em categoria ampla quase não ajuda.
      for (const cat of categorias) {
        const sem = arquivo(`semantica-${cat}`);
        rodar("semantica.js", [cat, "--salvar", sem]);
        linhas.push(`## Tendências da categoria ${cat} (raw/${basename(sem)})`, "", lerJson(sem).termos.join("; "), "");
      }
    }
    linhas.push("Próximo passo: propor as top-3 ao operador (checkpoint 1) e só depois preencher",
      "**Top-3 semânticas confirmadas** na entrada.md. A sondagem não aprova termo nenhum.", "");
    const resumo = join(raw, `sondagem-${rodada}.md`);
    writeFileSync(resumo, linhas.join("\n"));
    console.log(`Sondagem salva: ${resumo}`);
  } else if (!executar) {
    // Prévia: diz o que cada momento faria, sem ler nem gravar nada.
    const sonda = planoDaEntrada(md, "sondagem");
    console.log(`Sondagem (--sondar): ${chrome ? "sugestões e 1ª página da busca pelo Chrome" : "tendências da categoria (sem Chrome)"}` +
      ` de "${nomeDoProduto(md) || "termos passados no comando"}". Não precisa de top-3.`);
    sonda.avisos.forEach((a) => console.log(`! ${a}`));
    try {
      const plano = planoDaEntrada(md, "coleta");
      console.log(`Coleta completa (--executar): pronta. Categorias ${plano.categorias.join(", ")}; termos ${plano.termos.join("; ")}; ${plano.referencias.length} referência(s).`);
    } catch (e: any) {
      console.log(`Coleta completa (--executar) ainda não: ${e.message.replace(/^Coleta parada: /, "")}`);
    }
    console.log("Prévia apenas: nada foi lido nem gravado.");
  } else {
    const plano = planoDaEntrada(md, "coleta");
    const apiRefs = plano.referencias.filter((u) => { const ids = idsDoLink(u); return !!(ids.item || ids.catalogo); });
    const soPagina = plano.referencias.filter((u) => !apiRefs.includes(u));
    console.log(`Categorias escolhidas: ${plano.categorias.join(", ")}. Termos confirmados: ${plano.termos.join("; ")}. Referências: ${plano.referencias.length}.`);
    console.log("Fontes: API para categoria, tendências, referências e fotos" + (chrome ? "; Chrome para sugestões, busca e páginas" : "; Chrome desligado (--sem-chrome)"));
    plano.avisos.forEach((a) => console.log(`! ${a}`));
    if (soPagina.length && !chrome) console.log(`! ${soPagina.length} link(s) /up/ sem ID ficam de fora: só o Chrome lê essas páginas`);
    mkdirSync(raw, { recursive: true });
    const caminhos: Record<string, string> = {};
    for (const cat of plano.categorias) {
      caminhos[cat] = arquivo(`categoria-${cat}`);
      rodar("categoria.js", [cat, "--salvar", caminhos[cat]]);
      caminhos[`semantica-${cat}`] = arquivo(`semantica-${cat}`);
      if (!rodarComplementar("semantica.js", [cat, "--salvar", caminhos[`semantica-${cat}`]])) delete caminhos[`semantica-${cat}`];
    }
    if (apiRefs.length) {
      caminhos.referencias = arquivo("referencias");
      rodar("referencia.ts", [...apiRefs, "--salvar", caminhos.referencias]);
    }
    const refs = caminhos.referencias ? lerJson(caminhos.referencias).refs ?? [] : [];
    if (refs.length !== apiRefs.length) throw new Error("A API não leu todos os links de referência; confira raw/ antes do dossiê.");
    for (const r of refs.filter((r: any) => r.catalog_product_id)) {
      rodarComplementar("fotos.js", [r.catalog_product_id, "--dir", join(raw, "fotos", r.catalog_product_id)]);
    }
    if (chrome) {
      caminhos.sugestoes = arquivo("sugestoes");
      rodar("sugestoes.ts", [...plano.termos, "--salvar", caminhos.sugestoes]);
      caminhos.busca = arquivo("busca");
      rodar("busca.ts", [...plano.termos, "--salvar", caminhos.busca]);
      if (plano.referencias.length) {
        caminhos.paginas = arquivo("paginas");
        rodar("pagina.ts", [...plano.referencias, "--salvar", caminhos.paginas]);
      }
    }
    const schemas = plano.categorias.map((id) => ({ id, dados: lerJson(caminhos[id]) }));
    if (schemas.some(({ id, dados }) => dados.categoryId !== id)) throw new Error("A API devolveu um schema diferente da categoria solicitada; resumo não gerado.");
    const paginas = caminhos.paginas ? lerJson(caminhos.paginas).paginas ?? [] : [];
    if (caminhos.paginas && paginas.length !== plano.referencias.length) throw new Error("Nem todas as páginas foram lidas; confira raw/ antes do dossiê.");
    // Link /up/ só tem o id do anúncio na página: o dono sai da lista de anúncios da conta.
    const contaLida = paginas.length ? await daConta() : null;
    const donoDaPagina = new Map<string, string>();
    paginas.forEach((p: any, i: number) => {
      const u = plano.referencias[i];
      if (soPagina.includes(u) && p.item && contaLida) donoDaPagina.set(u, donoDoLink(contaLida.conta, contaLida.ids.includes(p.item) ? { seller_id: contaLida.conta } : null, null));
    });
    const daContaNosLinks = [...refs.filter((r: any) => r.dono && r.dono !== "concorrente").map((r: any) => r.url), ...[...donoDaPagina].filter(([, d]) => d !== "concorrente").map(([u]) => u)];
    if (daContaNosLinks.length) complementares.push(`${daContaNosLinks.length} link(s) de referência são desta conta: se o operador disse outra coisa, parar e perguntar antes do dossiê`);
    const origem = (nome: string) => caminhos[nome] ? `raw/${basename(caminhos[nome])}` : "não coletado";
    const cobertura = schemas.flatMap(({ id, dados }) => [
      `### ${id} (${origem(id)})`, "", "| Atributo do schema | Exigência | Referências API que preenchem |", "|---|---|---:|",
      ...(dados.atributos ?? []).filter((a: any) => !ATRIBUTOS_IGNORADOS.test(a.id))
        .map((a: any) => `| ${a.id} | ${a.tags?.required ? "obrigatório" : "opcional"} | ${refs.length ? `${refs.filter((r: any) => (r.atributos ?? []).some((x: any) => x.id === a.id)).length}/${refs.length}` : "sem referência API"} |`), "",
    ]);
    const linhas = [
      `# Resumo factual da coleta — ${rodada}`, "", "Não é dossiê final: equivalência, objeções e promessas exigem julgamento humano.", "",
      `Categorias escolhidas: ${plano.categorias.join(", ")} (schemas abaixo; uma oferta por categoria)`,
      `Termos confirmados pelo operador: ${plano.termos.join("; ")}`, "",
      ...([...plano.avisos, ...complementares].length ? ["**Avisos desta rodada:**", ...[...plano.avisos, ...complementares].map((a) => `- ${a}`), ""] : []),
      `## Referências (${origem("referencias")})`, "", "| Link validado | De quem é | Catálogo | Atributos preenchidos | Perguntas lidas |", "|---|---|---|---:|---:|",
      ...refs.map((r: any) => `| ${r.url} | ${r.dono ?? "—"} | ${r.catalog_product_id ?? "—"} | ${(r.atributos ?? []).length} | ${(r.perguntas ?? []).length} |`),
      ...soPagina.map((u) => `| ${u} | ${donoDaPagina.get(u) ?? "—"} | somente página (${chrome ? origem("paginas") : "não coletado"}) | — | — |`), "",
      ...(caminhos.busca ? tabelaDaBusca(lerJson(caminhos.busca).buscas ?? [], origem("busca"), await daConta()) : ["## Busca", "", "Não coletada (--sem-chrome).", ""]),
      ...(caminhos.sugestoes ? tabelaDeSugestoes(lerJson(caminhos.sugestoes).sugestoes ?? {}, origem("sugestoes")) : []),
      ...plano.categorias.flatMap((cat) => [`## Tendências da categoria ${cat} (${origem(`semantica-${cat}`)})`, "", caminhos[`semantica-${cat}`] ? (lerJson(caminhos[`semantica-${cat}`]).termos ?? []).join("; ") : "não lidas", ""]),
      `## Cobertura das fichas por categoria`, "",
      ...cobertura,
      `Páginas e avaliações: ${origem("paginas")}. Fotos dos concorrentes de catálogo: raw/fotos/.`,
      "Confira rótulo, ficha e pertinência das avaliações antes de transformar dados em afirmações.", "",
    ];
    const resumo = join(raw, `resumo-coleta-${rodada}.md`);
    writeFileSync(resumo, linhas.join("\n"));
    console.log(`Resumo factual salvo: ${resumo}`);
    if (!existsSync(join(pasta, "dossie.md"))) {
      const template = readFileSync(resolve(import.meta.dirname, "../../coleta/TEMPLATE-dossie.md"), "utf8");
      writeFileSync(join(pasta, "dossie.md"), template + `\n\n## Fontes desta rodada\nConsulte ${origem("referencias")} e ${basename(resumo)}. Preencher o julgamento antes da oferta.\n`);
      console.log("Esqueleto dossie.md criado; ainda exige interpretação.");
    }
  }
} catch (e: any) { morrer(e); }
