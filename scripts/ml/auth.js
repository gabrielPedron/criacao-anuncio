// Autenticação OAuth do Mercado Livre.
// Guarda credenciais em .env e tokens em .tokens.json (ambos no .gitignore).
// Renova o access_token sozinho quando falta menos de 10 min pra expirar.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ARQ_ENV = resolve(RAIZ, '.env');
const ARQ_TOKENS = resolve(RAIZ, '.tokens.json');
const ARQ_LOCK = resolve(RAIZ, '.tokens.lock');
const MARGEM_MS = 10 * 60 * 1000; // renova 10 min antes de expirar

// O host de AUTORIZACAO e localizado por pais (no Brasil e "mercadoLIVRE").
// Ja o host da API e sempre api.mercadolibre.com, para todos os sites.
const HOSTS_AUTH = {
  MLB: 'auth.mercadolivre.com.br',
  MLA: 'auth.mercadolibre.com.ar',
  MLM: 'auth.mercadolibre.com.mx',
  MLC: 'auth.mercadolibre.cl',
  MCO: 'auth.mercadolibre.com.co',
  MLU: 'auth.mercadolibre.com.uy',
};
export const AUTH_HOST = (site = 'MLB') => HOSTS_AUTH[site] ?? HOSTS_AUTH.MLB;

export function lerEnv() {
  if (!existsSync(ARQ_ENV)) {
    throw new Error('Falta o arquivo .env na raiz do projeto. Copie o .env.example e preencha ML_CLIENT_ID e ML_CLIENT_SECRET.');
  }
  const env = {};
  for (const linha of readFileSync(ARQ_ENV, 'utf8').split('\n')) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  for (const chave of ['ML_CLIENT_ID', 'ML_CLIENT_SECRET']) {
    if (!env[chave]) throw new Error(`${chave} está vazio no .env.`);
  }
  env.ML_REDIRECT_URI ||= 'https://httpbin.org/get';
  env.ML_SITE ||= 'MLB';
  return env;
}

export function lerTokens() {
  if (!existsSync(ARQ_TOKENS)) return null;
  return JSON.parse(readFileSync(ARQ_TOKENS, 'utf8'));
}

export function salvarTokens(resp) {
  const tokens = {
    access_token: resp.access_token,
    refresh_token: resp.refresh_token,
    user_id: resp.user_id,
    expira_em: Date.now() + (resp.expires_in ?? 21600) * 1000,
    salvo_em: new Date().toISOString(),
  };
  writeFileSync(ARQ_TOKENS, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  return tokens;
}

// Lock de diretório: evita dois processos gastarem o mesmo refresh_token
// (o ML invalida o antigo a cada uso — rotação de token).
function travar() {
  const limite = Date.now() + 15000;
  while (true) {
    try {
      mkdirSync(ARQ_LOCK);
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() > limite) {
        rmSync(ARQ_LOCK, { recursive: true, force: true }); // lock órfão
        continue;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
}
function destravar() {
  rmSync(ARQ_LOCK, { recursive: true, force: true });
}

async function postToken(corpo) {
  const r = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`OAuth ${r.status}: ${dados.error ?? ''} ${dados.message ?? JSON.stringify(dados)}`);
  }
  return dados;
}

/** Troca o `code` da autorização pelo primeiro par de tokens. */
export async function trocarCodePorToken(code) {
  const env = lerEnv();
  const dados = await postToken({
    grant_type: 'authorization_code',
    client_id: env.ML_CLIENT_ID,
    client_secret: env.ML_CLIENT_SECRET,
    code,
    redirect_uri: env.ML_REDIRECT_URI,
  });
  return salvarTokens(dados);
}

/** Devolve um access_token válido, renovando se precisar. */
export async function getAccessToken() {
  lerEnv(); // falha cedo e com mensagem clara se o .env não existir
  let tokens = lerTokens();
  if (!tokens) {
    throw new Error('Sem .tokens.json. Rode primeiro: npm run ml:url  →  autorize  →  npm run ml:token -- SEU_CODE');
  }
  if (Date.now() < tokens.expira_em - MARGEM_MS) return tokens.access_token;

  travar();
  try {
    tokens = lerTokens(); // outro processo pode ter renovado enquanto esperávamos
    if (Date.now() < tokens.expira_em - MARGEM_MS) return tokens.access_token;
    const env = lerEnv();
    const dados = await postToken({
      grant_type: 'refresh_token',
      client_id: env.ML_CLIENT_ID,
      client_secret: env.ML_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
    });
    console.error('[ml] access_token renovado.');
    return salvarTokens(dados).access_token;
  } finally {
    destravar();
  }
}
