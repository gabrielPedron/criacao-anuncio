// Gera o set de imagens do anúncio a partir da foto base + os prompts do operador.
//
//   npm run midia:gerar -- produtos/<slug>              → mostra o custo e para
//   npm run midia:gerar -- produtos/<slug> --confirmo   → gera as 5 (gasta crédito)
//   npm run midia:gerar -- produtos/<slug> --foto 3     → refaz SÓ a 3 (não toca nas aprovadas)
//   npm run midia:gerar -- produtos/<slug> --dry        → mostra o que faria, sem chamar a API
//   ... --foto 2 --ajuste "os baldes de comparação estão vazios, põe 3,6kg no rótulo"
//   ... --foto 2 --variacoes 3   → 3 tentativas de uma vez, você escolhe
//
// Cada chamada parte SEMPRE da foto base original — refazer não herda o defeito da tentativa
// anterior, ao contrário de editar dentro de um fio de conversa.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { gerarDeFotoBase, resumirUso, USD_POR_IMAGEM } from "./openai.ts";
import { morrer } from "../ml/api.js";
import { args, pega } from "../cli.ts";

type Foto = { n: number; objetivo: string; prompt: string };
type Spec = { produto: string; fotos_base: string[]; fotos: Foto[] };

const pasta = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const soFoto = pega("--foto");
const dry = args.includes("--dry");
const tamanho = pega("--tamanho", "1200x1200")!;
const qualidade = (pega("--qualidade", "medium") as any)!;  // medium ficou igual ao high e custa 4x menos
const modelo = pega("--modelo", "gpt-image-2")!;
const ajuste = pega("--ajuste", null);
const variacoes = Math.max(1, Number(pega("--variacoes", "1")));

if (!pasta) morrer(new Error("Uso: npm run midia:gerar -- produtos/<slug> [--foto 3] [--dry]"));

try {
  const arqSpec = resolve(pasta!, "prompts-imagens.json");
  if (!existsSync(arqSpec)) {
    morrer(new Error(
      `Falta ${arqSpec}.\n  Esse arquivo tem os 5 prompts já preenchidos a partir do dossiê.\n` +
      `  Peça: "monta os prompts de imagem para produtos/<slug>" — eu preencho os colchetes\n` +
      `  usando as lacunas (foto 2), as perguntas (foto 3) e a ficha (foto 4).`));
  }
  const spec: Spec = JSON.parse(readFileSync(arqSpec, "utf8"));

  const bases = spec.fotos_base.map((f) => resolve(f));
  const faltando = bases.filter((f) => !existsSync(f));
  if (faltando.length) morrer(new Error(`Foto base não encontrada:\n  ${faltando.join("\n  ")}`));

  const destino = resolve(pasta!, "imagens");
  mkdirSync(destino, { recursive: true });

  const alvo = soFoto ? spec.fotos.filter((f) => f.n === Number(soFoto)) : spec.fotos;
  if (!alvo.length) morrer(new Error(`Foto ${soFoto} não existe no spec (tem ${spec.fotos.map((f) => f.n).join(", ")}).`));

  console.log(`\n${spec.produto}`);
  console.log(`Base: ${bases.length} foto(s) · Destino: ${destino}`);
  console.log(`Tamanho ${tamanho}, qualidade ${qualidade}\n`);

  // Gasta crédito pré-pago do operador: sem --confirmo, só mostra a conta e para.
  // ponytail: preço fixo do medium 1200x1200 (docs/14); --qualidade high custa ~3x a estimativa.
  const n = alvo.length * variacoes;
  if (!dry && !args.includes("--confirmo")) {
    console.log(`Isto gera ${n} imagem(ns) — cerca de US$ ${(n * USD_POR_IMAGEM).toFixed(2)} do crédito da OpenAI.`);
    console.log(`Confirme com o operador e rode de novo com --confirmo.\n`);
    process.exit(0);
  }

  // 1200x1200 no gpt-image-2 (testado 30/08/2026): ativa o zoom do ML, que pede >=1200.

  const historico = join(destino, "historico.md");

  for (const foto of alvo) {
    // O ajuste vira uma CORREÇÃO no fim do prompt. Cada chamada continua partindo da
    // foto base original — o defeito da tentativa anterior não é herdado.
    const promptFinal = ajuste
      ? `${foto.prompt}

CORREÇÃO PEDIDA (o resultado anterior falhou nisto, trate como prioridade): ${ajuste}`
      : foto.prompt;

    for (let v = 0; v < variacoes; v++) {
      const jaTem = readdirSync(destino).filter((a) => a.startsWith(String(foto.n).padStart(2, "0") + "-v"));
      const versao = jaTem.length + 1;
      const nome = `${String(foto.n).padStart(2, "0")}-v${versao}.png`;

      console.log(`  Foto ${foto.n} — ${foto.objetivo}  →  ${nome}${ajuste ? "  (com ajuste)" : ""}`);
      if (dry) { console.log(`    (dry) ${promptFinal.slice(0, 140)}…`); continue; }

      try {
        const { bin, uso } = await gerarDeFotoBase(promptFinal, bases, { tamanho, qualidade, modelo });
        writeFileSync(join(destino, nome), bin);
        console.log(`    ✓ ${(bin.length / 1024).toFixed(0)} KB · ${resumirUso(uso)}`);
        const linhas = [
          "",
          `## ${nome}`,
          `- data: ${new Date().toLocaleString("pt-BR")}`,
          `- modelo: ${modelo} · ${tamanho} · ${qualidade}`,
          ajuste ? `- ajuste pedido: ${ajuste}` : "- ajuste: (nenhum, primeira tentativa)",
          "- veredito: ( a preencher: aprovada / reprovada + motivo )",
        ];
        appendFileSync(historico, linhas.join("\n") + "\n");
      } catch (e: any) {
        console.log(`    ✗ ${e.message}`);
        process.exitCode = 1;
      }
    }
  }

  if (!dry) {
    console.log(`\n→ Agora eu olho cada imagem e confiro: produto fiel à base, texto legível e`);
    console.log(`  correto, sem deformação, capa sem texto/logo. O que reprovar, refaço com`);
    console.log(`  "npm run midia:gerar -- ${pasta} --foto N" — sem tocar nas aprovadas.\n`);
  }
} catch (e) { morrer(e as Error); }
