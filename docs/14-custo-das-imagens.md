# Custo da geração de imagens

## O número de hoje: qualidade `medium`

Desde 31/08/2026 o padrão é `medium`. Testado contra `high` na mesma foto, o rótulo ficou igualmente
legível e a saída caiu para ~1/4 dos tokens.

| | |
|---|---|
| **Custo por imagem** | **~US$ 0,06 a 0,08** |
| Set completo (5 fotos) | **~US$ 0,30 a 0,40** |
| Anúncios com US$ 5 de crédito | **~12**, contando algumas refações |

*Estimado, não medido isoladamente.* Sai do custo medido no `high` (abaixo): a entrada continua a
mesma (~1.800 tokens) e a saída cai de ~7.900 para ~2.000 tokens. Conforme o peso da entrada no
preço, dá US$ 0,055 a 0,086 por imagem. O código usa US$ 0,08 (`USD_POR_IMAGEM` em
`scripts/midia/openai.ts`) para a estimativa mostrada antes de gerar nunca ficar abaixo do real.
Para cravar o número, compare o gasto de um set completo em platform.openai.com/usage.

## Histórico: medido no `high` em 31/08/2026

| | |
|---|---|
| Gasto até agora | **US$ 1,77** |
| Gerações | **8 imagens** |
| **Custo por imagem** | **~US$ 0,22** |
| Set completo (5 fotos) | **~US$ 1,11** |

## Sai do crédito de US$ 5? Sim.

O painel mostra **"$1,77 / $100,00"** — cuidado, esse **$100 não é o seu saldo**, é o *limite
mensal de gasto* da conta. O que você comprou foi **US$ 5 de crédito pré-pago**, e é dele que sai.

**Saldo estimado: ~US$ 3,23**, o que dá mais **~14 imagens** ou **~3 sets completos**.

Quando o crédito zerar, as chamadas passam a falhar — não cobra automático, porque o
auto-reload está desligado.

## Por que aparece em "Responses and Chat Completions" e não em "Images"

O painel mostra `Images: 0 requests`. Isso engana: o `gpt-image-2` é servido pela mesma
infraestrutura das respostas, então as 8 gerações aparecem como
**"8 requests · 13.558K input tokens"** naquele bloco. Os 13.558 tokens são só a **entrada**
(~1.700 por chamada); os ~7.900 tokens de **saída** por imagem são cobrados como token de
imagem e é onde mora quase todo o custo.

## Como ver geração por geração

No painel: **Logs** (menu lateral). Lista cada requisição, com modelo, horário e tokens.
O bloco *Usage* só agrega.

Do nosso lado, cada geração já reporta na saída do comando:
```
✓ 1845 KB · 9741 tokens · ~US$ 0,22 (entrada 1815, sendo 1521 de imagem · saída 7926)
```
E fica registrado em `produtos/<slug>/imagens/historico.md`.

## Onde o custo escapa

Cada foto **reprovada e refeita custa outra imagem**. O set do primeiro piloto saiu por 7 gerações
em vez de 5, porque a foto 2 foi refeita duas vezes — ~US$ 1,55 em vez de ~US$ 1,11.
É o preço de iterar, e o `--ajuste` existe justamente para acertar em menos tentativas.
