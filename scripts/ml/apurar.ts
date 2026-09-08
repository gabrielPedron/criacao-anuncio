// CLI de apuração e auditoria da API do ML.
//   npm run ml:apurar -- /categories/MLB272198/attributes
//   npm run ml:apurar -- /products/MLB51958382 --termo "marca"
//   npm run ml:apurar -- /products/MLB51958382 --valor 189.9
//   npm run ml:apurar -- --glossario
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { apurar, conferirGlossario, buscarPorTermo, buscarPorValor, resumirAuditoria, GLOSSARIO } from "./apurador.ts";
import { morrer } from "./api.js";
import { args, pega } from "../cli.ts";

const tem = (f: string) => args.includes(f);

if (tem("--glossario")) {
  const ok = GLOSSARIO.filter((t) => t.confirmado).length;
  console.log(`\nGlossário PT ↔ Mercado Livre — ${GLOSSARIO.length} termos, ${ok} confirmados contra conta real\n`);
  console.log("| Como a gente fala | Caminho na API | Recurso | Confirmado |");
  console.log("|---|---|---|---|");
  for (const t of GLOSSARIO) {
    console.log(`| ${t.nosso} | \`${t.caminho}\` | \`${t.recurso}\` | ${t.confirmado ? "✅" : "—"} |${t.nota ? " " + t.nota : ""}`);
  }
  console.log("\n— = ainda não apareceu numa apuração real. Não é erro; é honestidade.\n");
  process.exit(0);
}

// No Git Bash do Windows, o MSYS converte "/products/x" em "C:/Program Files/Git/products/x".
// Só acontece quando o argumento não tem "?", o que torna a falha intermitente e confusa.
const RAIZES = ["products", "categories", "items", "users", "questions", "trends", "highlights", "sites", "reviews", "visits", "orders"];
function normalizarCaminho(bruto: string): string {
  let c = bruto.split("\\").join("/");
  const m = c.match(new RegExp("(?:^|/)(" + RAIZES.join("|") + ")(?:/|[?]|$)"));
  if (m && /^[A-Za-z]:\//.test(c)) c = c.slice(c.indexOf("/" + m[1]));  // desfaz a conversão do MSYS
  return c.startsWith("/") ? c : "/" + c;
}
const bruto = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const caminho = bruto ? normalizarCaminho(bruto) : undefined;
if (!caminho) morrer(new Error('Uso: npm run ml:apurar -- /caminho/da/api [--termo "x"] [--valor 23] [--repeticoes 3] [--salvar arq.json]\n   ou: npm run ml:apurar -- --glossario'));

try {
  const repeticoes = Number(pega("--repeticoes", "3"));
  console.log(`\nApurando ${caminho} — ${repeticoes} leituras espaçadas…`);
  const r = await apurar(caminho!, { repeticoes });

  const campos = (r.catalogo.campos ?? []) as any[];
  console.log(`\n✓ ${r.coleta.amostras.length} amostras, ${r.coleta.falhas.length} falhas, ${campos.length} campos distintos.`);
  if (r.coleta.respostasIdenticas) {
    console.log("  ⚠ As respostas vieram idênticas. Pode ser dado estável — ou cache respondendo o mesmo.");
    console.log("    Para separar os dois casos, repita esta apuração daqui a alguns minutos.");
  }

  console.log("\n" + resumirAuditoria(r.auditoria));

  const instaveis = r.auditoria.instaveis ?? [];
  if (instaveis.length) {
    console.log(`\n⚠ ${instaveis.length} campo(s) instável(is) — mudaram entre as leituras:`);
    instaveis.slice(0, 15).forEach((c: any) => console.log(`   ${c.caminho ?? c}`));
  } else {
    console.log("\n✓ Nenhum campo divergiu entre as leituras.");
  }

  const termo = pega("--termo");
  if (termo) {
    console.log(`\n🔎 Campos que falam de "${termo}":`);
    const achados = buscarPorTermo(r.catalogo, termo);
    if (!achados.length) console.log("   (nada — tente outro termo, ou amplie SINONIMOS_ML no glossario.ts)");
    achados.slice(0, 12).forEach((a: any) => {
      const c = a.campo?.caminho ?? a.campo?.caminhos?.[0] ?? a.caminho;
      const ex = a.campo?.exemplos?.slice(0, 2).map((v: any) => JSON.stringify(v)).join(" / ") ?? "";
      console.log(`   ${c}
      = ${ex.slice(0, 90)}${a.motivo ? `   (${a.motivo})` : ""}`);
    });
  }

  const valor = pega("--valor");
  if (valor) {
    console.log(`\n🔎 De onde veio o valor ${valor}:`);
    const achados = buscarPorValor(r.catalogo, isNaN(Number(valor)) ? valor : Number(valor));
    if (!achados.length) console.log("   (esse valor não apareceu em campo nenhum)");
    achados.slice(0, 12).forEach((a: any) => {
      const c = a.campo?.caminho ?? a.campo?.caminhos?.[0] ?? a.caminho;
      console.log(`   ${c}${a.motivo ? `   (${a.motivo})` : ""}`);
    });
  }

  // Confere o glossário contra a realidade
  const conferencia = conferirGlossario(r.catalogo, caminho!);
  const apareceram = conferencia.filter((c: any) => c.apareceu);
  if (conferencia.length) {
    console.log(`\n📖 Glossário deste recurso: ${apareceram.length} de ${conferencia.length} caminho(s) apareceram na apuração.`);
    conferencia.forEach((c: any) => console.log(`   ${c.apareceu ? "✅" : "❌"} ${c.nosso} → ${c.caminho}`));
    if (apareceram.length) console.log("\n   → Marque confirmado: true no glossario.ts SÓ para os ✅.");
  }

  const salvar = pega("--salvar");
  if (salvar) {
    mkdirSync(dirname(salvar), { recursive: true });
    writeFileSync(salvar, JSON.stringify({ caminho: r.caminho, catalogo: r.catalogo, auditoria: r.auditoria }, null, 2));
    console.log(`\n✓ Salvo em ${salvar}`);
  }
  console.log("");
} catch (e) { morrer(e as Error); }
