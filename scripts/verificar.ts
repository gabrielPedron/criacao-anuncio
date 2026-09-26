// Diagnóstico da instalação em um comando só — o primeiro passo do suporte.
//
//   npm run verificar
//
// Confere Node, .env, token do ML, chave da OpenAI e OPERACAO.md. Nunca imprime valor de
// segredo nem identificador da conta: esta saída aparece em print e em gravação de tela.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RAIZ, lerTokens } from "./ml/auth.js";
import { ml } from "./ml/api.js";

const MODELO_IMAGEM = "gpt-image-2"; // o mesmo de scripts/midia/gerar-imagens.ts
let falhas = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const aviso = (msg: string) => console.log(`  ! ${msg}`);
const falha = (msg: string) => { falhas++; console.log(`  ✗ ${msg}`); };

console.log("\nVerificando a instalação…\n");

// Node
const major = Number(process.versions.node.split(".")[0]);
major >= 24 ? ok(`Node ${process.versions.node}`) : falha(`Node ${process.versions.node} — precisa ser 24 ou superior (nodejs.org).`);

// .env — lido aqui, sem o lerEnv(), para apontar TODOS os campos vazios de uma vez
const env: Record<string, string> = {};
const arqEnv = resolve(RAIZ, ".env");
if (!existsSync(arqEnv)) {
  falha(".env não existe. No PowerShell: Copy-Item .env.example .env");
} else {
  for (const linha of readFileSync(arqEnv, "utf8").split("\n")) {
    const i = linha.indexOf("=");
    if (i > 0 && !linha.trim().startsWith("#")) env[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  for (const chave of ["ML_CLIENT_ID", "ML_CLIENT_SECRET", "OPENAI_API_KEY"]) {
    const v = env[chave] ?? "";
    if (!v) falha(`${chave} está vazio no .env.`);
    else if (/\s|["']/.test(v)) falha(`${chave} tem espaço ou aspas no meio — cole de novo, sem espaço.`);
    else ok(`${chave} preenchido`);
  }
}

// Token do ML — ml() renova sozinho se precisar, então uma chamada prova tudo
const tokens = lerTokens();
if (!tokens) {
  falha("Mercado Livre ainda não autorizado (falta .tokens.json). Rode: npm.cmd run ml:autorizar");
} else {
  try {
    await ml("/users/me");
    ok(`Mercado Livre conectado (autorizado em ${new Date(tokens.salvo_em).toLocaleDateString("pt-BR")})`);
  } catch (e: any) {
    falha(`Mercado Livre não respondeu: ${e.message.split("\n")[0].slice(0, 160)}`);
  }
}

// OpenAI — só lista modelos: não gera imagem, não gasta crédito
if (env.OPENAI_API_KEY) {
  try {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` } });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok) falha(`OpenAI recusou a chave: ${r.status} ${d?.error?.message ?? ""}`.slice(0, 200));
    else if (!(d.data ?? []).some((m: any) => m.id === MODELO_IMAGEM))
      aviso(`OpenAI conectada, mas ${MODELO_IMAGEM} não aparece para esta conta. Veja em platform.openai.com se falta verificar a organização.`);
    else ok(`OpenAI conectada, ${MODELO_IMAGEM} disponível (confira o saldo em platform.openai.com → Billing)`);
  } catch (e: any) {
    falha(`OpenAI inacessível: ${e.message.slice(0, 120)}`);
  }
}

// OPERACAO.md — não é segredo, mas é do negócio: só conferimos se existe e se saiu do modelo
const arqOp = resolve(RAIZ, "OPERACAO.md");
if (!existsSync(arqOp)) falha("OPERACAO.md não existe. No PowerShell: Copy-Item OPERACAO.example.md OPERACAO.md");
else if (readFileSync(arqOp, "utf8").includes("[nome e nicho]")) aviso("OPERACAO.md ainda é o modelo. Peça à IA: \"Me ajude a configurar o OPERACAO.md\".");
else ok("OPERACAO.md preenchido");

console.log(falhas
  ? `\n${falhas} item(ns) para resolver. Mande esta saída para a IA do projeto e peça ajuda.\n`
  : "\nTudo pronto para criar anúncios.\n");
process.exitCode = falhas ? 1 : 0;
