// Medição de posição orgânica na primeira página, sem inferir alcance fora dela.
// npm run ml:posicao -- produtos/<slug> MLB123... "termo 1" ... "termo 5" [--arquivo raw/busca.json]
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { posicaoOrganica } from "./inteligencia.ts";
import { morrer } from "./api.js";
import { args, pega } from "../cli.ts";

const pasta = resolve(args[0] ?? "");
const id = (args[1] ?? "").toUpperCase();
const flag = args.indexOf("--arquivo");
const termos = args.slice(2, flag < 0 ? undefined : flag);
const arquivo = pega("--arquivo", "")!;
if (!/^MLB\d{8,}$/.test(id) || termos.length < 5 || !existsSync(join(pasta, "entrada.md")) || (flag >= 0 && !arquivo)) {
  morrer(new Error('Uso: npm run ml:posicao -- produtos/<slug> MLB123456789 "termo1" ... "termo5" [--arquivo caminho/busca.json]'));
}
try {
  let entrada = arquivo;
  if (!entrada) {
    entrada = join(pasta, "raw", `busca-posicao-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    mkdirSync(dirname(entrada), { recursive: true });
    // --recarregar: o histórico de posição precisa da busca de agora, não da guardada no cache.
    const r = spawnSync(process.execPath, [join(import.meta.dirname, "busca.ts"), ...termos, "--salvar", entrada, "--recarregar"], { encoding: "utf8" });
    if (r.status !== 0 || r.error) throw new Error(`Busca falhou: ${r.stderr || r.error || r.stdout}`);
  }
  const buscas = JSON.parse(readFileSync(resolve(entrada), "utf8")).buscas;
  if (!Array.isArray(buscas) || termos.some((t) => !buscas.some((b: any) => b.termo === t))) throw new Error("Arquivo sem todos os termos pedidos; histórico não alterado.");
  const data = new Date().toISOString();
  const linhas = termos.map((termo) => {
    const b = buscas.find((x: any) => x.termo === termo);
    const r = posicaoOrganica(b, id);
    console.log(`${termo}: ${r.posicao ?? "—"} (${r.estado}; somente primeira página)`);
    // Célula entre aspas, com aspas dobradas: o termo pode ter vírgula. CSV de propósito, para abrir na planilha.
    const celula = (s: string) => `"${s.replaceAll('"', '""')}"`;
    return [data, id, celula(termo), r.posicao ?? "", r.estado, celula(b.url ?? "")].join(",");
  });
  const destino = join(pasta, "posicao.csv");
  appendFileSync(destino, (existsSync(destino) ? "" : "lido_em,item_id,termo,posicao_organica,estado,url_busca\n") + linhas.join("\n") + "\n");
  console.log(`Histórico salvo: ${destino}`);
} catch (e: any) { morrer(e); }
