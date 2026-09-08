# Descoberta de concorrentes e leitura de avaliações
*Investigado em 30/08/2026, depois que o piloto do primeiro piloto mostrou que a descoberta era cega.*

## Problema 1 — achar quem realmente vende ✅ RESOLVIDO

### O que não funciona (testado até o fim)
| Caminho | Resultado |
|---|---|
| `/sites/MLB/search` com nosso token | **403** |
| `/sites/MLB/search` **sem token nenhum** | **403** — não é restrição do nosso app, é do endpoint |
| Página `lista.mercadolivre.com.br` navegada | Título carrega, **0 itens no DOM**, mesmo rolando 6× |
| Fetch da página de dentro da sessão logada | HTML vem, mas o dado está em serialização proprietária |
| `/highlights` da categoria | Só **5 produtos** para uma categoria de 121 mil itens |
| Subcategorias | MLB277663 **não tem filhas** — 121 mil itens num nível só |

### O que funciona: `npm run ml:descobrir`

```bash
npm run ml:descobrir -- MLB277663 "o primeiro piloto" "impermeabilizante laje" \
  --paginas 3 --min-visitas 100
```

Quatro etapas encadeadas:
1. **`/highlights`** da categoria (5 sementes)
2. **`/products/search` paginado** por termo genérico — varre o catálogo de verdade
3. **Expansão de família** (`parent_id` → `children_ids`) — é o que traz os **outros tamanhos**
4. **Filtro por vendedor ativo** — ~10% dos produtos de catálogo têm alguém vendendo

Depois rankeia por **visitas de 30 dias**.

**Resultado no piloto:** de **5** concorrentes para **175 com vendedor ativo**.

### Sobre "mínimo de 100 vendas"
O ML **não expõe `sold_quantity`** para item de terceiro. O substituto é **visitas**, que a API
entrega por anúncio e por dia. Use `--min-visitas` no lugar do corte por vendas.
É tráfego, não venda — mas ordena o mercado igualmente bem e é dado real, não estimativa.

### Anúncio tradicional — solução parcial encontrada (30/08)

**A página de vendedor renderiza sob automação**, ao contrário da busca:

```
https://lista.mercadolivre.com.br/_CustId_<SELLER_ID>
```

Testado: 48 anúncios com título e preço de um concorrente. Snippet em
[../coleta/snippets-chrome.md](../coleta/snippets-chrome.md), seção 1b.

**Fluxo:** `ml:descobrir` acha os catálogos → `ml:produto` dá os `seller_id` → a página de cada
vendedor entrega **todos** os anúncios dele, tradicionais inclusive.

**O que ainda escapa:** vendedor que só tem anúncio tradicional e **nunca** entrou em catálogo
— como TINTROX e ART FIX parecem ser. Para esses não há caminho: nem API, nem busca, nem
categoria. Só o operador colando a URL.

**Também testado e reprovado:** `/users/$ID/items/search` de terceiro (403), `_CategoryId_` na
lista (não renderiza), URL amigável da categoria (não renderiza).

---

## Problema 2 — avaliações com nota baixa ❌ NÃO EXISTE CAMINHO

### O que foi testado
| Caminho | Resultado |
|---|---|
| `/reviews/item/$ID` na API | 403 |
| `/reviews/search`, `/reviews/catalog_product/` | 404 |
| DOM da PDP | **5 avaliações, sempre as "mais úteis", sempre 4–5★** |
| Clicar "Mostrar todas as opiniões" | Vira 81 blocos no DOM, mas **os mesmos 5 únicos** (aninhamento) |
| Rolar a PDP 6× | Não carrega mais nenhuma |
| Página `/noindex/catalog/reviews/<PARENT_ID>` | Existe e responde 200, mas **não renderiza sob automação** |
| Inspeção de rede (XHR) | Nenhuma chamada de review capturada |

### A descoberta que fecha a questão
O HTML da PDP **carrega um JSON de avaliações**, e a distribuição de notas dentro dele é:

```
1★: 0   2★: 0   3★: 0   4★: 5   5★: 31
```

**Nenhuma avaliação de 1 a 3 estrelas está no payload.** Não é o nosso extrator que falha — o ML
não manda as negativas para o cliente nessa página. Não há o que raspar.

### O que dá para fazer
1. **Usar as 4★.** São 5 no payload e é onde aparece o "porém" — no piloto de coleta foi uma 4★
   que revelou *"é boa, porém tem pouco rendimento"*.
2. **Apoiar-se nas perguntas**, que a API entrega inteiras e sem filtro. No piloto, 34
   perguntas deram objeções melhores que as avaliações teriam dado.
3. **Humano no loop:** o operador abre o produto, filtra por nota na interface dele e cola. É o
   único caminho para as negativas hoje.
