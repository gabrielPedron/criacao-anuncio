# Nubimetrics saiu da automação
*Decisão do operador em 27/08/2026: "toda hora tá caindo, tá mais complicado do que ajudando."*

> **Atualização de 06/09/2026 — leia antes do resto.**
> O Nubimetrics **voltou ao processo, mas só na mão do operador**, junto com o Virtual Seller.
> Ele abre as ferramentas no navegador dele, lê as top buscas do mês e me passa os termos em texto.
> É a **Fase 0** da [Etapa A](02-etapa-A-coleta.md).
>
> **O que continua proibido é eu dirigir o Nubimetrics por automação** — era a sessão caindo no meio
> da coleta que causou o problema, e o código nunca foi a questão. Não reintroduzir isso.
>
> Consequência: a seção "O que se perde" abaixo **deixou de valer** — o nº de anúncios por termo, o
> volume de busca e o sinal de lacuna voltaram, pela mão dele. O que segue vale como registro de
> por que a automação saiu, e do que a API cobre sozinha quando ele não trouxer pesquisa.

## Por quê
A sessão do Nubimetrics caía sozinha. Na coleta de teste do piloto de coleta ela caiu no meio,
e o pipeline teve que seguir em modo A.2. Uma ferramenta que exige relogin a cada coleta custa
mais atenção do que entrega.

## O que se perde — dito sem maquiar

**O nº de anúncios por termo.** Era o único lugar de onde ele saía, e é o sinal que identifica
**lacuna**: termo com demanda e pouca concorrência. Exemplo real colhido antes de sair:
"tinta emborrachada" tinha 24.521 anúncios, mas "granito líquido" tinha 127 e "nex floor", 32.
Esse tipo de contraste agora não aparece mais.

Também se perde o volume de busca por termo e a comparação entre três períodos.

Testei substituto e **não existe**: a busca do ML está bloqueada por API, não renderiza sob
automação, e o `paging.total` do `/products/search` é fuzzy (termo inexistente devolve ~50).
Registrado em [06-mapa-da-api.md](06-mapa-da-api.md) para não ser tentado de novo.

## O que compensa

| Sinal | De onde vem agora |
|---|---|
| Termos da categoria | `ml:semantica` — tendências do próprio ML |
| Termos que vendem | Títulos dos mais vendidos (`ml:concorrentes`) |
| **Demanda real** | `ml:demanda` — visitas em 30 dias por anúncio |
| Concorrência | Nº de vendedores por produto de catálogo |
| Dor do comprador | Perguntas (API) e avaliações (Chrome) |

As **visitas** são, em alguns aspectos, sinal melhor que volume de busca: é tráfego real no
anúncio real, não intenção agregada. No teste, o líder tinha 99.111 visitas em 30 dias contra
1.597 do segundo vendedor **no mesmo catálogo** — isso diz mais sobre a disputa do que
qualquer volume de busca diria.

## Consequência prática *(revista em 06/09/2026)*

Entre 27/08 e 06/09, o modo A.2 foi o único e **o título era o ponto mais fraco da oferta**. Com a
Fase 0, o título voltou a ter volume de busca por trás — só que vindo de fora do pipeline.

**A fragilidade mudou de lugar, não sumiu:** agora ela é a *disponibilidade da pesquisa humana*.
Rodar sem a Fase 0 recai exatamente no cenário descrito abaixo, que continua sendo o piso do método.

<details><summary>O piso: como fica quando não há pesquisa da Fase 0</summary>

**O título passa a ser o ponto mais fraco da oferta** — ele se apoia em termos de concorrente
e tendência do ML, sem volume para ordenar. Vale revisar título com atenção redobrada no
checkpoint, e é o primeiro lugar onde a falta do Nubi vai aparecer.

</details>

## Se voltar atrás (automatizar de novo)
O extrator continua guardado em [../coleta/snippets-chrome.md](../coleta/snippets-chrome.md),
na seção arquivada. Funcionava — o problema era a sessão, não o código.
**Mas não há motivo para voltar:** o caminho manual da Fase 0 entrega o mesmo dado sem o ponto de
falha. Só reabrir se o operador pedir explicitamente.
