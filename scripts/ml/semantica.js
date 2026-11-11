// Termos em tendência da categoria, direto do ML (/trends).
// Substituto parcial do Nubimetrics: são as buscas que o próprio ML considera
// em alta na categoria. Não traz volume nem nº de anúncios — para isso, Nubi.
// Uso: npm run ml:semantica -- MLB277663 [--salvar produtos/x/raw/semantica.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ml, morrer } from './api.js';
import { lerEnv } from './auth.js';

const cat = process.argv[2];
const iSalvar = process.argv.indexOf('--salvar');
const destino = iSalvar > -1 ? process.argv[iSalvar + 1] : null;
if (!cat) morrer(new Error('Uso: npm run ml:semantica -- MLB277663   (o id sai de npm run ml:categoria)'));

try {
  const site = lerEnv().ML_SITE;
  const termos = await ml(`/trends/${site}/${cat}`);
  console.log(`\nTermos em tendência na categoria ${cat} — ${termos.length} no total:\n`);
  termos.forEach((t, i) => console.log(`${String(i + 1).padStart(3)}. ${t.keyword}`));
  if (destino) {
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify({ lido_em: new Date().toISOString(), categoria: cat, termos: termos.map((t) => t.keyword) }, null, 2));
    console.log(`\n✓ Salvo em ${destino}`);
  }
  console.log('\nComo usar: são candidatos a semântica. O ranking é do ML, sem volume nem nº de anúncios —');
  console.log('o sinal de "termo relevante com pouca concorrência" continua vindo do Nubimetrics.\n');
} catch (e) { morrer(e); }
