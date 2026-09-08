# Etapa A — Roteiro de Coleta — v5
*Atualizado em 06/09/2026: a pesquisa própria do operador virou a **Fase 0**, a primeira fonte de tudo.*
*Saída = dossiê em `produtos/<slug>/dossie.md`, que é o contrato com a Etapa B.*

## Seu papel
Você é o **coletor**. Recebe a pesquisa da Fase 0, amplia pela API do ML, colhe as avaliações pelo
Chrome e fecha um **dossiê padronizado**. NÃO cria anúncio — isso é a Etapa B.
Não invente dado: se não achou, escreva "não encontrado".

## Modo de operação
Um modo só, desde 06/09/2026: **a pesquisa do operador entra primeiro (Fase 0), a API amplia.**
Os antigos modos "Completo" e "A.2" morreram — o que os separava era o Nubimetrics ser dirigido
por automação, e isso não existe mais em nenhum dos dois.

## Inputs que o operador dá
1. **Produto** + **termo genérico** dele.
2. **Categoria** do ML. A escolha é **responsabilidade dele** — não questionar.
3. **Estratégia: catálogo ou orgânico.**
4. **A pesquisa da Fase 0** — semântica e links. É o input que mais muda o resultado.

---

## FASE 0 — a pesquisa que o operador traz  *(SEMPRE PRIMEIRO)*
*Adicionada em 06/09/2026, depois do segundo piloto.*

Duas coisas, as duas feitas **por ele, no navegador dele**, antes de eu rodar qualquer script:

1. **Top buscas do mês e semântica** — **Virtual Seller** e **Nubimetrics**. Ele abre, filtra pela
   categoria, lê o ranking e me passa os termos em texto.
2. **Links de concorrentes que ele já validou** como sendo o mesmo produto — 2 ou mais.
   ```bash
   npm run ml:referencia -- "url1" "url2" --salvar produtos/<slug>/raw/ref.json
   ```

### Por que isso vem antes da automação
**Medido no segundo piloto (06/09/2026): o resultado com a pesquisa dele saiu melhor do que
pedindo para eu descobrir os concorrentes pela API.** Duas razões, e nenhuma delas se resolve com
mais código:

- **A minha descoberta acha nome parecido; ele sabe o que É o mesmo produto.** Erra nas duas
  direções: traz produto de outro porte e perde quem vende fora do catálogo.
- **A API do ML não me dá volume de busca.** `/sites/MLB/search` está bloqueado para este app e o
  `paging.total` do `/products/search` é fuzzy. Virtual Seller e Nubimetrics dão. É informação que
  eu **não consigo obter por nenhum caminho** — ver [06-mapa-da-api.md](06-mapa-da-api.md).

### O Nubimetrics voltou — mas só na mão dele
O que saiu do fluxo em 27/08 foi **eu dirigir o Nubimetrics pelo Chrome**: a sessão caía no meio da
coleta e custava mais atenção do que entregava. **Isso continua fora e não deve ser reintroduzido.**
O que entra agora é outra coisa: ele usa a ferramenta como usuário e me manda o resultado em texto.
Sem sessão automatizada, sem ponto de falha. Ver [11-sem-nubimetrics.md](11-sem-nubimetrics.md).

### O que ele me passa (formato livre, texto mesmo)

| O que | De onde | Para que serve |
|---|---|---|
| Top buscas do mês da categoria | Nubimetrics / Virtual Seller | ancora o título e o campo modelo |
| Termos com demanda e **pouca concorrência** | Nubimetrics (nº de anúncios por termo) | é a **lacuna** — o sinal que a API não dá |
| Grafias erradas com volume | Nubimetrics | entram no campo modelo do orgânico |
| 2+ links de concorrentes do mesmo produto | ele, olhando | `ml:referencia` tira ficha, preços, visitas, perguntas e fotos |

### Isto é desenho, não improviso
Vale registrar para quando o método for para outras pessoas: **o pipeline foi feito para ser bom
com pesquisa humana na entrada, não para dispensá-la.** Quem rodar sem trazer semântica e links
próprios vai ter resultado pior — e isso é esperado, não é bug. A automação cobre o que é
volumoso e estruturado; o julgamento de "é o mesmo produto" e o volume de busca ficam com a pessoa.

> **🛑 CHECKPOINT 1** — eu proponho as **top-3 semânticas** cruzando o que ele trouxe com
> `ml:semantica`, e **paro** até ele confirmar.

---

---

## FASE 1 — Nubimetrics: campo semântico  *(feita **pelo operador, na mão**, na Fase 0 acima.
Deixou de ser passo automatizado em 27/08/2026 — ver [11-sem-nubimetrics.md](11-sem-nubimetrics.md).
O roteiro abaixo é o método que ele segue no navegador dele.)*
1. Menu → **Mercado → Top buscas do mês**.
2. Barra **"Demanda"**: calendário = **Mês atual** + filtros de categoria que passei.
3. Ler o **"Ranking histórico do período"** como fonte primária (*Palavras*, *Tendência* ↑/↓, nº de *Anúncios*). "Ranking hoje" só como sinal de tendência em alta.
4. **Ancorar no termo genérico do MEU produto, não no top cego da categoria.**
5. Me propor as **top-3 semânticas que têm relação com o produto** (muitos anúncios = concorrência alta; termo relevante com poucos anúncios = **lacuna**).
6. **PARAR e esperar eu confirmar as 3** antes de raspar.
7. **Fallback:** se **nenhum** termo das top buscas do mês tiver relação com o produto, me avise e **desconsidere o Nubi** — siga a Fase 2 ancorado só no termo genérico, e marque as semânticas como "desconsideradas" no dossiê.

## FASE 2 — Mercado Livre: duas passadas
**Passada genérica** (termo genérico): varrer os anúncios do tipo em geral e mapear o **campo semântico** e os **atributos universais** (rendimento, base, cor, aplicação). Entender o terreno e não esquecer o óbvio na ficha. Não aprofundar.

**Passada específica** (as 3 semânticas confirmadas no Completo — ou, no **A.2/fallback**, os **termos específicos e a semântica genérica que eu passei**): achar os concorrentes **diretos** e aprofundar. Aqui a oferta se decide.

8. **Completo:** clicar em **"VER OFERTA"** (ao lado do termo no Nubimetrics) pra cair direto nos anúncios. **A.2 / fallback:** buscar os termos direto na barra do ML.
9. Juntar, **deduplicar**, pegar **5–10 anúncios únicos**; analisar **~5 a fundo**.
   - Orgânico: priorizar anúncios NÃO catálogo. Catálogo: olhar o catálogo do termo + os vendedores que competem nele.
10. Ranqueamento: ignorar anúncios **"Ad"**. Ideias de oferta/objeção: pode ler os "Ad" — só não tratar "quem está em cima" como "quem ranqueia".
11. Em cada anúncio a fundo: título, faixa de preço, tipo, logística, reputação/nº de vendas; **fotos** (o que mostram/argumentam); **descrição** (pontos principais); **ficha técnica** (o que preenchem vs. deixam vazio); e — o mais valioso — **perguntas e avaliações** (objeções e dores reais). Não pular.

## FASE 3 — Dossiê (saída padronizada)
Um bloco único, nesta ordem:
1. **Produto + estratégia** (catálogo/orgânico) + **modo usado (Completo / A.2)**.
2. **Semânticas:** top-3 confirmadas + relacionadas (Completo) / "desconsideradas" (fallback) / **"modo A.2 — não pesquisado, ancorado na semântica genérica informada"**.
3. **Campo semântico genérico + atributos universais** (da passada genérica) — pra ficha técnica.
4. **O que a concorrência ACERTA.**
5. **LACUNAS** (o diferencial da oferta).
6. **Objeções e dores reais** (das perguntas/avaliações), citando o anúncio.
7. **Cobertura de ficha técnica:** atributos preenchidos vs. vazios.
8. **Links** dos anúncios.

## Nota de robustez
Se os rótulos do Nubimetrics mudarem, procure a função equivalente (mercado → top buscas do mês → ranking com nº de anúncios). Se algo essencial sumir, me avise antes de seguir.

---

## Como isso roda hoje (API primeiro, Chrome no que sobra)
*Atualizado depois do teste de navegador. O roteiro acima continua valendo como método — o que mudou foi a ferramenta de cada passo.*

**Teste real:** a página de busca do ML (`lista.mercadolivre.com.br`) **trava no spinner sob navegação automatizada** — os resultados não entram no DOM. Raspar a busca não é confiável. Páginas de anúncio individual são server-rendered e cooperam, mas para elas a API é melhor ainda.

### O que virou API (roda no Claude Code)

| Passo do roteiro | Comando |
|---|---|
| Fase 2 — achar concorrentes e a faixa de preço | `npm run ml:concorrentes -- "termo"` |
| Fase 2, item 11 — ficha, descrição, **perguntas e avaliações** | `npm run ml:anuncio -- MLB123... --salvar produtos/NOME/raw/c1.json` |
| Fase 3, item 7 — cobertura de ficha contra a lista **real** do ML | `npm run ml:categoria -- "produto"` |

Isso muda a qualidade do item 7 do dossiê: antes a cobertura era medida contra o que a gente supunha ser a ficha; agora é contra o schema verdadeiro da categoria, com o que é obrigatório e quais valores o ML aceita.

### O que continua no Chrome (skill `leitor-de-sites`)
1. **Avaliações dos concorrentes** — `/reviews/*` dá 403 na API.

Fotos saíram do Chrome (`ml:fotos` baixa e eu leio com visão). O Nubimetrics saiu da **automação**
e voltou como pesquisa manual dele, na Fase 0.

Snippets prontos: [../coleta/snippets-chrome.md](../coleta/snippets-chrome.md).
**Regra da skill:** screenshot serve pra ver, não pra ler. Texto, preço, link e tabela saem por código, em JSON — e sempre reportando quantos itens vieram, de qual URL e qual seletor funcionou.

### Saída
Preencher [../coleta/TEMPLATE-dossie.md](../coleta/TEMPLATE-dossie.md) em `produtos/<slug>/dossie.md`. O dossiê continua sendo o contrato com a Etapa B.
