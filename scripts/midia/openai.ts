// Cliente de imagem da OpenAI (gpt-image-1). Sem dependências — FormData e Blob nativos.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { lerEnv } from "../ml/auth.js";

const BASE = "https://api.openai.com/v1";

function chave(): string {
  const k = (lerEnv() as any).OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY vazia no .env. Ver docs/12-conectar-ias-de-midia.md.");
  return k;
}

export type OpcoesImagem = {
  /** gpt-image-2 aceita 1200x1200 (testado). O gpt-image-1 nao passa de 1024. */
  tamanho?: string;
  qualidade?: "low" | "medium" | "high" | "auto";
  modelo?: string;
};

/** Gera a partir de UMA OU MAIS fotos base (endpoint de edits). É o nosso caso. */
export type ResultadoImagem = { bin: Buffer; uso: any };

export async function gerarDeFotoBase(prompt: string, fotos: string[], op: OpcoesImagem = {}): Promise<ResultadoImagem> {
  if (!fotos.length) throw new Error("Nenhuma foto base informada.");
  const form = new FormData();
  form.append("model", op.modelo ?? "gpt-image-2");
  form.append("prompt", prompt);
  form.append("size", op.tamanho ?? "1200x1200");
  form.append("quality", op.qualidade ?? "medium");
  form.append("n", "1");
  for (const caminho of fotos) {
    const bin = readFileSync(caminho);
    const ext = caminho.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    form.append("image[]", new Blob([bin], { type: ext }), basename(caminho));
  }

  const r = await fetch(`${BASE}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${chave()}` },
    body: form,
  });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${d?.error?.message ?? JSON.stringify(d).slice(0, 300)}`);
  const b64 = d?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Resposta sem imagem: ${JSON.stringify(d).slice(0, 300)}`);
  return { bin: Buffer.from(b64, "base64"), uso: d?.usage ?? null };
}

/**
 * Custo por imagem medido numa conta real em 31/08/2026:
 * US$ 1,77 para 8 gerações = ~US$ 0,22 por imagem (gpt-image-2, 1200x1200, high).
 * Serve como estimativa; a fonte de verdade é platform.openai.com/usage.
 */
export const USD_POR_IMAGEM = 0.221;

/** Resume o consumo de tokens de uma geração, para acompanhar o gasto. */
export function resumirUso(uso: any): string {
  if (!uso) return "(a API não informou consumo)";
  const e = uso.input_tokens_details ?? {};
  return `${uso.total_tokens ?? "?"} tokens · ~US$ ${USD_POR_IMAGEM.toFixed(2)} (entrada ${uso.input_tokens ?? "?"}` +
    (e.image_tokens != null ? `, sendo ${e.image_tokens} de imagem` : "") +
    ` · saída ${uso.output_tokens ?? "?"})`;
}
