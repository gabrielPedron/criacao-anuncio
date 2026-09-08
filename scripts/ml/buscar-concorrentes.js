// Descoberta de concorrentes. O ML bloqueia /sites/MLB/search para a maioria dos apps,
// então o caminho aberto é: categoria → mais vendidos (/highlights) → produtos de catálogo.
// Uso: npm run ml:concorrentes -- MLB277663
//      npm run ml:concorrentes -- "tinta borracha liquida"   (descobre a categoria antes)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ml, morrer, opc } from './api.js';
import { lerEnv } from './auth.js';
import { args, brl } from "../cli.ts";

const iSalvar = args.indexOf('--salvar');
const destino = iSalvar > -1 ? args[iSalvar + 1] : null;
const entrada = (iSalvar > -1 ? args.slice(0, iSalvar) : args).join(' ').trim();
if (!entrada) morrer(new Error('Uso: npm run ml:concorrentes -- MLB277663 | "nome do produto"'));


try {
  const site = lerEnv().ML_SITE;
  let cat = entrada;

  // Tentativa 1: a busca normal. Se estiver liberada pro app, é o melhor caminho.
  if (!/^ML[A-Z]\d+$/i.test(entrada)) {
    const busca = await opc(`/sites/${site}/search?q=${encodeURIComponent(entrada)}&limit=30`);
    if (busca?.results?.length) {
      console.log(`\n(busca liberada) "${entrada}" — ${busca.paging.total} anúncios`);
      busca.results.slice(0, 20).forEach((i, n) => console.log(`${n + 1}. ${brl(i.price)}  ${i.title}\n   ${i.permalink}`));
      process.exit(0);
    }
    const sug = await ml(`/sites/${site}/domain_discovery/search?q=${encodeURIComponent(entrada)}&limit=1`);
    if (!sug.length) morrer(new Error(`Sem categoria para "${entrada}". Passe o MLB da categoria.`));
    cat = sug[0].category_id;
    console.log(`\n(busca bloqueada — indo por categoria) ${cat} — ${sug[0].category_name}`);
  }

  const dest = await ml(`/highlights/${site}/category/${cat}`);
  const ids = (dest.content ?? []).filter((c) => c.type === 'PRODUCT').map((c) => c.id);
  console.log(`\nMais vendidos da categoria ${cat}: ${ids.length} produtos de catálogo.\n`);

  const linhas = [];
  for (const pid of ids.slice(0, 15)) {
    const [prod, lista] = await Promise.all([opc(`/products/${pid}`), opc(`/products/${pid}/items?limit=20`)]);
    if (!prod) continue;
    const precos = (lista?.results ?? []).map((i) => i.price).filter((n) => typeof n === 'number').sort((a, b) => a - b);
    linhas.push({
      catalog_product_id: pid,
      nome: prod.name,
      vendedores: precos.length,
      menor: precos[0] ?? null,
      mediana: precos.length ? precos[Math.floor(precos.length / 2)] : null,
      maior: precos.at(-1) ?? null,
      link: prod.permalink,
    });
  }

  console.log('| # | Produto | Vend. | Menor | Mediana | Maior |');
  console.log('|---|---|---|---|---|---|');
  linhas.forEach((l, n) =>
    console.log(`| ${n + 1} | ${l.nome.slice(0, 55).replace(/\|/g, '/')} | ${l.vendedores} | ${brl(l.menor)} | ${brl(l.mediana)} | ${brl(l.maior)} |`));

  const todas = linhas.map((l) => l.mediana).filter(Boolean).sort((a, b) => a - b);
  if (todas.length) console.log(`\nMediana das medianas (referência de faixa da categoria): ${brl(todas[Math.floor(todas.length / 2)])}`);
  console.log('\n→ Aprofundar num produto: npm run ml:produto -- <catalog_product_id>  (ficha, vendedores e perguntas)');
  console.log('→ Semântica da categoria:  npm run ml:semantica -- ' + cat);

  if (destino) {
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify({ categoria: cat, produtos: linhas }, null, 2));
    console.log(`\n✓ Salvo em ${destino}`);
  }
  console.log('');
} catch (e) { morrer(e); }
