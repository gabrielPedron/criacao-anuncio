# Raio-x da conta — endpoints de leitura

Mapa dos endpoints usados no raio-x da conta de 08/10/2026 (vendas, reputação, perguntas,
reclamações, Ads, promoções, disputa de catálogo). **Não faz parte do pipeline de anúncio** — o
mapa do pipeline está no [docs/06](06-mapa-da-api.md).

> **Lido por GET, não apurado.** Nenhum destes campos passou pelo `ml:apurar` nem está no
> `scripts/ml/glossario.ts`. Antes de qualquer comando ler um deles, apurar primeiro
> ([docs/10](10-apuracao-e-auditoria.md)).

Base do raio-x da conta. Todos responderam 200 para um app com as permissões de leitura do
[manual](../manual/01-INSTALACAO.md). Ainda não há comando no repo; os caminhos estão aqui para não
serem redescobertos.

| Endpoint | O que dá | Cuidado |
|---|---|---|
| `/users/$CONTA` → `seller_reputation` | termômetro (`level_id`, ex. `5_green`), MercadoLíder, reclamações/atrasos/cancelamentos (`rate` em **fração**, janela "60 days") | não existe `/users/$ID/reputation` |
| `/orders/search?seller=$CONTA&order.date_created.from=…&sort=date_desc&limit=50&offset=N` | pedidos com itens, preço e `sale_fee` | venda = `status` `paid`; `date_created` vem em −04:00, então decida o dia em America/Sao_Paulo; mande só o `from`, com folga |
| `/my/received_questions/search?status=UNANSWERED` | perguntas em aberto (`total`) | o filtro aparece ecoado em `filters.status`; sem filtro, `total` é o histórico |
| `/marketplace/v2/claims/search?status=opened&sort=last_updated:desc` | reclamações abertas (`paging.total`, `data[]`) | exige pelo menos um filtro |
| `/messages/unread?tag=post_sale` | conversas de pós-venda não lidas (`total`, `results[].resource`) | **nunca** chamar o `resource`: isso marca a conversa como lida |
| `/pricing-automation/users/$CONTA/items` | anúncios com o preço automático do ML (`items[]`) | desde 18/03/2026 o ML recusa mudar o preço desses itens por API |
| `/seller-promotions/users/$CONTA?app_version=v2` | promoções e convites da conta: tipo, `started`/`pending`, prazos | |
| `/seller-promotions/items/$ID?app_version=v2` | promoções de um anúncio: `started`/`candidate` | |
| `/items/$ID/price_to_win?version=v2` | disputa de catálogo: `status` (`winning`/`competing`/`listed`), `price_to_win`, `reason[]` (visto `penalized_item`), `boosts[]`, `winner` | |
| `/items/$ID/visits/time_window?last=60&unit=day` | visitas por dia | compare 30 dias com os 30 anteriores |
| `/advertising/advertisers?product_id=PADS` (cabeçalho `Api-Version: 1`) | `advertiser_id` por site | |
| `/advertising/MLB/advertisers/$ADV/product_ads/campaigns/search?date_from&date_to&metrics=…&metrics_summary=true` (cabeçalho `api-version: 2`) | campanhas com custo, ROAS, ACOS e vendas; `roas_target` | o ROAS objetivo substituiu o ACOS objetivo |
| `/advertising/MLB/advertisers/$ADV/product_ads/ad_groups/search?date_from&date_to&metrics=…` | grupos de anúncio (item, família ou catálogo) com métricas, inclusive TACOS | |
| `/advertising/MLB/advertisers/$ADV/product_ads/ads/search` (cabeçalho `api-version: 2`) | anúncio → campanha → grupo, com status (`active`, `idle`, `hold`) | |

O `ml:apurar` não envia cabeçalho, então os quatro de publicidade foram lidos por GET direto.

**Estoque se lê por User Product.** Anúncios do mesmo `user_product_id` (catálogo + tradicional)
mostram o mesmo `available_quantity`. Calcule a cobertura somando as vendas do grupo; somar o
estoque contaria em dobro. Estoque a caminho do Full não aparece.
