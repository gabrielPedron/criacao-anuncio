// Passo 2: troca o code pelo primeiro par de tokens e grava em .tokens.json.
import { trocarCodePorToken } from './auth.js';
import { morrer } from './api.js';

const code = process.argv[2];
if (!code) morrer(new Error('Uso: npm run ml:token -- SEU_CODE'));

try {
  const t = await trocarCodePorToken(code);
  console.log(`\n✓ Tokens salvos em .tokens.json (user_id ${t.user_id}).`);
  console.log(`  access_token expira em ${new Date(t.expira_em).toLocaleString('pt-BR')} — a renovação é automática.`);
  console.log('\nPróximo: npm run ml:teste\n');
} catch (e) { morrer(e); }
