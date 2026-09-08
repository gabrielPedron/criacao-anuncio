// Puxa o schema REAL de atributos de uma categoria do ML — a base da ficha técnica da Etapa B.
// Uso:
//   npm run ml:categoria -- "tinta borracha liquida"   (descobre a categoria pelo nome)
//   npm run ml:categoria -- MLB271599                  (categoria já conhecida)
//   ... -- MLB271599 --salvar produtos/tinta-borracha/ficha
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ml, morrer } from './api.js';
import { lerEnv } from './auth.js';

const args = process.argv.slice(2);
const iSalvar = args.indexOf('--salvar');
const destino = iSalvar > -1 ? args[iSalvar + 1] : null;
const entrada = (iSalvar > -1 ? args.slice(0, iSalvar) : args).join(' ').trim();
if (!entrada) morrer(new Error('Uso: npm run ml:categoria -- "nome do produto" | MLBxxxxx [--salvar caminho/arquivo]'));

const tag = (a, t) => Boolean(a.tags?.[t]);
const rotulo = (a) =>
  tag(a, 'required') ? 'OBRIGATORIO'
  : tag(a, 'catalog_required') ? 'catalogo'
  : 'opcional';

try {
  const site = lerEnv().ML_SITE;
  let categoryId = entrada;
  let caminho = null;

  if (!/^ML[A-Z]\d+$/i.test(entrada)) {
    const sugestoes = await ml(`/sites/${site}/domain_discovery/search?q=${encodeURIComponent(entrada)}&limit=5`);
    if (!sugestoes.length) morrer(new Error(`Nenhuma categoria sugerida para "${entrada}". Informe o MLB da categoria na mão.`));
    console.log(`\nCategorias sugeridas para "${entrada}":`);
    sugestoes.forEach((s, i) => console.log(`  ${i === 0 ? '→' : ' '} ${s.category_id}  ${s.category_name}  (domínio: ${s.domain_name})`));
    console.log('  (usando a primeira — a escolha final da categoria é sua; passe o MLB direto se preferir outra)');
    categoryId = sugestoes[0].category_id;
  }

  const [cat, atributos] = await Promise.all([
    ml(`/categories/${categoryId}`).catch(() => null),
    ml(`/categories/${categoryId}/attributes`),
  ]);
  caminho = cat?.path_from_root?.map((c) => c.name).join(' > ') ?? categoryId;

  const uteis = atributos.filter((a) => !tag(a, 'hidden') && !tag(a, 'read_only'));
  const ordem = { OBRIGATORIO: 0, catalogo: 1, opcional: 2 };
  uteis.sort((a, b) => ordem[rotulo(a)] - ordem[rotulo(b)] || a.name.localeCompare(b.name, 'pt-BR'));

  console.log(`\nCategoria: ${categoryId} — ${caminho}`);
  console.log(`Atributos preenchíveis: ${uteis.length} de ${atributos.length}\n`);
  console.log('| Atributo | ID | Exigência | Tipo | Valores aceitos (amostra) |');
  console.log('|---|---|---|---|---|');
  for (const a of uteis) {
    const valores = a.values?.length
      ? a.values.slice(0, 6).map((v) => v.name).join(' / ') + (a.values.length > 6 ? ` … (+${a.values.length - 6})` : '')
      : a.allowed_units?.length ? 'unidades: ' + a.allowed_units.map((u) => u.id).join(', ')
      : 'texto livre';
    console.log(`| ${a.name} | \`${a.id}\` | ${rotulo(a)} | ${a.value_type} | ${valores.replace(/\|/g, '/')} |`);
  }
  console.log(`\nVariações permitidas em: ${uteis.filter((a) => tag(a, 'allow_variations')).map((a) => a.name).join(', ') || '(nenhum)'}`);

  if (destino) {
    const arq = destino.endsWith('.json') ? destino : destino + '.json';
    mkdirSync(dirname(arq), { recursive: true });
    writeFileSync(arq, JSON.stringify({ categoryId, caminho, atributos: uteis }, null, 2));
    console.log(`\n✓ Schema salvo em ${arq}`);
  }
  console.log('');
} catch (e) { morrer(e); }
