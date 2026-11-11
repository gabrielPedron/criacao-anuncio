# Mapa da API do ML — o que está aberto e o que está bloqueado
*Testado em 25/08/2026 com um app próprio no site MLB, permissões Comunicações=Leitura e Publicação=Leitura.*
*Leia antes de escrever chamada nova — metade do que parece óbvio está fechado.*

## Bloqueado (403)

| Endpoint | O que seria | Plano B |
|---|---|---|
| `/sites/MLB/search` | busca de anúncios por termo | `/products/search` (busca no catálogo) + `/highlights` |
| `/items/$ID` de terceiros | ficha e título de um concorrente | `/products/$ID` + `/products/$ID/items` |
| `/reviews/item/$ID` | avaliações de um concorrente | **Chrome do projeto** (`ml:pagina`) |
| `/items/$ID/visits/*` e `/visits/items` **de terceiro** | visitas de 30 dias de um concorrente | mais vendidos (`/highlights`) + total de perguntas; vendidos pela página (`ml:pagina`). **Bloqueado desde out/2026** — apurado em 11/11/2026; o do anúncio próprio continua aberto |

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
| `/items/$ID/visits/time_window?last=30&unit=day` | **visitas reais em 30 dias**, série diária — **só do anúncio próprio** | `ml:demanda` |
| `/items/$ID/description` | descrição, **inclusive de concorrente** (às vezes vazia: muita loja usa imagem; no catálogo os vendedores costumam ter o mesmo texto) | `ml:produto` |
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
            └─ ml:demanda → visitas em 30 dias (só do seu anúncio desde out/2026)
```

## O que isso muda no processo

- **Preço de referência** sai da API (mediana real dos vendedores do catálogo), não de estimativa.
- **Cobertura de ficha** é medida contra o schema verdadeiro da categoria.
- **Objeções** vêm das perguntas por API — era o item mais caro de colher na mão.
- **Semântica** ganha um sinal grátis (`/trends`), mas **sem volume e sem nº de anúncios**. O sinal de "termo relevante com pouca concorrência", que decide a lacuna, continua sendo Nubimetrics.

## Armadilha do `/products/search`

O `paging.total` é **fuzzy**: um termo inexistente devolve ~50 resultados, e termos comuns batem no teto de 10.000. Serve como ordem de grandeza, **não** como o "nº de anúncios" do Nubimetrics. Os *resultados* são bons; a *contagem* não é.

Além disso, muito produto de catálogo vem com **0 vendedores ativos** — por isso `ml:concorrentes` (via `/highlights`) é melhor pra achar quem realmente vende, e `ml:buscar` é melhor pra varrer um termo.

## No Chrome do projeto

O que a API nega vem do Chrome normal, em guia anônima e com perfil separado, dirigido por código (`scripts/ml/chrome.ts`),
com pausa de leitura, teto diário, pausa de 6 h depois de bloqueio e cache de 12 h — ver
[coleta/snippets-chrome.md](../coleta/snippets-chrome.md). É o único navegador que abre o ML no processo.
Navegador headless (Playwright, o do Hermes, `web_extract`) é **bloqueado** pelo ML com a página
"Hubo un error accediendo a esta pagina"; o Chrome com janela passa. Testado em 05 e 06/10/2026.

| O que | Comando |
|---|---|
| Busca por termo: total de resultados e a 1ª página, com os patrocinados marcados | `npm run ml:busca -- "termo"` |
| Sugestões de busca (autocompletar; dá 403 fora do navegador) | `npm run ml:sugestoes -- "termo"` |
| Anúncio de outro vendedor: preço, vendidos, ficha, descrição, avaliações | `npm run ml:pagina -- "url"` |

1. **Avaliações** dos concorrentes — `/reviews/*` dá 403/404 na API. `ml:pagina` lê as que a página
   mostra (as primeiras, ordenadas por útil). Em página de catálogo podem ser herdadas de outro produto.

> **Busca por termo:** a nota antiga dizia que não funcionava no Chrome ("resultados nunca
> renderizam"). Era o navegador de automação sendo bloqueado. No Chrome normal funciona — revisto
> em 06/10/2026.

> **Fotos saíram do Chrome:** `ml:fotos` baixa os arquivos e o Claude Code lê com visão direto. Não precisa de navegador nem screenshot.

Snippets em [../coleta/snippets-chrome.md](../coleta/snippets-chrome.md).

## Qualidade e edição do próprio anúncio

| Endpoint | O que dá | Comando |
|---|---|---|
| `GET /item/$ID/performance` | nota de qualidade do ML (0–100) e regras pendentes, por grupo | `ml:saude` |
| `GET /items/$ID/catalog_listing_eligibility` | se o anúncio próprio tem produto de catálogo ligado e anúncio de catálogo: `CATALOG_PRODUCT_ID_NULL`, `ALREADY_OPTED_IN` (apurado em 07/10/2026; `LOOPING_ITEM` visto, significado ainda não apurado) | `ml:catalogo-status` |
| `PUT /items/$ID` com `sale_terms` | garantia (`WARRANTY_TYPE` por nome, `WARRANTY_TIME` "3 meses") — **não é atributo** | `ml:editar --garantia` |
| `PUT /items/$ID` com `attributes: [um só]` | acrescenta/troca só aquele atributo; os demais ficam (visto em 06/10/2026, e o `ml:editar` confere a cada vez) | `ml:editar --atributo` |

Endpoints da conta fora do pipeline (vendas, reputação, Ads, promoções): [docs/19](19-raio-x-da-conta.md).

## Escrita

`scripts/ml/api.js` bloqueia POST/PUT/DELETE/PATCH por padrão. Para publicar, o operador habilita o
escopo OAuth `write`, muda **Publicação e sincronização** para escrita e reautoriza com
`npm run ml:autorizar`. O fluxo **User Products** já está implementado em `ml:publicar`; cada envio
continua exigindo o OK humano e as flags `--publicar --confirmo`.
