// Dicionário de equivalências para a busca reversa.
//
// Serve exatamente para o problema de vocabulário: a gente diz "reclamação",
// a API diz `claims`; a gente diz "estoque", a API diz `available_quantity`.
// Cada linha é um grupo de termos equivalentes — procurar por qualquer um
// deles procura por todos.
//
// Não conhece nenhuma API específica: é vocabulário de e-commerce e de API em
// geral. Integrações específicas passam grupos extras em `opcoes.sinonimos`.

export const GRUPOS_DE_SINONIMOS: string[][] = [
  ["venda", "vendas", "vendido", "pedido", "pedidos", "order", "orders", "sale", "sales", "sold"],
  ["produto", "produtos", "anuncio", "anuncios", "item", "items", "listing", "listings"],
  ["titulo", "nome", "title", "name"],
  ["descricao", "description", "plain", "text"],
  ["preco", "precos", "valor", "price", "prices", "amount"],
  ["desconto", "discount", "deal", "promocao", "promotion", "campaign"],
  ["moeda", "currency"],
  ["estoque", "quantidade", "disponivel", "quantity", "available", "stock", "size"],
  ["total", "totais", "count", "soma"],
  ["status", "situacao", "estado", "state", "substatus"],
  ["envio", "entrega", "frete", "shipping", "shipment", "delivery", "logistic"],
  ["full", "fulfillment", "flex", "self_service", "cross_docking", "drop_off"],
  ["rastreio", "rastreamento", "tracking", "codigo"],
  ["endereco", "address", "receiver", "destino"],
  ["cliente", "comprador", "buyer", "customer"],
  ["vendedor", "seller", "loja", "store"],
  ["reputacao", "reputation", "level", "nivel", "medalha", "power_seller", "thermometer"],
  ["reclamacao", "reclamacoes", "claim", "claims", "disputa", "dispute"],
  ["devolucao", "devolucoes", "return", "returns", "troca", "refund", "estorno"],
  ["cancelamento", "cancelado", "cancellation", "cancellations", "canceled", "cancelled"],
  ["atraso", "atrasado", "delay", "delayed", "handling", "late"],
  ["mediacao", "mediation", "intervencao"],
  ["avaliacao", "nota", "rating", "ratings", "review", "reviews", "feedback"],
  ["positivo", "positive", "negativo", "negative", "neutro", "neutral"],
  ["pergunta", "perguntas", "duvida", "question", "questions", "answer", "resposta"],
  ["mensagem", "mensagens", "message", "messages", "conversa", "attachment", "anexo"],
  ["visita", "visitas", "visualizacao", "visit", "visits", "view", "views"],
  ["conversao", "conversion", "taxa", "rate", "percentual", "percentage", "ratio"],
  ["publicidade", "anuncio_pago", "ads", "advertising", "campanha", "campaign"],
  ["clique", "cliques", "click", "clicks"],
  ["impressao", "impressoes", "impression", "impressions", "print", "prints"],
  ["investimento", "gasto", "custo", "cost", "spend", "budget", "orcamento"],
  ["acos", "roas", "retorno"],
  ["comissao", "tarifa", "taxa_ml", "fee", "fees", "charge", "charges"],
  ["imposto", "tax", "taxes"],
  ["pagamento", "payment", "payments", "pago", "paid"],
  ["nota_fiscal", "invoice", "billing", "fatura"],
  ["categoria", "category", "categories", "domain", "dominio"],
  ["atributo", "atributos", "attribute", "attributes", "ficha", "especificacao"],
  ["variacao", "variacoes", "variation", "variations", "grade"],
  ["foto", "fotos", "imagem", "imagens", "picture", "pictures", "thumbnail", "image"],
  ["saude", "qualidade", "health", "quality"],
  ["data", "date", "created", "criacao", "criado", "updated", "atualizado", "closed", "time"],
  ["identificador", "id", "identifier", "codigo", "code"],
  ["catalogo", "catalog", "concorrencia", "competition", "buybox", "winner"],
  ["posicao", "ranking", "position", "rank", "highlight", "destaque", "trend", "tendencia"],
  ["ativo", "pausado", "encerrado", "active", "paused", "closed", "under_review"],
  ["tipo", "type", "kind", "modo", "mode"],
  ["link", "url", "permalink", "endereco_web"],
];

const INDICE = (() => {
  const mapa = new Map<string, Set<string>>();
  for (const grupo of GRUPOS_DE_SINONIMOS) {
    for (const termo of grupo) {
      let conjunto = mapa.get(termo);
      if (!conjunto) {
        conjunto = new Set();
        mapa.set(termo, conjunto);
      }
      for (const outro of grupo) conjunto.add(outro);
    }
  }
  return mapa;
})();

function indiceDe(grupos: string[][]): Map<string, Set<string>> {
  if (grupos === GRUPOS_DE_SINONIMOS) return INDICE;
  const mapa = new Map(Array.from(INDICE, ([k, v]) => [k, new Set(v)]));
  for (const grupo of grupos) {
    for (const termo of grupo) {
      let conjunto = mapa.get(termo);
      if (!conjunto) {
        conjunto = new Set();
        mapa.set(termo, conjunto);
      }
      for (const outro of grupo) conjunto.add(outro);
    }
  }
  return mapa;
}

/**
 * Devolve o termo mais tudo que é equivalente a ele. O termo original vem
 * sempre em primeiro — quem pontua a busca usa isso para dar mais peso ao
 * acerto exato do que ao acerto por sinônimo.
 */
export function expandir(termo: string, grupos: string[][] = GRUPOS_DE_SINONIMOS): string[] {
  const mapa = grupos === GRUPOS_DE_SINONIMOS ? INDICE : indiceDe(grupos);
  const equivalentes = mapa.get(termo);
  if (!equivalentes) return [termo];
  return [termo, ...Array.from(equivalentes).filter((t) => t !== termo)];
}
