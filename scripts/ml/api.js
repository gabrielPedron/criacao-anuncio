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

/** Imprime JSON bonito e sai com código de erro se der ruim. */
export function saida(dados) {
  console.log(JSON.stringify(dados, null, 2));
}
export function morrer(e) {
  console.error('\n✗ ' + e.message + '\n');
  process.exit(1);
}
