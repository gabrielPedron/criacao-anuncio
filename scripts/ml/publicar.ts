// Montagem e publicação de anúncio. TUDO que escreve exige confirmação explícita.
//
// Fluxo:
//   npm run ml:publicar -- produtos/<slug>              → monta e MOSTRA o payload (não chama a API)
//   npm run ml:publicar -- produtos/<slug> --validar    → dry-run no ML (não cria nada)
//   npm run ml:publicar -- produtos/<slug> --publicar --confirmo   → cria o anúncio
import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { ml } from "./api.js";

export type Oferta = {
  titulo: string;
  /** Exigido pelo ML desde a migração User Products. Nome da família do produto. */
  family_name?: string;
  category_id: string;
  preco: number;              // informado pelo operador, nunca calculado
  quantidade: number;
  condicao?: "new" | "used";
  /** Obrigatório: muda comissão e parcelamento. CLAUDE.md — "nada disso se adivinha". */
  tipo_anuncio: "gold_special" | "gold_pro";   // clássico | premium
  descricao: string;
  atributos: { id: string; value_name: string }[];
  fotos?: string[];           // ids ou URLs já no ML
  fotos_locais?: string[];    // arquivos a subir antes de publicar
  video_id?: string | null;
};

const TIPOS_ANUNCIO = new Set(["gold_special", "gold_pro"]);
const DIMENSOES = [
  "SELLER_PACKAGE_HEIGHT", "SELLER_PACKAGE_WIDTH",
  "SELLER_PACKAGE_LENGTH", "SELLER_PACKAGE_WEIGHT",
] as const;

/** Lê produtos/<slug>/oferta.json e valida o que é obrigatório antes de falar com o ML. */
export function carregarOferta(pasta: string): Oferta {
  // Dois anúncios do mesmo produto (categorias diferentes) moram na mesma pasta,
  // cada um no seu json. Por isso aceita o caminho do arquivo direto.
  const arq = pasta.endsWith(".json") ? resolve(pasta) : resolve(pasta, "oferta.json");
  if (!existsSync(arq)) {
    throw new Error(`Falta ${arq}. A Fase 2 gera esse arquivo — ver docs/08-processo-completo.md.`);
  }
  const o = JSON.parse(readFileSync(arq, "utf8")) as Oferta;

  const faltando: string[] = [];
  if (!o.titulo?.trim()) faltando.push("titulo");
  if (!o.category_id?.trim()) faltando.push("category_id");
  if (typeof o.preco !== "number" || o.preco <= 0) faltando.push("preco (informado por você, não calculado)");
  if (typeof o.quantidade !== "number" || o.quantidade < 1) faltando.push("quantidade");
  if (!o.descricao?.trim()) faltando.push("descricao");

  // CLAUDE.md, "Perguntar sempre antes de publicar": preco, estoque, classico/premium,
  // dimensoes e peso bruto — "nada disso se adivinha". Antes o codigo assumia gold_special
  // em silencio e nao olhava as dimensoes; as duas coisas mudam quanto o anuncio custa.
  if (!TIPOS_ANUNCIO.has(o.tipo_anuncio as string)) {
    faltando.push(
      `tipo_anuncio (${[...TIPOS_ANUNCIO].join(" ou ")}) — muda comissão e parcelamento, ` +
      `pergunte, não assuma`,
    );
  }
  const temAtributo = new Set((o.atributos ?? []).map((a) => a.id));
  const dimensoesFaltando = [...DIMENSOES].filter((d) => !temAtributo.has(d));
  if (dimensoesFaltando.length) {
    faltando.push(`${dimensoesFaltando.join(", ")} — o ML exige, e define o custo do frete`);
  }

  if (faltando.length) throw new Error(`oferta.json incompleto — falta: ${faltando.join(", ")}`);

  if (o.titulo.length > 60) {
    console.warn(`⚠ Título com ${o.titulo.length} caracteres. O ML corta em 60.`);
  }
  avisarSobreDescricao(o.descricao);
  return o;
}

/**
 * Avisos de estilo da descrição (CLAUDE.md: texto corrido, sem bullet/emoji, sem método de envio).
 * São AVISOS, não erros: em `recriar` a descrição vem de um anúncio já publicado, e travar
 * impediria consertar um título — que é justamente para o que o `recriar` existe.
 */
export function avisarSobreDescricao(texto: string) {
  if (/[•▪●]|\p{Extended_Pictographic}/u.test(texto)) {
    console.warn("⚠ A descrição tem bullet ou emoji. A regra do projeto é texto corrido.");
  }
  if (/full|fulfillment|agência|agencia/i.test(texto)) {
    console.warn("⚠ A descrição cita método de envio. A regra do projeto é não citar — o ML implica.");
  }
}

/** Monta o payload do item. Não chama a API. */
export function montarPayload(o: Oferta) {
  // Fluxo User Products: quando se manda family_name, o ML RECUSA o title —
  // ele monta o título a partir da família + atributos. Testado em 31/08/2026.
  // O ML ACRESCENTA COLOR + FINISH no fim do titulo (docs/16: familia de 60 saiu com 73).
  // Como o titulo e irreversivel depois de publicado, cortar em silencio e inaceitavel:
  // quem escolhe o que sai e o humano, nao o slice.
  const familia = o.family_name ?? o.titulo;
  if (familia.length > 60) {
    throw new Error(
      `family_name com ${familia.length} caracteres; o ML aceita 60.
` +
      `  "${familia}"
` +
      `  Encurte no oferta.json. O titulo e IRREVERSIVEL depois de publicado (docs/16), ` +
      `e o ML ainda acrescenta COLOR + FINISH no fim.`,
    );
  }

  return {
    family_name: familia,
    category_id: o.category_id,
    price: o.preco,
    currency_id: "BRL",
    available_quantity: o.quantidade,
    buying_mode: "buy_it_now",
    condition: o.condicao ?? "new",
    listing_type_id: o.tipo_anuncio,
    pictures: (o.fotos ?? []).map((f) => (/^https?:/.test(f) ? { source: f } : { id: f })),
    attributes: o.atributos ?? [],
    ...(o.video_id ? { video_id: o.video_id } : {}),
  };
}

/**
 * Dry-run: o ML valida o payload e NÃO cria nada.
 * ATENÇÃO: /items/validate devolve HTTP 400 mesmo quando só existem WARNINGS.
 * Só é reprovação de verdade quando há causa com type "error".
 */
export async function validar(payload: unknown): Promise<{ ok: boolean; erros: any[]; avisos: any[] }> {
  try {
    // Unico POST auto-confirmado do arquivo, e de proposito: /items/validate NAO cria nada — e o
    // proprio dry-run. Exigir --confirmo aqui tornaria impossivel conferir um payload antes de
    // publicar, que e a trava de seguranca que mais importa.
    await ml("/items/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      confirmadoPeloHumano: true,
    } as any);
    return { ok: true, erros: [], avisos: [] };
  } catch (e: any) {
    const m = String(e.message).match(/\{[\s\S]*\}$/);
    let causas: any[] = [];
    try { causas = JSON.parse(m?.[0] ?? "{}").cause ?? []; } catch {}
    const erros = causas.filter((c) => c.type === "error");
    const avisos = causas.filter((c) => c.type === "warning");
    if (!causas.length) throw e;              // erro que não sabemos ler: propaga
    return { ok: erros.length === 0, erros, avisos };
  }
}

/** CRIA o anúncio. Só com confirmação explícita do operador na conversa. */
export async function publicar(payload: unknown, confirmado: boolean) {
  if (!confirmado) throw new Error("publicar() sem confirmação. Isso cria anúncio de verdade.");
  const item = await ml("/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    confirmadoPeloHumano: true,
  } as any);
  return item;
}

/** A descrição vai num recurso separado, depois do item criado. Escrita — exige confirmação. */
export async function enviarDescricao(itemId: string, texto: string, confirmado: boolean) {
  if (!confirmado) throw new Error("enviarDescricao() sem confirmação. Isso grava no anúncio.");
  return ml(`/items/${itemId}/description`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plain_text: texto }),
    confirmadoPeloHumano: true,
  } as any);
}

/** Sobe uma foto local para o ML e devolve o id. Escrita — exige confirmação. */
export async function subirFoto(caminho: string, confirmado: boolean) {
  if (!confirmado) throw new Error("subirFoto() sem confirmação.");
  const form = new FormData();
  const bin = readFileSync(caminho);
  form.append("file", new Blob([bin], { type: "image/png" }), basename(caminho));

  // Passa pelo ml() de proposito: e la que mora a trava de escrita (api.js).
  // Sem content-type — o fetch monta o boundary do multipart sozinho.
  const d: any = await ml("/pictures/items/upload", {
    method: "POST",
    body: form,
    confirmadoPeloHumano: true,
  } as any);
  return d.id as string;
}
