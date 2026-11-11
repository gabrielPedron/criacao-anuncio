// Visitas reais de um anúncio nos últimos 30 dias — sinal de demanda que o ML entrega de graça.
// Desde outubro de 2026 só vale para anúncio da PRÓPRIA conta: o de outro vendedor dá 403
// (apurado em 11/11/2026). O bloqueio aparece escrito, nunca como "0 visitas".
// Uso: npm run ml:demanda -- MLB3921672257 (seu anúncio)
//      npm run ml:demanda -- MLB44202030   (produto de catálogo: mede cada anúncio que o ML deixar)
import { morrer, opc, visitas30d, AVISO_VISITAS } from './api.js';

const id = process.argv[2];
if (!id) morrer(new Error('Uso: npm run ml:demanda -- MLB3921672257 | MLB44202030'));
const num = (n) => n.toLocaleString('pt-BR');

try {
  // Se for produto de catálogo, mede cada item que compete nele.
  const lista = await opc(`/products/${id}/items?limit=20`);
  const ids = lista?.results?.length ? lista.results.map((i) => i.item_id) : [id];

  console.log(`\nVisitas nos últimos 30 dias — ${ids.length} anúncio(s):\n`);
  let soma = 0, medidos = 0, bloqueados = 0;
  for (const item of ids) {
    const v = await visitas30d(item);
    if (v?.bloqueado) { bloqueados++; console.log(`  ${item}  bloqueado (403: anúncio de outro vendedor)`); continue; }
    if (!v) { console.log(`  ${item}  (sem dado: erro na API)`); continue; }
    medidos++;
    const pico = v.dias.reduce((a, b) => (b.total > (a?.total ?? 0) ? b : a), null);
    soma += v.total;
    console.log(`  ${item}  ${num(v.total).padStart(8)} visitas  (média ${num(Math.round(v.total / 30))}/dia, pico ${num(pico?.total ?? 0)} em ${pico?.date?.slice(0, 10) ?? '-'})`);
  }
  // Sem nada medido, falha alto: um "0" aqui viraria "não tem demanda" no dossiê.
  if (!medidos && bloqueados) morrer(new Error(AVISO_VISITAS));
  if (medidos > 1) console.log(`\n  TOTAL dos ${medidos} anúncio(s) medidos: ${num(soma)} visitas em 30 dias`);
  if (bloqueados) console.log(`\n⚠ ${bloqueados} anúncio(s) ficaram de fora. ${AVISO_VISITAS}`);
  console.log('\nÉ tráfego, não venda — mas é o sinal de demanda mais direto que a API dá.\n');
} catch (e) { morrer(e); }
