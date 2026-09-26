// Recebe as melhorias publicadas no repositório sem tocar no que é seu.
//
//   npm run atualizar
//
// .env, .tokens.json, OPERACAO.md e produtos/ estão no .gitignore: o git não mexe neles.
// O que trava a atualização é arquivo DO PROJETO alterado na sua máquina — por isso a
// personalização da operação mora no OPERACAO.md, não no CLAUDE.md/AGENTS.md.
import { execFileSync } from "node:child_process";
import { RAIZ } from "./ml/auth.js";

const git = (...a: string[]) => execFileSync("git", a, { cwd: RAIZ, encoding: "utf8" }).trim();

try {
  git("--version");
} catch {
  console.error("\n✗ Git não encontrado. Instale em git-scm.com e abra o PowerShell de novo.\n");
  process.exit(1);
}

const alterados = git("status", "--porcelain", "--untracked-files=no");
if (alterados) {
  console.error("\n✗ Estes arquivos do projeto foram alterados na sua máquina:\n");
  console.error(alterados.split("\n").map((l) => "    " + l.slice(3)).join("\n"));
  console.error("\n  A atualização parou para não apagar nada. Peça à IA do projeto:");
  console.error('  "Quero atualizar o projeto. Mova minhas personalizações para o OPERACAO.md');
  console.error('   e desfaça as alterações nos arquivos do projeto."\n');
  process.exit(1);
}

const antes = git("rev-parse", "HEAD");
try {
  git("pull", "--ff-only");
} catch (e: any) {
  console.error(`\n✗ Não foi possível baixar a atualização:\n  ${String(e.stderr || e.message).trim().split("\n")[0]}`);
  console.error("  Confira a internet e mande esta mensagem para a IA do projeto.\n");
  process.exit(1);
}

const depois = git("rev-parse", "HEAD");
if (antes === depois) {
  console.log("\n✓ Você já está na versão mais recente.\n");
} else {
  console.log("\n✓ Projeto atualizado. O que mudou:\n");
  console.log(git("log", "--format=  - %s", `${antes}..${depois}`));
  console.log("\n  Rode agora: npm.cmd run verificar\n");
}
