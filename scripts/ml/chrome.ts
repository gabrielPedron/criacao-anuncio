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
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const RAIZ = resolve(import.meta.dirname, "../..");
const PERFIL = join(RAIZ, ".chrome-ml");
const PORTA = Number(process.env.ML_CHROME_PORTA ?? 9334);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Onde costuma estar o Chrome. CHROME_PATH no ambiente vence qualquer palpite. */
export function acharChrome(): string {
  const local = process.env.LOCALAPPDATA ?? "";
  const candidatos = [
    process.env.CHROME_PATH,
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
    // Intervalo entre páginas: ritmo de gente, não de robô. Menos chance de bloqueio.
    await espera(1200 + Math.random() * 1500);
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
    if (barreira) throw new Error(`${barreira} em ${url}. Parei: não contorno bloqueio, captcha nem login.`);
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

/** Do link de um card tira o id do anúncio (MLB123) e/ou do catálogo (/p/MLB123). */
export function idsDoLink(link: string): { item: string | null; catalogo: string | null } {
  const catalogo = (link.match(/\/p\/(MLB\d+)/i) || [])[1] ?? null;
  const wid = (link.match(/[?#&]wid=(MLB\d+)/i) || [])[1];
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
