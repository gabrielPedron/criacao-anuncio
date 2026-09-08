// Glossário PT ↔ Mercado Livre, específico da criação de anúncios.
//
// REGRA DE HONESTIDADE: `confirmado` só vira true depois que o caminho apareceu
// numa apuração contra a conta real (npm run ml:apurar). Caminho tirado de
// documentação ou de memória NÃO conta como confirmado.

export type Termo = {
  /** Como o operador e eu falamos na conversa. */
  nosso: string;
  /** Caminho real na resposta da API. */
  caminho: string;
  /** Em qual recurso esse caminho aparece. */
  recurso: string;
  /** Só true se apareceu numa apuração real. */
  confirmado: boolean;
  nota?: string;
};

export const GLOSSARIO: Termo[] = [
  // --- oferta e preço ---
  { nosso: "preço", caminho: "results[].price", recurso: "/products/$CATALOGO/items", confirmado: true },
  { nosso: "preço cheio / de", caminho: "results[].original_price", recurso: "/products/$CATALOGO/items", confirmado: true },
  { nosso: "título", caminho: "name", recurso: "/products/$CATALOGO", confirmado: true },
  { nosso: "garantia", caminho: "results[].warranty", recurso: "/products/$CATALOGO/items", confirmado: true },

  // --- quem é o concorrente ---
  { nosso: "vendedor", caminho: "results[].seller_id", recurso: "/products/$CATALOGO/items", confirmado: true },
  { nosso: "loja oficial", caminho: "results[].official_store_id", recurso: "/products/$CATALOGO/items", confirmado: true, nota: "null = não é loja oficial" },
  { nosso: "frete grátis", caminho: "results[].shipping.free_shipping", recurso: "/products/$CATALOGO/items", confirmado: true },
  { nosso: "é Full?", caminho: "results[].shipping.logistic_type", recurso: "/products/$CATALOGO/items", confirmado: true, nota: "'fulfillment' = Full" },

  // --- ficha técnica ---
  { nosso: "ficha técnica (schema da categoria)", caminho: "[].id", recurso: "/categories/$CAT/attributes", confirmado: true },
  { nosso: "atributo obrigatório", caminho: "[].tags.required", recurso: "/categories/$CAT/attributes", confirmado: true },
  { nosso: "obrigatório só no catálogo", caminho: "[].tags.catalog_required", recurso: "/categories/$CAT/attributes", confirmado: true },
  { nosso: "aceita variação", caminho: "[].tags.allow_variations", recurso: "/categories/$CAT/attributes", confirmado: true },
  { nosso: "valores aceitos", caminho: "[].values[].name", recurso: "/categories/$CAT/attributes", confirmado: true },
  { nosso: "ficha preenchida do concorrente", caminho: "attributes[].value_name", recurso: "/products/$CATALOGO", confirmado: true },
  { nosso: "marca", caminho: "attributes[id=BRAND].value_name", recurso: "/products/$CATALOGO", confirmado: true },

  // --- demanda e prova ---
  { nosso: "visitas", caminho: "total_visits", recurso: "/items/$ITEM/visits/time_window", confirmado: true },
  { nosso: "visitas por dia", caminho: "results[].total", recurso: "/items/$ITEM/visits/time_window", confirmado: true },
  { nosso: "perguntas", caminho: "questions[].text", recurso: "/questions/search?item=$ITEM", confirmado: true },
  { nosso: "resposta do vendedor", caminho: "questions[].answer.text", recurso: "/questions/search?item=$ITEM", confirmado: true },
  { nosso: "total de perguntas", caminho: "total", recurso: "/questions/search?item=$ITEM", confirmado: true },

  // --- descoberta ---
  { nosso: "mais vendidos da categoria", caminho: "content[].id", recurso: "/highlights/MLB/category/$CAT", confirmado: true },
  { nosso: "termos em tendência", caminho: "[].keyword", recurso: "/trends/MLB/$CAT", confirmado: true },
  { nosso: "fotos do catálogo", caminho: "pictures[].url", recurso: "/products/$CATALOGO", confirmado: true },

  // --- bloqueados: registrados para ninguem tentar de novo ---
  { nosso: "avaliações", caminho: "—", recurso: "/reviews/item/$ITEM", confirmado: false, nota: "403 — só pelo Chrome. Ver docs/06." },
  { nosso: "busca por termo", caminho: "—", recurso: "/sites/MLB/search", confirmado: false, nota: "403 para este app. Ver docs/06." },
  { nosso: "ficha do item de terceiro", caminho: "—", recurso: "/items/$ITEM", confirmado: false, nota: "403 com e sem token. Política do ML." },
];

/** Sinônimos de e-commerce específicos do ML, somados aos do núcleo. */
export const SINONIMOS_ML: string[][] = [
  ["catalogo", "catalog", "produto de catalogo", "pdp"],
  ["full", "fulfillment", "logistic type", "logistica"],
  ["anuncio", "item", "listing", "publicacao"],
  ["ficha", "atributos", "attributes", "ficha tecnica"],
  ["visitas", "visits", "trafego", "acessos"],
  ["pergunta", "question", "duvida"],
  ["vendedor", "seller", "lojista"],
  ["categoria", "category", "domain"],
  ["tendencia", "trend", "keyword", "termo"],
  ["mais vendidos", "highlights", "best seller", "destaque"],
];

/** Recursos que valem apurar neste projeto. $VAR é substituído pelo CLI. */
export const RECURSOS_SUGERIDOS = [
  "/users/me",
  "/categories/$CAT/attributes",
  "/products/$CATALOGO",
  "/products/$CATALOGO/items?limit=20",
  "/questions/search?item=$ITEM&limit=50&api_version=4",
  "/items/$ITEM/visits/time_window?last=30&unit=day",
  "/highlights/MLB/category/$CAT",
  "/trends/MLB/$CAT",
];
