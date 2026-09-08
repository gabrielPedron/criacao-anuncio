// Baixa as fotos de um produto de catálogo para análise visual.
// O que a API não interpreta, o Claude Code lê depois com visão — sem Chrome, sem screenshot.
// Uso: npm run ml:fotos -- MLB44202030 [--dir produtos/x/raw/fotos]
import { writeFileSync, mkdirSync } from 'node:fs';
import { ml, morrer } from './api.js';

const args = process.argv.slice(2);
const iDir = args.indexOf('--dir');
const id = args[0];
if (!id) morrer(new Error('Uso: npm run ml:fotos -- MLB44202030 [--dir pasta]'));
const dir = iDir > -1 ? args[iDir + 1] : `produtos/_raw/${id}`;

try {
  const prod = await ml(`/products/${id}`);
  const urls = (prod.pictures ?? []).map((p) => p.url ?? p.secure_url).filter(Boolean);
  if (!urls.length) morrer(new Error('Esse produto não tem fotos no catálogo.'));
  mkdirSync(dir, { recursive: true });

  console.log(`\n${prod.name}\nBaixando ${urls.length} fotos para ${dir}/\n`);
  const salvas = [];
  for (const [i, url] of urls.entries()) {
    const r = await fetch(url);
    if (!r.ok) { console.log(`  ${i + 1}. ✗ http ${r.status}`); continue; }
    const nome = `${dir}/${String(i + 1).padStart(2, '0')}.jpg`;
    writeFileSync(nome, Buffer.from(await r.arrayBuffer()));
    salvas.push(nome);
    console.log(`  ${i + 1}. ✓ ${nome}`);
  }
  console.log(`\n✓ ${salvas.length} fotos. Agora peça a análise: o que cada uma argumenta, o que nenhuma diz (= lacuna visual).\n`);
} catch (e) { morrer(e); }
