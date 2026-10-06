// Conferência antes da revisão final (Parada 2): o que falta na oferta ANTES de publicar.
// Nasceu de um piloto que subiu sem garantia e sem um atributo técnico e teve de ser editado
// depois — e toda edição pode mexer no ranqueamento. Só lê arquivos locais; não chama a API.
//
//   npm run ml:conferir -- produtos/<slug>                 (usa oferta.json)
//   npm run ml:conferir -- produtos/<slug>/oferta-x.json
//
// Lê: a oferta, raw/categoria.json (schema real), raw/referencias*.json (ficha dos concorrentes),
// dossie.md §5 (objeções) e entrada.md (o que ainda está PENDENTE).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { morrer } from "./api.js";
import { args } from "../cli.ts";
import { carregarOferta } from "./publicar.ts";

const alvo = args.find((a) => !a.startsWith("--"));
if (!alvo) morrer(new Error("Uso: npm run ml:conferir -- produtos/<slug> [ou o caminho do oferta-x.json]"));
const pasta = alvo!.endsWith(".json") ? dirname(resolve(alvo!)) : resolve(alvo!);
const lerJson = (arq: string) => JSON.parse(readFileSync(arq, "utf8"));

// Calculado pelo ML ou do envio — não é "lacuna" da ficha.
const IGNORAR = /^(SELLER_PACKAGE_|PACKAGE_|ITEM_CONDITION|PRODUCT_FEATURES|SYI_PYMES_ID)/;

/** Linhas da tabela da seção 5 do dossiê (objeções), sem o cabeçalho. */
export function objecoesDoDossie(md: string): string[] {
  const secao = md.split(/^## /m).find((s) => /^5\./.test(s)) ?? "";
  return secao.split("\n")
    .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l) && !/Objeção \/ dor/i.test(l))
    .map((l) => l.split("|")[1]?.trim())
    .filter((t): t is string => !!t);
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

// 3. Ficha: schema da categoria × o que preenchemos × o que os concorrentes preenchem
console.log("\nFicha técnica");
const arqCat = join(pasta, "raw", "categoria.json");
if (!existsSync(arqCat)) aviso("sem raw/categoria.json — rode ml:categoria para comparar com o schema real");
else {
  const schema: any[] = lerJson(arqCat).atributos ?? [];
  const relevantes = schema.filter((a) => !IGNORAR.test(a.id));
  const preenchidos = relevantes.filter((a) => temos.has(a.id));
  ok(`${preenchidos.length} de ${relevantes.length} atributos do schema preenchidos`);
  for (const a of relevantes.filter((a) => a.tags?.required && !temos.has(a.id))) erro(`obrigatório vazio: ${a.id} (${a.name})`);
  const vazios = relevantes.filter((a) => !temos.has(a.id) && !a.tags?.required);
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
//    o trecho da descrição que responde cada objeção, e leva a lista para a Parada 2.
console.log("\nDescrição × objeções do dossiê");
console.log(`  descrição com ${o.descricao?.length ?? 0} caracteres`);
const arqDossie = join(pasta, "dossie.md");
if (!existsSync(arqDossie)) aviso("sem dossie.md");
else {
  const obj = objecoesDoDossie(readFileSync(arqDossie, "utf8"));
  if (!obj.length) aviso("a seção 5 do dossiê não tem objeções em tabela");
  obj.forEach((t, i) => console.log(`  ${i + 1}. ${t.slice(0, 110)}\n     → trecho da descrição que responde: ______  (sem resposta = pedir o dado ao operador)`));
}

// 5. O que ainda está PENDENTE no entrada.md
const arqEntrada = join(pasta, "entrada.md");
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

console.log(erros ? `\n✗ ${erros} item(ns) impedem a revisão final.\n` : "\n✓ Pronto para a revisão final (Parada 2).\n");
process.exitCode = erros ? 1 : 0;
