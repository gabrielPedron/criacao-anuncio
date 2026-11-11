// Chrome de verdade, dirigido por código, para ler o que a API do ML não entrega:
// busca por termo, anúncio de outro vendedor, avaliações e sugestões de busca.
//
// Por que não o navegador headless (Playwright, o do Hermes, web_extract): o ML devolve a página
// "Hubo un error accediendo a esta pagina" para ele. Um Chrome normal, com janela, passa.
// Testado em 05 e 06/10/2026.
//
// Perfil SEPARADO em .chrome-ml/ (no .gitignore): não usa o Chrome logado de quem opera, não vê
// a conta dele e não mistura histórico. Decisão do operador em 06/10/2026.
//
// Só leitura: navegar, rolar, ler o DOM. Nada de clicar em comprar/perguntar, nada de login,
// nada de contornar captcha — se aparecer, o script para e avisa.
//
// RITMO (pedido do operador em 11/11/2026): escala de gente, não de robô. Uma aba, em série,
// pausa de leitura entre páginas, teto de páginas por dia, pausa de 6 h depois de qualquer
// barreira do ML e cache de 12 h para não reabrir a mesma página. É o que reduz a pegada sem
// perder dado. O que NÃO entra, de propósito: disfarce de automação (mexer em fingerprint, user
// agent, webdriver), mouse falso, troca de IP/proxy e qualquer coisa que resolva captcha.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { lerArquivoEnv } from "./auth.js";
import { resolve, join } from "node:path";

const RAIZ = resolve(import.meta.dirname, "../..");
const PERFIL = join(RAIZ, ".chrome-ml");
// Ajustes do Chrome do projeto: vêm do .env ou do ambiente (o ambiente vence). Sem exigir credencial.
const ENV: Record<string, string | undefined> = { ...lerArquivoEnv(), ...process.env };
const PORTA = Number(ENV.ML_CHROME_PORTA ?? 9334);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- ritmo ----------

const ARQ_RITMO = join(PERFIL, "ritmo.json");
const PASTA_CACHE = join(PERFIL, "cache");
/** Páginas do ML por dia, somando todos os comandos. Um produto completo usa ~15. */
export const LIMITE_DIA = Number(ENV.ML_CHROME_LIMITE_DIA ?? 80);
const PAUSA_BARREIRA_H = 6;
const VALIDADE_CACHE_H = 12;

export type Ritmo = { dia: string; paginas: number; barrado_em: string | null };

/** Dia no fuso da máquina, "2026-11-11". O teto zera à meia-noite local, não à do UTC. */
export function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Pausa antes de abrir a próxima página: 2,5 a 5 s, e 1 vez em 6 uma de 6 a 12 s, como quem parou
 * para ler. Média ~4,6 s: um produto inteiro (~15 páginas) leva cerca de 1 min a mais que antes.
 */
export function pausaEntrePaginas(sorteio: () => number = Math.random): number {
  return sorteio() < 1 / 6 ? 6000 + sorteio() * 6000 : 2500 + sorteio() * 2500;
}

const hora = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Motivo para NÃO abrir mais página agora, ou null se pode. */
export function motivoParaParar(r: Ritmo, agora: Date, limite = LIMITE_DIA): string | null {
  if (r.barrado_em) {
    const libera = new Date(Date.parse(r.barrado_em) + PAUSA_BARREIRA_H * 3_600_000);
    if (agora < libera) {
      return `O ML barrou a leitura às ${hora(new Date(r.barrado_em))}. Pausa do Chrome do projeto até ` +
        `${hora(libera)}: insistir logo depois de um bloqueio costuma piorá-lo.\n` +
        `  Enquanto isso, a coleta roda só pela API: npm run ml:coletar -- produtos/<slug> --executar --sem-chrome`;
    }
  }
  if (r.dia === diaLocal(agora) && r.paginas >= limite) {
    return `Limite de ${limite} páginas do ML por dia atingido (somando todos os comandos). Volta amanhã.\n` +
      `  Para mudar o teto: ML_CHROME_LIMITE_DIA no .env. A coleta pela API segue com --sem-chrome.`;
  }
  return null;
}

/** Conta uma página aberta, zerando o contador na virada do dia. */
export function contarPagina(r: Ritmo, agora: Date): Ritmo {
  const dia = diaLocal(agora);
  return { ...r, dia, paginas: r.dia === dia ? r.paginas + 1 : 1 };
}

export function cacheValido(lidoEm: string, agora: Date, horas = VALIDADE_CACHE_H): boolean {
  const idade = agora.getTime() - Date.parse(lidoEm);
  return idade >= 0 && idade < horas * 3_600_000;
}

function lerRitmo(): Ritmo {
  try { return { dia: "", paginas: 0, barrado_em: null, ...JSON.parse(readFileSync(ARQ_RITMO, "utf8")) }; }
  catch { return { dia: "", paginas: 0, barrado_em: null }; }
}
function gravarRitmo(r: Ritmo) {
  mkdirSync(PERFIL, { recursive: true });
  writeFileSync(ARQ_RITMO, JSON.stringify(r, null, 2));
}

const arquivoCache = (chave: string) => join(PASTA_CACHE, createHash("sha1").update(chave).digest("hex") + ".json");

/**
 * Leitura de menos de 12 h para a mesma chave (URL da busca, URL do anúncio, termo de sugestão):
 * reaproveita em vez de reabrir. Evita ler de novo entre o --sondar e o --executar.
 * `--recarregar` na linha de comando ignora o cache.
 */
export function doCache<T = any>(chave: string): { lido_em: string; dado: T } | null {
  if (process.argv.includes("--recarregar")) return null;
  try {
    const c = JSON.parse(readFileSync(arquivoCache(chave), "utf8"));
    return cacheValido(c.lido_em, new Date()) ? c : null;
  } catch { return null; }
}
export function guardarNoCache(chave: string, dado: unknown) {
  mkdirSync(PASTA_CACHE, { recursive: true });
  writeFileSync(arquivoCache(chave), JSON.stringify({ lido_em: new Date().toISOString(), dado }));
}
export const horaDoCache = (lidoEm: string) => hora(new Date(lidoEm));

/** Onde costuma estar o Chrome. CHROME_PATH no ambiente vence qualquer palpite. */
export function acharChrome(): string {
  const local = process.env.LOCALAPPDATA ?? "";
  const candidatos = [
    ENV.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    local && join(local, "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];
  const achado = candidatos.find((c) => existsSync(c));
  if (!achado) {
    throw new Error(
      "Não achei o Google Chrome. Instale o Chrome ou aponte o caminho em CHROME_PATH no .env.\n" +
      "  (o navegador headless não serve: o ML bloqueia)",
    );
  }
  return achado;
}

async function versao(): Promise<boolean> {
  try {
    const r = await fetch(`http://127.0.0.1:${PORTA}/json/version`);
    return r.ok;
  } catch { return false; }
}

/** Liga o Chrome do projeto, se ainda não estiver ligado. Ele fica aberto entre um comando e outro. */
async function ligar() {
  if (await versao()) return;
  mkdirSync(PERFIL, { recursive: true });
  const filho = spawn(acharChrome(), [
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${PERFIL}`,
    "--no-first-run",
    "--no-default-browser-check",
    // Guia anônima (pedido do operador em 06/10/2026): nada de cookie, histórico ou cache sobra entre
    // uma sessão e outra, mesmo dentro do perfil separado.
    "--incognito",
    "about:blank",
  ], { detached: true, stdio: "ignore" });
  filho.unref();
  for (let i = 0; i < 30; i++) {
    await espera(500);
    if (await versao()) return;
  }
  throw new Error(`O Chrome abriu mas não respondeu na porta ${PORTA}. Feche a janela "Chrome do projeto" e rode de novo.`);
}

type Pagina = {
  abrir(url: string): Promise<void>;
  avaliar<T = any>(fn: Function | string, ...argumentos: any[]): Promise<T>;
  fechar(): Promise<void>;
};

const TEMPO_CDP = 30_000;

/**
 * Cliente CDP mínimo sobre o WebSocket nativo do Node. Todo comando tem tempo limite e falha
 * (em vez de travar para sempre) se o Chrome fechar no meio.
 */
async function clienteCdp(url: string) {
  const ws = new WebSocket(url);
  await new Promise((ok, falha) => {
    ws.onopen = ok;
    ws.onerror = () => falha(new Error("Não consegui conectar no Chrome do projeto."));
  });
  let id = 0;
  const pendentes = new Map<number, { ok: (r: any) => void; falha: (e: Error) => void; timer: any }>();
  ws.onmessage = (ev) => {
    const m = JSON.parse(String(ev.data));
    const p = m.id ? pendentes.get(m.id) : undefined;
    if (!p) return;
    clearTimeout(p.timer);
    pendentes.delete(m.id);
    m.error ? p.falha(new Error(`Chrome recusou o comando: ${m.error.message}`)) : p.ok(m.result);
  };
  ws.onclose = () => {
    for (const p of pendentes.values()) {
      clearTimeout(p.timer);
      p.falha(new Error("O Chrome do projeto fechou no meio da leitura. Rode o comando de novo."));
    }
    pendentes.clear();
  };
  const cmd = (method: string, params: object = {}) =>
    new Promise<any>((ok, falha) => {
      if (ws.readyState !== WebSocket.OPEN) return falha(new Error("O Chrome do projeto não está conectado."));
      const i = ++id;
      const timer = setTimeout(() => {
        pendentes.delete(i);
        falha(new Error(`O Chrome não respondeu a ${method} em ${TEMPO_CDP / 1000} s.`));
      }, TEMPO_CDP);
      pendentes.set(i, { ok, falha, timer });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  return { cmd, ws };
}

/**
 * Abre uma aba num contexto ISOLADO do Chrome do projeto — o mesmo mecanismo da guia anônima:
 * cookie, cache e storage nascem vazios e são descartados no `fechar()`. Vale mesmo se a janela
 * do Chrome tiver sido aberta antes sem --incognito (achado da revisão de 06/10/2026).
 */
export async function conectar(): Promise<Pagina> {
  const parar = motivoParaParar(lerRitmo(), new Date());
  if (parar) throw new Error(parar);
  await ligar();
  const info = await (await fetch(`http://127.0.0.1:${PORTA}/json/version`)).json();
  const navegador = await clienteCdp(info.webSocketDebuggerUrl);
  const { browserContextId } = await navegador.cmd("Target.createBrowserContext", { disposeOnDetach: true });
  const { targetId } = await navegador.cmd("Target.createTarget", { url: "about:blank", browserContextId });
  const aba = await clienteCdp(`ws://127.0.0.1:${PORTA}/devtools/page/${targetId}`);
  const cmd = aba.cmd;

  async function avaliar(fn: Function | string, ...argumentos: any[]) {
    const expr = typeof fn === "string" ? fn : `(${fn.toString()})(...${JSON.stringify(argumentos)})`;
    const r = await cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error("Erro no JavaScript da página: " + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
    }
    return r.result?.value;
  }

  async function abrir(url: string) {
    // Teto do dia e pausa pós-barreira valem também no meio de um comando, não só ao conectar.
    const ritmo = lerRitmo();
    const parar = motivoParaParar(ritmo, new Date());
    if (parar) throw new Error(parar);
    gravarRitmo(contarPagina(ritmo, new Date()));
    // Pausa de leitura entre páginas: ritmo de gente, não de robô.
    await espera(pausaEntrePaginas());
    // Marca o documento atual. Só conta como carregada a página que NÃO tem a marca: sem isso, logo
    // depois de abrir o Chrome a leitura pegava o about:blank (que já está "complete") e a busca
    // saía vazia — a "1ª busca vazia" de 06/10.
    await avaliar("window.__paginaAnterior = true").catch(() => {});
    const nav = await cmd("Page.navigate", { url });
    if (nav.errorText) throw new Error(`Não abriu ${url}: ${nav.errorText}`);
    const limite = Date.now() + 30_000;
    let pronta = false;
    while (Date.now() < limite) {
      await espera(500);
      const estado = await avaliar("window.__paginaAnterior ? 'velha' : document.readyState").catch(() => null);
      if (estado === "complete") { pronta = true; break; }
    }
    if (!pronta) throw new Error(`A página não terminou de carregar em 30 s: ${url}`);
    await espera(1500);
    const barreira = await avaliar(detectarBarreira);
    if (barreira) {
      // Registra para os próximos comandos respeitarem a pausa de 6 h, em vez de insistir.
      gravarRitmo({ ...lerRitmo(), barrado_em: new Date().toISOString() });
      throw new Error(`${barreira} em ${url}. Parei: não contorno bloqueio, captcha nem login. ` +
        `O Chrome do projeto fica em pausa por ${PAUSA_BARREIRA_H} h.`);
    }
  }

  async function fechar() {
    aba.ws.close();
    await navegador.cmd("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
    navegador.ws.close();
  }

  return { abrir, avaliar, fechar };
}

/** Roda dentro da página. Devolve o motivo se o ML barrou a leitura. */
function detectarBarreira() {
  const t = document.title || "";
  const corpo = (document.body?.innerText || "").slice(0, 2000);
  if (t.includes("🐴") || /Hubo un error accediendo/i.test(corpo)) return "O ML bloqueou a página";
  if (/captcha|não sou um robô|nao sou um robo/i.test(corpo)) return "O ML pediu captcha";
  if (/account-verification|\/login/.test(location.href)) return "O ML pediu login";
  return null;
}

// ---------- funções puras (testadas em chrome.test.ts) ----------

/** "Tinta Acrílica p/ Piso" → "tinta-acrilica-p-piso", o formato de lista.mercadolivre.com.br/<termo>. */
export function slugDaBusca(termo: string): string {
  return termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Do link (card da busca ou link colado pelo operador) tira o id do anúncio e/ou do catálogo (/p/MLB123). */
export function idsDoLink(link: string): { item: string | null; catalogo: string | null } {
  const catalogo = (link.match(/\/p\/(MLB\d+)/i) || [])[1] ?? null;
  const wid = (link.match(/[?#&]wid=(MLB\d+)/i) || link.match(/item_id[:=](MLB\d+)/i) || [])[1];
  const item = wid ?? ((link.match(/MLB-?(\d{8,})/) || [])[1] ? "MLB" + link.match(/MLB-?(\d{8,})/)![1] : null);
  return { item: item === catalogo ? null : item, catalogo };
}

/**
 * Bloco de texto de uma avaliação, como a página mostra → { nota, util, texto }.
 * Ex.: "Avaliação 4 de 5 Brasil Há 5 dias Bom produto… Útil 3 Mais opções".
 * Já quebrou uma vez: "dia|dias" na ordem errada deixava um "s" solto no começo do texto.
 */
export function limparAvaliacao(bloco: string): { nota: number | null; util: number; texto: string } | null {
  const b = bloco.replace(/\s+/g, " ").trim();
  if (!/^Avalia..o \d de 5/.test(b)) return null;
  const nota = Number((b.match(/^Avalia..o (\d) de 5/) || [])[1]) || null;
  const util = Number((b.match(/Útil (\d+)/) || [])[1]) || 0;
  const texto = b.replace(/^Avalia..o \d de 5\s*/, "")
    .replace(/^(Brasil\s*)?H[áa] [^A-Z]*?(anos|ano|meses|m[êe]s|dias|dia)\s*/, "")
    .replace(/\s*Saiba mais/, "").replace(/\s*Útil \d+.*$/, "").replace(/\s*Mais op..es\s*$/, "").trim();
  return texto.length > 10 ? { nota, util, texto } : null;
}
