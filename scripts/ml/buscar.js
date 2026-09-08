// Busca por palavra-chave via catálogo (/products/search) — o substituto da busca
// de anúncios, que está bloqueada. Devolve produtos de catálogo do termo.
// ATENÇÃO: paging.total é fuzzy (termo inexistente devolve ~50). Serve como ordem
// de grandeza, NÃO como "nº de anúncios" do Nubimetrics.
// Uso: npm run ml:buscar -- "tinta emborrachada" [--categoria MLB277663] [--limit 10]
import { ml, morrer, opc } from './api.js';
import { lerEnv } from './auth.js';
import { args, brl, pega } from "../cli.ts";

const cat = pega('--categoria', null);
const limite = Number(pega('--limit', 10));
const termo = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')).join(' ').trim();
if (!termo) morrer(new Error('Uso: npm run ml:buscar -- "termo" [--categoria MLBxxxx] [--limit 10]'));


try {
  const site = lerEnv().ML_SITE;
  let url = `/products/search?site_id=${site}&q=${encodeURIComponent(termo)}&limit=${limite}`;
  if (cat) url += `&category_id=${cat}`;
  const r = await ml(url);

  console.log(`\n"${termo}" — ${r.results.length} produtos de catálogo (total aproximado: ${r.paging.total})\n`);
  console.log('| # | Produto | Vend. | Menor | Mediana | catalog_product_id |');
  console.log('|---|---|---|---|---|---|');
  for (const [n, p] of r.results.entries()) {
    const itens = await opc(`/products/${p.id}/items?limit=20`);
    const precos = (itens?.results ?? []).map((i) => i.price).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    const med = precos.length ? precos[Math.floor(precos.length / 2)] : null;
    console.log(`| ${n + 1} | ${p.name.slice(0, 50).replace(/\|/g, '/')} | ${precos.length} | ${brl(precos[0])} | ${brl(med)} | \`${p.id}\` |`);
  }
  console.log('\n→ Aprofundar: npm run ml:produto -- <catalog_product_id>');
  console.log('→ Fotos:      npm run ml:fotos -- <catalog_product_id>');
  console.log('→ Demanda:    npm run ml:demanda -- <catalog_product_id>\n');
} catch (e) { morrer(e); }
