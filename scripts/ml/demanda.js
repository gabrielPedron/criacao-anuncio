// Visitas reais de um anúncio nos últimos 30 dias — sinal de demanda que o ML entrega de graça.
// Uso: npm run ml:demanda -- MLB44202030   (produto de catálogo: mede todos os concorrentes)
//      npm run ml:demanda -- MLB3921672257 (item direto)
import { ml, morrer, opc } from './api.js';

const id = process.argv[2];
if (!id) morrer(new Error('Uso: npm run ml:demanda -- MLB44202030 | MLB3921672257'));
const num = (n) => n.toLocaleString('pt-BR');

try {
  // Se for produto de catálogo, mede cada item que compete nele.
  const lista = await opc(`/products/${id}/items?limit=20`);
  const ids = lista?.results?.length ? lista.results.map((i) => i.item_id) : [id];

  console.log(`\nVisitas nos últimos 30 dias — ${ids.length} anúncio(s):\n`);
  let soma = 0;
  for (const item of ids) {
    const v = await opc(`/items/${item}/visits/time_window?last=30&unit=day`);
    if (!v) { console.log(`  ${item}  (sem dado)`); continue; }
    const dias = v.results ?? [];
    const pico = dias.reduce((a, b) => (b.total > (a?.total ?? 0) ? b : a), null);
    soma += v.total_visits;
    console.log(`  ${item}  ${num(v.total_visits).padStart(8)} visitas  (média ${num(Math.round(v.total_visits / 30))}/dia, pico ${num(pico?.total ?? 0)} em ${pico?.date?.slice(0, 10) ?? '-'})`);
  }
  if (ids.length > 1) console.log(`\n  TOTAL do produto: ${num(soma)} visitas em 30 dias`);
  console.log('\nÉ tráfego, não venda — mas é o sinal de demanda mais direto que a API dá.\n');
} catch (e) { morrer(e); }
