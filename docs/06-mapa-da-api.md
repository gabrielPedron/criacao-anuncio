# Mapa da API do ML — o que está aberto e o que está bloqueado
*Testado em 25/08/2026 com um app próprio no site MLB, permissões Comunicações=Leitura e Publicação=Leitura.*
*Leia antes de escrever chamada nova — metade do que parece óbvio está fechado.*

## Bloqueado (403)

| Endpoint | O que seria | Plano B |
|---|---|---|
| `/sites/MLB/search` | busca de anúncios por termo | `/products/search` (busca no catálogo) + `/highlights` |
| `/items/$ID` de terceiros | ficha e título de um concorrente | `/products/$ID` + `/products/$ID/items` |
| `/reviews/item/$ID` | avaliações de um concorrente | **Chrome** (skill `leitor-de-sites`) |

`/items/$ID` de terceiro dá 403 **com e sem token** — não é permissão do app, é política do ML. Não insista.

## Aberto e em uso

| Endpoint | Devolve | Script |
|---|---|---|
| `/users/me` | identifica a conta | `ml:teste` |
| `/sites/MLB/domain_discovery/search?q=` | categoria sugerida a partir do nome | `ml:categoria` |
| `/categories/$ID/attributes` | **schema real da ficha** — obrigatórios, valores aceitos, unidades | `ml:categoria` |
| `/trends/MLB/$CAT` | ~50 termos em tendência na categoria | `ml:semantica` |
| `/highlights/MLB/category/$CAT` | mais vendidos (ids de produto de catálogo) | `ml:concorrentes` |
| `/products/$CATALOG_ID` | nome, ficha, fotos, main_features do catálogo | `ml:produto` |
| `/products/$CATALOG_ID/items` | **quem compete e por quanto** — preço, seller, frete, Full, loja oficial | `ml:produto` |
| `/questions/search?item=$ITEM` | **perguntas e respostas** — as objeções reais | `ml:produto` |
| `/products/search?site_id=MLB&q=` | **busca por palavra-chave** no catálogo | `ml:buscar` |
| `/items/$ID/visits/time_window?last=30&unit=day` | **visitas reais em 30 dias**, série diária | `ml:demanda` |
| `/visits/items?ids=` | visitas acumuladas do anúncio | `ml:demanda` |
| `/items/$ID/description` | descrição (às vezes vazia: muita loja usa imagem) | — |
| `/users/$MEU_ID/items/search` | meus próprios anúncios | — |

## O caminho que funciona

```
nome do produto
  └─ ml:categoria   → category_id + schema da ficha
       ├─ ml:semantica    → termos em tendência (candidatos a semântica)
       ├─ ml:buscar       → busca por palavra-chave no catálogo
       └─ ml:concorrentes → mais vendidos + faixa de preço
            ├─ ml:produto → ficha, vendedores, preços e PERGUNTAS
            ├─ ml:fotos   → baixa as fotos → análise visual por código
            └─ ml:demanda → visitas em 30 dias de cada concorrente
```

## O que isso muda no processo

- **Preço de referência** sai da API (mediana real dos vendedores do catálogo), não de estimativa.
- **Cobertura de ficha** é medida contra o schema verdadeiro da categoria.
- **Objeções** vêm das perguntas por API — era o item mais caro de colher na mão.
- **Semântica** ganha um sinal grátis (`/trends`), mas **sem volume e sem nº de anúncios**. O sinal de "termo relevante com pouca concorrência", que decide a lacuna, continua sendo Nubimetrics.

## Armadilha do `/products/search`

O `paging.total` é **fuzzy**: um termo inexistente devolve ~50 resultados, e termos comuns batem no teto de 10.000. Serve como ordem de grandeza, **não** como o "nº de anúncios" do Nubimetrics. Os *resultados* são bons; a *contagem* não é.

Além disso, muito produto de catálogo vem com **0 vendedores ativos** — por isso `ml:concorrentes` (via `/highlights`) é melhor pra achar quem realmente vende, e `ml:buscar` é melhor pra varrer um termo.

## Ainda no Chrome

1. **Avaliações** dos concorrentes — `/reviews/*` dá 403/404 na API, mas a **página de anúncio renderiza normal** e a extração funciona. Snippet pronto em [../coleta/snippets-chrome.md](../coleta/snippets-chrome.md).

> **Busca por termo foi testada no Chrome e não funciona** — nem navegando (resultados nunca renderizam) nem por fetch (serialização proprietária). Fica na API, via catálogo.

> **Fotos saíram do Chrome:** `ml:fotos` baixa os arquivos e o Claude Code lê com visão direto. Não precisa de navegador nem screenshot.

Snippets em [../coleta/snippets-chrome.md](../coleta/snippets-chrome.md).

## Escrita

`scripts/ml/api.js` bloqueia POST/PUT/DELETE. A permissão "Publicação e sincronização" do app está em **Leitura** — mesmo que a trava do código caísse, o ML recusaria. Para publicar (Fase 4): mudar a permissão no painel, reautorizar (`ml:url` → `ml:token`) e implementar o fluxo **User Products**, que é o padrão novo do ML.
