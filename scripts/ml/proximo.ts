// Sugere a próxima ação a partir dos arquivos locais; jamais publica ou aprova checkpoints.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { proximaAcao } from "./inteligencia.ts";
import { morrer } from "./api.js";
import { args } from "../cli.ts";

const pasta = resolve(args[0] ?? "");
if (!args[0] || !existsSync(pasta)) morrer(new Error("Uso: npm run ml:proximo -- produtos/<slug>"));
console.log(`Próxima ação: ${proximaAcao(pasta)}`);
console.log("Leia o arquivo do nicho (nichos/<nicho>.md) e as preferências do OPERACAO.md; hipóteses não são regras.");
console.log("Nenhuma etapa aprova catálogo, imagem ou publicação automaticamente.");
