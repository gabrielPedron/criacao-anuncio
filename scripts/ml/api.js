// Cliente HTTP da API do ML. Somente leitura por enquanto:
// qualquer POST/PUT/DELETE exige confirmação humana explícita (ver docs/00-briefing.md §10).
import { getAccessToken } from './auth.js';

const BASE = 'https://api.mercadolibre.com';
const METODOS_ESCRITA = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export async function ml(caminho, opcoes = {}) {
  const metodo = (opcoes.method ?? 'GET').toUpperCase();
  if (METODOS_ESCRITA.has(metodo) && !opcoes.confirmadoPeloHumano) {
    throw new Error(`Bloqueado: ${metodo} ${caminho} é escrita. Precisa de confirmação humana explícita.`);
  }
  const token = await getAccessToken();
  const url = caminho.startsWith('http') ? caminho : BASE + caminho;

  let ultimoErro;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const r = await fetch(url, {
      ...opcoes,
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json', ...opcoes.headers },
    });
    if (r.ok) return r.json();

    const texto = await r.text();
    ultimoErro = new Error(`ML ${r.status} em ${url}\n${texto.slice(0, 800)}`);
    ultimoErro.status = r.status;
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 800 * tentativa));
      continue;
    }
    throw ultimoErro;
  }
  throw ultimoErro;
}

/** `ml()` que engole o erro e devolve null. Para recurso que pode não existir. */
export const opc = (caminho) => ml(caminho).catch(() => null);

/**
 * Visitas de 30 dias de um anúncio. Desde outubro de 2026 o ML devolve 403 para anúncio de OUTRO
 * vendedor; o da própria conta continua aberto (apurado em 11/11/2026). Nesse caso devolve
 * `{ bloqueado: true }` — nunca 0, que seria lido como "ninguém visita". Outro erro: null.
 */
export async function visitas30d(item) {
  try {
    const v = await ml(`/items/${item}/visits/time_window?last=30&unit=day`);
    return { total: v.total_visits ?? 0, dias: v.results ?? [] };
  } catch (e) {
    return e.status === 403 ? { bloqueado: true } : null;
  }
}

export const AVISO_VISITAS =
  'O ML não mostra mais visitas de anúncio de outro vendedor (403 desde outubro de 2026; as do seu anúncio continuam abertas).\n' +
  '  Para concorrente, use: perguntas (ml:produto), mais vendidos (ml:concorrentes) e vendidos e avaliações pela página (ml:pagina).';

/** Percorre um endpoint paginado até acabar. `url(offset)` monta a chamada; `extrai(r)` tira o lote. */
export async function paginar(url, extrai, limite = 50) {
  const tudo = [];
  for (let offset = 0; ; offset += limite) {
    const r = await ml(url(offset));
    const lote = extrai(r);
    tudo.push(...lote);
    const total = r.paging?.total ?? r.total ?? 0;
    if (lote.length === 0 || tudo.length >= total || offset > 2000) break;
  }
  return tudo;
}

/** Id da conta e os anúncios ativos e pausados dela (para marcar "seu" em busca e referência). */
export async function anunciosDaConta() {
  const conta = (await ml('/users/me')).id;
  const ids = [];
  for (const status of ['active', 'paused']) {
    ids.push(...await paginar((o) => `/users/${conta}/items/search?status=${status}&limit=50&offset=${o}`, (r) => r.results ?? []));
  }
  return { conta, ids };
}

/** Imprime JSON bonito e sai com código de erro se der ruim. */
export function saida(dados) {
  console.log(JSON.stringify(dados, null, 2));
}
export function morrer(e) {
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}
