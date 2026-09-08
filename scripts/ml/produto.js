// Dossiê de um produto de catálogo: ficha, fotos, quem compete e por quanto,
// e — o mais valioso — as PERGUNTAS dos compradores nos anúncios concorrentes.
// O ML bloqueia /items/$ID de terceiros, mas libera o catálogo e as perguntas;
// este script trabalha pelo caminho que está aberto.
// Uso: npm run ml:produto -- MLB44202030 [--salvar produtos/x/raw/prod.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ml, morrer, opc } from './api.js';
import { args, brl } from "../cli.ts";

const iSalvar = args.indexOf('--salvar');
const destino = iSalvar > -1 ? args[iSalvar + 1] : null;
const id = args[0];
if (!id) morrer(new Error('Uso: npm run ml:produto -- MLB44202030 [--salvar arquivo.json]'));


try {
  const prod = await ml(`/products/${id}`);
  const lista = await opc(`/products/${id}/items?limit=20`);
  const itens = (lista?.results ?? []).sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));

  // Perguntas dos 5 anúncios mais baratos — é onde a objeção real aparece.
  const perguntas = [];
  for (const it of itens.slice(0, 5)) {
    const q = await opc(`/questions/search?item=${it.item_id}&limit=50&api_version=4`);
    for (const p of q?.questions ?? []) {
      perguntas.push({ item: it.item_id, pergunta: p.text, resposta: p.answer?.text ?? null });
    }
  }

  const precos = itens.map((i) => i.price).filter((n) => typeof n === 'number').sort((a, b) => a - b);
  const mediana = precos.length ? precos[Math.floor(precos.length / 2)] : null;

  const dossie = {
    catalog_product_id: prod.id,
    nome: prod.name,
    dominio: prod.domain_id,
    link: prod.permalink,
    atributos: (prod.attributes ?? []).map((a) => ({ id: a.id, nome: a.name, valor: a.value_name })),
    main_features: (prod.main_features ?? []).map((f) => f.text),
    fotos: (prod.pictures ?? []).map((p) => p.url ?? p.secure_url),
    mediana,
    concorrentes: itens.map((i) => ({
      item_id: i.item_id, seller_id: i.seller_id, preco: i.price,
      frete_gratis: Boolean(i.shipping?.free_shipping),
      full: i.shipping?.logistic_type === 'fulfillment',
      loja_oficial: Boolean(i.official_store_id), garantia: i.warranty ?? null,
    })),
    perguntas,
  };

  console.log(`\n${dossie.nome}`);
  console.log(`${dossie.catalog_product_id} | ${dossie.fotos.length} fotos | ${itens.length} vendedores competindo`);
  console.log(`Preço: mediana ${brl(mediana)} | faixa ${brl(precos[0])} a ${brl(precos.at(-1))}`);

  console.log(`\nFicha do catálogo (${dossie.atributos.length} atributos):`);
  dossie.atributos.forEach((a) => console.log(`  ${a.nome}: ${a.valor}`));

  console.log('\n| Vendedor | Preço | Frete grátis | Full | Loja oficial |');
  console.log('|---|---|---|---|---|');
  dossie.concorrentes.slice(0, 12).forEach((c) =>
    console.log(`| ${c.seller_id} | ${brl(c.preco)} | ${c.frete_gratis ? 'sim' : 'não'} | ${c.full ? 'sim' : 'não'} | ${c.loja_oficial ? 'sim' : 'não'} |`));

  console.log(`\nPerguntas coletadas: ${perguntas.length} (de ${Math.min(5, itens.length)} anúncios) — matéria-prima das objeções:`);
  perguntas.slice(0, 15).forEach((p) => console.log(`  P: ${p.pergunta}`));
  if (perguntas.length > 15) console.log(`  … mais ${perguntas.length - 15}. Use --salvar pra ver todas.`);

  console.log('\n→ As FOTOS a API não interpreta: abra os links do JSON e olhe (aí sim visão).');

  if (destino) {
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify(dossie, null, 2));
    console.log(`\n✓ Salvo em ${destino}`);
  }
  console.log('');
} catch (e) { morrer(e); }
