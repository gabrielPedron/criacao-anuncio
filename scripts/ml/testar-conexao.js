// Passo 3: prova que a conexão está de pé + testa se a busca de itens está liberada.
import { ml, morrer } from './api.js';
import { lerEnv } from './auth.js';

try {
  const eu = await ml('/users/me');
  console.log(`\n✓ Autenticado como ${eu.nickname} (id ${eu.id}, ${eu.site_id}).`);

  const site = lerEnv().ML_SITE;
  process.stdout.write('  Testando /sites/' + site + '/search (descoberta de concorrentes)... ');
  try {
    const busca = await ml(`/sites/${site}/search?q=tinta&limit=1`);
    console.log(`✓ liberado — ${busca.paging?.total ?? '?'} resultados no teste.`);
  } catch (e) {
    console.log(`✗ ${e.status ?? 'erro'} — restrito (esperado). A descoberta vai por categoria → highlights: npm run ml:concorrentes.`);
  }

  process.stdout.write('  Testando /sites/' + site + '/domain_discovery/search (categoria)... ');
  try {
    await ml(`/sites/${site}/domain_discovery/search?q=tinta+borracha+liquida`);
    console.log('✓ liberado.');
  } catch (e) {
    console.log(`✗ ${e.status ?? 'erro'} — informe a categoria na mão em npm run ml:categoria.`);
  }
  console.log('');
} catch (e) { morrer(e); }
