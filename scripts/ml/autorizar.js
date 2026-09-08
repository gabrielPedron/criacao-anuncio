// Autorização do ML em um comando só.
// Se ML_REDIRECT_URI apontar para localhost, sobe um servidor local, captura o
// code sozinho e grava o token — sem copiar e colar nada.
// Senão, imprime a URL e aceita o code (ou a URL inteira colada) como argumento.
//
// Uso: npm run ml:autorizar
//      npm run ml:autorizar -- "https://httpbin.org/get?code=TG-..."   (modo manual)
import { createServer } from 'node:http';
import { lerEnv, AUTH_HOST, trocarCodePorToken, lerTokens } from './auth.js';
import { morrer } from './api.js';

const env = lerEnv();
const urlAuth = `https://${AUTH_HOST(env.ML_SITE)}/authorization?response_type=code`
  + `&client_id=${encodeURIComponent(env.ML_CLIENT_ID)}`
  + `&redirect_uri=${encodeURIComponent(env.ML_REDIRECT_URI)}`;

/** Aceita o code puro ou a URL inteira colada da barra de endereço. */
function extrairCode(entrada) {
  if (!entrada) return null;
  const m = entrada.match(/[?&]code=([^&\s"']+)/);
  return m ? decodeURIComponent(m[1]) : entrada.trim();
}

async function gravar(code) {
  const t = await trocarCodePorToken(code);
  console.log(`\n✓ Autorizado. Tokens salvos (user_id ${t.user_id}).`);
  console.log(`  access_token expira ${new Date(t.expira_em).toLocaleString('pt-BR')} — daqui pra frente renova sozinho.`);
  console.log('\n  Confira com: npm run ml:teste\n');
}

const arg = process.argv[2];
if (arg) {
  try { await gravar(extrairCode(arg)); } catch (e) { morrer(e); }
} else if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(env.ML_REDIRECT_URI)) {
  // ---- modo automático: servidor local captura o code ----
  const porta = Number(new URL(env.ML_REDIRECT_URI).port || 80);
  const anterior = lerTokens();
  console.log(`\nAbra esta URL logado na sua conta ML principal:\n\n${urlAuth}\n`);
  console.log(`Aguardando o retorno em ${env.ML_REDIRECT_URI} …  (Ctrl+C cancela)\n`);

  const servidor = createServer(async (req, res) => {
    const code = new URL(req.url, env.ML_REDIRECT_URI).searchParams.get('code');
    if (!code) { res.writeHead(400).end('Sem code na requisicao.'); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<h2>Autorizado.</h2><p>Pode fechar esta aba e voltar para o terminal.</p>');
    servidor.close();
    try {
      await gravar(code);
      if (anterior) console.log('  (o token anterior foi substituido — o escopo novo passa a valer agora)');
    } catch (e) { console.error('\n✗ ' + e.message + '\n'); process.exitCode = 1; }
  });
  servidor.listen(porta);
  setTimeout(() => { servidor.close(); console.error('\n✗ Ninguem autorizou em 5 minutos. Rode de novo.\n'); process.exitCode = 1; }, 300000).unref();
} else {
  // ---- modo manual: httpbin ou outro redirect que voce nao controla ----
  console.log(`\n1) Abra esta URL logado na sua conta ML principal:\n\n${urlAuth}\n`);
  console.log('2) Autorize. Voce cai no redirect e a tela mostra o code.');
  console.log('3) Copie a URL INTEIRA da barra de endereco (ou so o code) e rode:\n');
  console.log('   npm run ml:autorizar -- "cole aqui"\n');
  console.log('Dica: registrando http://localhost:8137/callback como redirect no painel do ML');
  console.log('e trocando no .env, este comando captura o code sozinho e voce nao cola nada.\n');
}
