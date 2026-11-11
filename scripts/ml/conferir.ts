// Conferência antes da revisão final (checkpoint 4): o que falta na oferta ANTES de publicar.
// Nasceu de um piloto que subiu sem garantia e sem um atributo técnico e teve de ser editado
// depois — e toda edição pode mexer no ranqueamento. Só lê arquivos locais; não chama a API.
//
//   npm run ml:conferir -- produtos/<slug>                 (usa oferta.json)
//   npm run ml:conferir -- produtos/<slug>/oferta-x.json
//
// Lê: a oferta, raw/categoria.json (schema real), raw/referencias*.json (ficha dos concorrentes),
// dossie.md §5 (objeções) e entrada.md (o que ainda está PENDENTE).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { morrer } from "./api.js";
import { args } from "../cli.ts";
import { carregarOferta } from "./publicar.ts";
import { esquemaDaCategoria, conferirEvidencias, rodadaNova as ehRodadaNova, ATRIBUTOS_IGNORADOS as IGNORAR, objecoesDoDossie, type Evidencia } from "./inteligencia.ts";
import { categoriasDaEntrada, pendentesDaEntrada } from "./entrada.ts";

const alvo = args.find((a) => !a.startsWith("--"));
if (!alvo) morrer(new Error("Uso: npm run ml:conferir -- produtos/<slug> [ou o caminho do oferta-x.json]"));
const pasta = alvo!.endsWith(".json") ? dirname(resolve(alvo!)) : resolve(alvo!);
const lerJson = (arq: string) => JSON.parse(readFileSync(arq, "utf8"));
const rodadaNova = ehRodadaNova(pasta);
const arquivoDaOferta = alvo!.endsWith(".json") ? basename(alvo!) : "oferta.json";

let erros = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const aviso = (m: string) => console.log(`  ! ${m}`);
const erro = (m: string) => { erros++; console.log(`  ✗ ${m}`); };

console.log(`\nConferência antes da revisão final — ${alvo}\n`);

// 1. Campos obrigatórios da oferta (os mesmos que o ml:publicar exige)
let o: any;
try { o = carregarOferta(alvo!); ok("oferta completa: preço, estoque, tipo, embalagem, garantia, descrição"); }
catch (e: any) { erro(e.message); o = existsSync(join(pasta, "oferta.json")) ? lerJson(join(pasta, "oferta.json")) : null; }
if (!o) morrer(new Error("Sem oferta para conferir."));

const temos = new Map<string, string>((o.atributos ?? []).map((a: any) => [a.id, a.value_name]));

// 2. Título final (o ML acrescenta COLOR + FINISH à família — docs/16)
const familia = o.family_name ?? o.titulo ?? "";
const final = [familia, temos.get("COLOR"), temos.get("FINISH")].filter(Boolean).join(" ");
console.log(`\nTítulo\n  família (${familia.length}/60): ${familia}\n  como vai aparecer (${final.length}): ${final}`);
if (familia.length > 60) erro("família acima de 60 caracteres");

// 3. Ficha: schema da categoria da OFERTA × o que preenchemos × concorrentes.
console.log("\nFicha técnica");
const arqEntrada = join(pasta, "entrada.md");
if (existsSync(arqEntrada)) {
  try {
    const aprovadas = categoriasDaEntrada(readFileSync(arqEntrada, "utf8"));
    if (!aprovadas.includes(o.category_id)) erro(`categoria ${o.category_id} não consta entre as escolhidas pelo operador: ${aprovadas.join(", ")}`);
    else ok(`categoria da oferta escolhida pelo operador: ${o.category_id}`);
  } catch (e: any) {
    if (rodadaNova) erro(`entrada.md: falta ${e.message}`);
    else aviso("entrada antiga sem categoria MLB explícita: confirmar escolha do operador");
  }
}
let schema: ReturnType<typeof esquemaDaCategoria> = null;
try { schema = esquemaDaCategoria(pasta, o.category_id); }
catch (e: any) { erro(`schema de categoria inválido: ${e.message}`); }
if (!schema) {
  if (rodadaNova) erro(`sem schema da categoria ${o.category_id} em raw/ — não usar o de outra categoria`);
  else aviso(`sem schema da categoria ${o.category_id} em raw/ — rode ml:categoria para comparar`);
} else {
  console.log(`  fonte do schema: ${schema.arquivo}`);
  const relevantes = schema.atributos.filter((a) => !IGNORAR.test(a.id));
  const preenchido = (id: string) => typeof temos.get(id) === "string" && !!temos.get(id)?.trim();
  const preenchidos = relevantes.filter((a) => preenchido(a.id));
  ok(`${preenchidos.length} de ${relevantes.length} atributos do schema preenchidos`);
  for (const a of relevantes.filter((a) => a.tags?.required && !preenchido(a.id))) erro(`obrigatório vazio: ${a.id} (${a.name})`);
  const vazios = relevantes.filter((a) => !preenchido(a.id) && !a.tags?.required);
  if (vazios.length) aviso(`vazios: ${vazios.map((a) => `${a.id} (${a.name})`).join(", ")}`);
}
const refs = existsSync(join(pasta, "raw")) ? readdirSync(join(pasta, "raw")).filter((f) => /^referencias.*\.json$/.test(f)) : [];
const doConcorrente = new Set<string>();
for (const f of refs) for (const r of lerJson(join(pasta, "raw", f)).refs ?? []) for (const a of r.atributos ?? []) doConcorrente.add(a.id);
const lacunas = [...doConcorrente].filter((id) => !temos.has(id) && !IGNORAR.test(id));
if (lacunas.length) aviso(`concorrente preenche e nós não: ${lacunas.join(", ")} (confira se o dado existe; nunca copiar sem confirmar)`);
if (temos.has("GTIN")) ok(`GTIN ${temos.get("GTIN")}`);
else if (o.sem_gtin_motivo) aviso(`sem GTIN — motivo: ${o.sem_gtin_motivo}`);
else erro("sem GTIN e sem sem_gtin_motivo");

// 4. Descrição × objeções do dossiê — o casamento é julgamento: o agente escreve, item a item,
//    o trecho da descrição que responde cada objeção, e leva a lista para o checkpoint 4.
console.log("\nDescrição × objeções do dossiê");
console.log(`  descrição com ${o.descricao?.length ?? 0} caracteres`);
const arqDossie = join(pasta, "dossie.md");
const objecoes = existsSync(arqDossie) ? objecoesDoDossie(readFileSync(arqDossie, "utf8")) : [];
if (!existsSync(arqDossie)) aviso("sem dossie.md");
else {
  if (!objecoes.length) aviso("a seção 5 do dossiê não tem objeções em tabela");
  objecoes.forEach((x) => console.log(`  §${x.num} ${x.texto.slice(0, 110)}\n     → trecho da descrição que responde: ______  (sem resposta = pedir o dado ao operador)`));
}

// Evidência só para promessa (dado técnico e resposta a objeção). Sem objeção no dossiê, é opcional.
const arqEvidencias = join(pasta, "evidencias.json");
if (!existsSync(arqEvidencias)) {
  if (rodadaNova && objecoes.length) erro("sem evidencias.json: ligar cada objeção (§5.n) e cada dado técnico prometido a uma fonte");
  else aviso("sem evidencias.json: revisar à mão os dados técnicos prometidos na descrição");
} else {
  try {
    // Multicategoria: evidência marcada com outra oferta não se confere contra esta descrição.
    const evidencias = (lerJson(arqEvidencias) as Evidencia[]);
    if (!Array.isArray(evidencias) || !evidencias.length) erro("evidencias.json sem registros");
    else {
      for (const problema of conferirEvidencias(pasta, evidencias)) erro(problema);
      const desta = evidencias.filter((e) => !e.oferta || e.oferta === arquivoDaOferta);
      for (const e of desta) {
        if (e.estado !== "confirmada") aviso(`${e.id}: dado não confirmado — não usar como promessa`);
        if (e.resposta_descricao && !o.descricao?.includes(e.resposta_descricao)) erro(`${e.id}: resposta não aparece literalmente na descrição`);
      }
      for (const obj of objecoes) {
        // Pelo número (§5.n); o texto exato fica aceito para evidências antigas.
        const resposta = desta.find((e) => [obj.num, `§${obj.num}`, obj.texto].includes(e.objecao ?? "") && e.estado === "confirmada" && e.resposta_descricao && o.descricao?.includes(e.resposta_descricao));
        if (!resposta) erro(`objeção §${obj.num} sem resposta fundamentada: ${obj.texto}`);
        else ok(`objeção §${obj.num} respondida por ${resposta.id}: ${resposta.resposta_descricao}`);
      }
    }
  } catch (e: any) { erro(`evidencias.json inválido: ${e.message}`); }
}

// 5. O que ainda está PENDENTE no entrada.md
if (existsSync(arqEntrada)) {
  const pend = pendentesDaEntrada(readFileSync(arqEntrada, "utf8"));
  console.log(`\nPendências no entrada.md: ${pend.length || "nenhuma"}`);
  pend.forEach((p) => aviso(p.slice(0, 120)));
}

// 6. Fotos
const fotos = o.fotos?.length ?? 0;
const locais = (o.fotos_locais ?? []) as string[];
const faltam = locais.filter((f) => !existsSync(resolve(f)));
console.log("\nFotos");
if (fotos) ok(`${fotos} fotos já no ML`);
else if (locais.length && !faltam.length) ok(`${locais.length} fotos locais prontas para subir`);
else erro(locais.length ? `fotos não encontradas: ${faltam.join(", ")}` : "nenhuma foto na oferta");

console.log(erros ? `\n✗ ${erros} item(ns) impedem a revisão final.\n` : "\n✓ Pronto para a revisão final (checkpoint 4).\n");
process.exitCode = erros ? 1 : 0;
