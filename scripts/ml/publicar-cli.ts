// CLI da publicação. Sem flag, NÃO fala com a API — só monta e mostra.
import { carregarOferta, montarPayload, validar, publicar, enviarDescricao, subirFoto } from "./publicar.ts";
import { morrer } from "./api.js";

const args = process.argv.slice(2);
const pasta = args.find((a) => !a.startsWith("--"));
const querValidar = args.includes("--validar");
const querPublicar = args.includes("--publicar");
const confirmou = args.includes("--confirmo");

if (!pasta) morrer(new Error("Uso: npm run ml:publicar -- produtos/<slug> [--validar] [--publicar --confirmo]"));

try {
  const oferta = carregarOferta(pasta!);

  // Subir foto É ESCRITA no ML. Antes isso rodava no --validar com a confirmação cravada no
  // código — o comando que promete "não cria nada" criava. A regra do projeto é "escrita exige
  // confirmação explícita", não "validar nunca escreve": agora quem manda é o --confirmo.
  // Sem ele o dry-run roda sem fotos, e o ML vai reclamar que elas são obrigatórias — é o preço
  // honesto de não escrever sem permissão.
  const vaiSubirFotos = confirmou && oferta.fotos_locais?.length && !oferta.fotos?.length;
  if (vaiSubirFotos) {
    console.log(`\nSubindo ${oferta.fotos_locais!.length} fotos para o ML…`);
    oferta.fotos = [];
    for (const f of oferta.fotos_locais!) {
      const id = await subirFoto(f, confirmou);
      oferta.fotos.push(id);
      console.log(`  ✓ ${f.split(/[\/]/).pop()} → ${id}`);
    }
  } else if (oferta.fotos_locais?.length && !oferta.fotos?.length) {
    console.log(`\n⚠ ${oferta.fotos_locais.length} fotos locais NÃO foram enviadas — subir foto é escrita no ML.`);
    console.log(`  O dry-run vai rodar sem elas, e o ML reclama que foto é obrigatória.`);
    console.log(`  Para validar com as fotos de verdade: acrescente --confirmo.`);
  }

  const payload = montarPayload(oferta);

  console.log("\n=== PAYLOAD MONTADO (nada foi enviado) ===\n");
  console.log(JSON.stringify(payload, null, 2));
  const fam = (payload as any).family_name ?? "";
  console.log(`\nFamília (vira o título no fluxo User Products): ${fam} — ${fam.length}/60`);
  console.log(`Preço: ${oferta.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}  (informado por você)`);
  console.log(`Atributos preenchidos: ${payload.attributes.length}`);
  console.log(`Fotos: ${payload.pictures.length}`);
  console.log(`Descrição: ${oferta.descricao.length} caracteres (vai num segundo passo, após criar o item)`);

  // validar() NÃO lança quando o ML recusa — devolve {ok, erros, avisos}. Ler o .ok é obrigatório.
  let reprovado = false;
  if (querValidar) {
    console.log("\n=== DRY-RUN no ML (/items/validate — nao cria nada) ===");
    const v = await validar(payload);
    console.log(v.ok ? "✓ O ML aceitou o payload. Nenhum item foi criado." : "✗ O ML recusou:");
    v.erros.forEach((e: any) => console.log(`   erro : ${e.message}`));
    v.avisos.forEach((a: any) => console.log(`   aviso: ${a.message}`));
    reprovado = !v.ok;
    if (reprovado) process.exitCode = 1;
  }

  if (querPublicar) {
    if (reprovado) {
      console.log("\n⛔ O dry-run reprovou. Nao publico por cima de payload recusado.");
    } else if (!confirmou) {
      console.log("\n⛔ --publicar exige --confirmo junto. Isso CRIA o anúncio de verdade na sua conta.");
      process.exitCode = 1;
    } else {
      console.log("\n=== PUBLICANDO ===");
      const item: any = await publicar(payload, true);
      console.log(`✓ Anúncio criado: ${item.id}`);
      console.log(`  ${item.permalink}`);
      await enviarDescricao(item.id, oferta.descricao, confirmou);
      console.log("✓ Descrição enviada.");
    }
  }

  if (!querValidar && !querPublicar) {
    console.log("\n(nada foi enviado ao ML — use --validar para o dry-run)\n");
  }
} catch (e) { morrer(e as Error); }
