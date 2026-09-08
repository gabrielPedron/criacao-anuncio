// Passo 1: gera a URL de autorização pra você abrir no navegador (conta ML principal).
import { lerEnv, AUTH_HOST } from './auth.js';
import { morrer } from './api.js';

try {
  const env = lerEnv();
  const url = `https://${AUTH_HOST(env.ML_SITE)}/authorization?response_type=code`
    + `&client_id=${encodeURIComponent(env.ML_CLIENT_ID)}`
    + `&redirect_uri=${encodeURIComponent(env.ML_REDIRECT_URI)}`;
  console.log('\n1) Abra esta URL logado na sua conta ML PRINCIPAL (não colaborador):\n');
  console.log(url);
  console.log('\n2) Autorize. Você cai no redirect_uri e a tela mostra um JSON com "code": "TG-...".');
  console.log('3) Copie o code (dura poucos minutos, uso único) e rode:\n');
  console.log('   npm run ml:token -- SEU_CODE\n');
} catch (e) { morrer(e); }
