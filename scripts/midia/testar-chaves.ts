// Confere se a chave de mídia funciona — SEM gerar nada, SEM gastar crédito.
// Só lista os modelos disponíveis, que é chamada gratuita.
//
// Só OpenAI: a geração de imagem roda por lá (docs/08) e vídeo é manual por decisão
// (docs/07, item "Vídeo"), então não há chave do Google para testar.
import { lerEnv } from "../ml/auth.js";

const env: any = lerEnv();

async function testarOpenAI(chave: string) {
  const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${chave}` } });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, erro: `${r.status} ${d?.error?.message ?? ""}`.slice(0, 160) };
  const nomes = (d.data ?? []).map((m: any) => m.id);
  return { ok: true, total: nomes.length, imagem: nomes.filter((n: string) => /image|dall/i.test(n)).slice(0, 6) };
}

console.log("");
if (!env.OPENAI_API_KEY) {
  console.log("⏭  OpenAI: sem OPENAI_API_KEY no .env.");
} else {
  // Nunca imprimir pedaço da chave, nem o tamanho: só se está lá ou não.
  // Esta saída aparece em gravação de tela e em log.
  process.stdout.write("   OpenAI: chave presente … ");
  try {
    const r: any = await testarOpenAI(env.OPENAI_API_KEY);
    if (r.ok) {
      console.log(`✓ ${r.total} modelos`);
      if (r.imagem?.length) console.log(`      imagem: ${r.imagem.join(", ")}`);
    } else {
      console.log(`✗ ${r.erro}`);
      process.exitCode = 1;
    }
  } catch (e: any) {
    console.log(`✗ ${e.message.slice(0, 120)}`);
    process.exitCode = 1;
  }
}
console.log("\nEste teste só LISTA modelos — não gera imagem, não gasta crédito.\n");
