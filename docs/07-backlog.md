# Backlog
*Atualizado em 06/10/2026 — primeiro produto conduzido pelo Hermes.*
*Contagem honesta: começou a sessão com 7 abertos, fechamos 7 e eu criei 9 lendo o código —
6 morreram no mesmo dia. Sobrou o que está abaixo.*

---

## Como ler esta lista

Três grupos, porque "9 itens abertos" não quer dizer 9 tarefas:

- **FAZER** — trabalho definido, dá para começar hoje.
- **PARADO DE PROPÓSITO** — esperando uma decisão sua, ou mais pilotos para calibrar. Não é dívida.
- **LIMITAÇÃO CONHECIDA** — não tem solução; fica registrado para ninguém tentar de novo.

**Escopo:** este backlog é do **método e da engenharia** do pipeline. Pendência de *dado de produto*
(atributo faltando, GTIN, medida de embalagem) não entra aqui — mora em `produtos/<slug>/`, junto do
produto a que pertence. Decidido em 07/09/2026.

---

## FAZER  *(8)*

### 1. Testar o método num nicho distante do atual
O repo público está no ar (github.com/gabrielPedron/criacao-anuncio) e o manual foi reescrito na
ordem da aula gravada em 26/09. O setup guiado virou `npm run verificar` + o prompt de primeiro
uso; a atualização do cliente, `npm run atualizar`. Falta rodar um produto de outro nicho de ponta
a ponta para ver o que no método ainda é específico de tinta/impermeabilizante.

### 15. Chrome do projeto: medir em volume
Os defeitos da revisão de 06/10 foram corrigidos (ver RESOLVIDOS). Continua aberto só o que pede uso:
- rodar um produto inteiro só com `ml:busca`/`ml:sugestoes`/`ml:pagina` e anotar se o ML bloqueia
  em algum volume (até agora ~30 páginas, nenhum bloqueio);
- `ml:pagina` lê só as avaliações que a página mostra (as ~5 primeiras). Abrir "ver todas" se o
  dossiê precisar de mais;
- os seletores são do layout de 10/2026 (`li.ui-search-layout__item`, `.poly-component__*`). Quando
  o ML mudar, o comando agora falha com "nenhum anúncio lido" em vez de salvar vazio.

### 16. Descoberta mais barata com a busca — **destravado pelo item 15**
`ml:descobrir` faz ~1.300 chamadas para achar concorrentes por catálogo e não enxerga quem nunca
entrou em catálogo (item 14). A 1ª página de `ml:busca` traz tradicionais e catálogo, com id, preço
e marcação de patrocinado, em 1 página por termo. Avaliar se `ml:busca` vira a porta de entrada e
o `ml:descobrir` fica só para ampliar.

### 17. Etapa A num comando só — **eficiência**
No piloto de 06/10 foram ~10 comandos soltos (`ml:referencia`, `ml:categoria`, `ml:semantica`,
`ml:sugestoes`, `ml:busca`, `ml:pagina`, `ml:fotos`…) e o dossiê foi escrito do zero. Proposta:
- `npm run ml:coletar -- produtos/<slug>` lê o `entrada.md` (links, categoria, termos) e roda tudo,
  salvando em `raw/` com data;
- o mesmo comando gera o **esqueleto do dossiê** com o que é mecânico: tabela de anúncios analisados,
  cobertura da ficha, resultados por termo, sugestões de busca. O agente escreve só o julgamento.

### 19. Acompanhar a posição depois de publicar — **resultado**
A metodologia (Parte II-B) manda medir a posição em pelo menos 5 palavras-chave, semanal para
produto de pouco volume. Com `ml:busca` isso fica barato: um `ml:posicao -- MLB… "termo1" …` que
devolve a posição orgânica do anúncio (desconsiderando os patrocinados) em cada termo e grava o
histórico em `produtos/<slug>/posicao.csv`. Primeiro alvo: o anúncio do piloto de 06/10.

### 20. Fidelidade do rótulo nas imagens — **qualidade**
O gpt-image-2 acerta o texto grande do rótulo e embaralha o miúdo (visível no zoom). Testar:
(a) edição com máscara, gerando só o fundo e deixando o pote da foto base intacto; (b) capa com a
foto real sobre fundo gerado. Medir custo e resultado antes de mudar o padrão.

### 22. Prova social real depois das primeiras vendas — **qualidade**
A foto 5 ficou sem prova social porque não havia avaliação real. Aos 30 dias: `ml:pagina` no
próprio anúncio; se houver avaliação boa e útil, gerar a foto 5 com ela (só texto real).

### 23. Repositório público dos mentorados — **falta o push e uma decisão**
O mecanismo ficou pronto em 06/10 (ver RESOLVIDOS): versão com tag, novidades no `atualizar`,
filtro de ids da conta, Chrome no `verificar`. Falta:
- **o push** da v1 (`git push --follow-tags` em `../criacao-anuncio-publico`) — ação do operador;
- **decidir** se a trilha Hermes ("em teste") fica na v1 ou sai até o teste fechar;
- **cadência:** publicar por lote validado num produto real, não a cada commit.

## PARADO DE PROPÓSITO  *(5)*

### 9. Sincronizar o núcleo de apuração — **esperando decisão sua**
`scripts/apuracao/` é cópia do skill `apuracao-de-api` (`~/.claude/skills/apuracao-de-api/nucleo/`).

**Comparado arquivo a arquivo em 06/09: a única diferença são as extensões `.ts` nos imports.**
Nos 6 arquivos (`achatar`, `auditoria`, `busca`, `catalogo`, `sinonimos`, `tipos`), **zero linha de
lógica diverge.** O canônico escreve `from "./tipos"`; a cópia daqui escreve `from "./tipos.ts"`,
porque Node puro exige o caminho completo e não resolve extensão sozinho.

*Opções:* (a) o canônico adota `.ts` e quem usa bundler liga `allowImportingTsExtensions` no
tsconfig — **extensão explícita funciona nos dois mundos, sem extensão só funciona com bundler**;
(b) cada projeto Node puro repete o ajuste na cópia.

**Recomendação: (a).** É um flag de tsconfig no Rota da Conta contra repetir o ajuste para sempre.
Mas mexe em outro repo, então é decisão sua. **Não mexi no canônico.**

### 10. Vídeo — **manual por decisão, não por adiamento** *(revisto em 07/09)*
**Não entra no pipeline automatizado, nem depois.** Automatizar vídeo somaria uma segunda chave paga
(Google/Veo), custo por segundo — a parte cara do processo inteiro — e um passo de upload no YouTube.
Para o operador é incômodo; para quem adotar o método, pode ser o custo que faz desistir.

**Fica assim: prompt documentado, execução manual.** O operador **já tem prompts que geram vídeo bom**
e usa direto na ferramenta dele.

*Próximo passo quando ele quiser:* trazer esses prompts para `prompts/` (como já é o
`prompts/imagens-set-anuncio.md`), para o método ir junto quando o processo passar para outras
pessoas. Isso vale **antes** de qualquer automação — o prompt é o ativo, a chamada de API é o barato.

*Só depois disso:* confirmar como o ML aceita vídeo hoje (historicamente `video_id` de YouTube, o
que adiciona um passo de upload) e medir o custo por segundo, que é a parte cara.

### 11. Empacotar o processo para outras pessoas — **documentação estruturada em 10/09**

**DECISÃO: distribuir o código e o como usar. Nada é operado pelo dono do repo.**
Cada pessoa cria a própria conta de desenvolvedor no ML, usa as próprias chaves, faz a própria
busca de concorrentes e assina o próprio Nubimetrics se quiser.

Isso mata três riscos sem trabalho nenhum:
- **Termos de uso do ML** — deixa de ser pergunta. Cada um é seu próprio app publicando na própria
  conta; ninguém publica por terceiro.
- **OAuth multiusuário** — não existe. O operador nunca toca em `refresh_token` de outra pessoa.
- **Custo de API** — de cada um.

*Sobra um risco:* quando o ML mudar endpoint, o código dos outros quebra. Sem obrigação contratual,
mas é reputação. **Deixar explícito no README** que a manutenção acompanha o uso dele, não um SLA.

**FEITO:** método e operação foram separados. O manual agora tem instalação escrita, primeiro
anúncio, roteiro curto de gravação e um `OPERACAO.example.md` sem dados reais. O clone novo também
tem onboarding explícito em `AGENTS.md` e `CLAUDE.md`.

*Continua esperando:* gravar o vídeo de distribuição, testar um piloto em nicho distante e decidir
se ainda faz sentido criar um comando de setup guiado depois de observar o onboarding pelo agente.

### 12. Tornar o processo visível — **metade destravada**
Extensão do item 11, do lado de *mostrar* e não de empacotar. São três públicos, e só um depende da
Fase 0:

| Público | O que precisa ver | Bloqueado? |
|---|---|---|
| O operador, acompanhando | estado de cada produto no pipeline | **sim** — precisa de mais produtos |
| Quem avalia se quer o método | o que é, o que resolve, o que exige | **não** — dá para fazer hoje |
| Quem está rodando | onde parou, qual checkpoint falta | depende do setup do item 5 |

**Lovable — avaliado em 07/09. Não para a aplicação; sim para a vitrine.**
Lovable constrói app web; ele não roda este pipeline — o trabalho é o Claude Code lendo os
documentos, e os scripts mexem em arquivo local com o token daquela pessoa. E o Remix
**contradiz a decisão do item 5**: distribuir hoje custa zero (é um repo); exigir conta e créditos
Lovable adiciona um pré-requisito pago na frente disso. Onde encaixa é a **página que explica o
método e linka o repo** — o operador já tem créditos e o Lovable faz página polida bem.
*Artifact* se for só para ele acompanhar (não gasta crédito); *Lovable* se for porta de entrada
pública que ele vai iterar.

**Vercel / Cloudflare — avaliado em 06/09, resposta: não agora.** Não é briga de fornecedor, é que
não existe app para hospedar: o que faz o trabalho é o Claude Code lendo estes documentos, não um
endpoint. Hospedar significa *construir* um app novo (Agent SDK + fila + banco), não fazer deploy do
que existe. E o custo real não é o hosting, é o que vem junto:
- **OAuth multiusuário** — guardar `refresh_token` de terceiros, que o ML rotaciona a cada uso.
  Vira responsabilidade sobre segredo de outra pessoa. Mesmo problema em qualquer fornecedor.
- **Termos de uso do ML** para app que publica em nome de terceiros — já listado no item 11 (empacotar), e
  continua sendo pré-requisito. Hospedar não responde, só aumenta a exposição.
- **Custo da OpenAI vira do host.** Hoje a chave é do operador e ele gera imagem do produto dele.
- **Formato errado para serverless.** Coleta + 5 imagens leva minutos; função serverless morre em
  segundos a poucos minutos. Precisaria de fila e jobs — mais peça para manter.

*Quando reabrir:* só se o usuário-alvo for alguém que **não vai instalar o Claude Code**. Aí é outro
produto e a decisão é de modelo de negócio, não de deploy. Se chegar lá, a forma é app de job em
background — e nesse formato uma VM simples compete de igual para igual com os dois.

### 13. Consolidar os métodos de busca — **parte prática vai no code review**
Hoje a descoberta é uma coleção de caminhos achados por tentativa: `/highlights`, varredura
paginada do catálogo, expansão de família, página de vendedor no Chrome. Funciona, mas é
artesanal e faz muita chamada.

*Mudou de peso em 06/09:* com a **Fase 0** (links validados pelo operador) a descoberta automática
deixou de ser o caminho principal — virou o complemento que acha quem ele não conhece. Menos
urgente, e o alvo agora é "gastar menos chamada para ampliar", não "achar sozinho".

**Contado em 07/09 — o item estava mal parado.** Uma execução típica faz **~1.300 chamadas, todas
sequenciais**: 1 highlights + 6 de varredura + 80 de expansão de família + ~200 para filtrar vendedor
ativo + ~1.050 medindo visitas (175 vivos × 5 itens + nome). É por isso que o script avisa
"isso demora".

**A parte que dói tem conserto hoje, sem histórico nenhum** — e vai junto com o code review
(combinado com o operador em 07/09):
- **paralelizar em lotes** — o padrão já existe no repo (`Promise.all` no `ml:catalogo`);
- **parar de medir visitas dos 175** — medir só dos ~30 com mais vendedores, que são os únicos que
  chegam ao ranking de qualquer jeito.

**A parte que precisa de histórico** (e pode nunca valer a pena): o fluxo decidir sozinho quando
expandir família, quando ir ao Chrome e quando já tem o suficiente. Com a Fase 0, a descoberta
automática virou complemento — essa ambição perdeu quase todo o valor.

---

## LIMITAÇÃO CONHECIDA  *(1)*

### 14. Concorrente que nunca entrou em catálogo é invisível para a API
**Descoberto em 30/08: a página de vendedor renderiza sob automação.**
`lista.mercadolivre.com.br/_CustId_<SELLER_ID>` devolveu 48 anúncios com título e preço.
Fluxo: `ml:descobrir` acha os catálogos → `ml:produto` dá os `seller_id` → a página de cada
vendedor entrega **todos** os anúncios dele, tradicionais inclusive.

*Ainda escapa:* vendedor que **nunca** entrou em catálogo (TINTROX e ART FIX parecem ser o caso).
Para esses não há caminho — testados e reprovados: `/users/$ID/items/search` de terceiro (403),
`_CategoryId_` na lista, URL amigável de categoria, e a busca por termo.

**Feito em 06/09: o buraco deixou de ser silencioso.** `ml:descobrir` agora fecha a saída avisando
que a lista **não é completa**, explicando por quê (só enxerga quem passou por catálogo) e mandando
colar a URL de quem faltou (`ml:referencia`). Antes a lista parecia completa e não era — que é o
erro caro, porque ninguém vai atrás do que não sabe que falta.
*Continua aberto* só o que não tem solução por API. O contorno é a Fase 0.

**Não é tarefa — é o teto da API.** Fica aqui para ninguém gastar tempo tentando de novo.
O contorno (você cola a URL) é a Fase 0, e já está no processo.

---

## RESOLVIDOS

- ~~**Ficha completa antes de publicar (18)**~~ → **feito em 06/10.** `oferta.json` exige
  `garantia` (`fabrica`/`vendedor`/`sem` + prazo) e o `montarPayload` manda `sale_terms`
  (dry-run no ML aceitou por nome); sem GTIN, aviso + `sem_gtin_motivo`. Novo `ml:conferir` antes
  da Parada 2: título final com COLOR + FINISH, ficha × schema × concorrentes, GTIN, garantia,
  objeções do dossiê a casar com a descrição e pendências do `entrada.md`. AGENTS, TEMPLATE-entrada
  e docs/03 pedem garantia, GTIN e as respostas às dúvidas antes da revisão. Os 6 anúncios do
  pipeline que estavam sem garantia foram corrigidos com OK do operador. 4 testes novos. (06/10)
- ~~**`ml:editar` com trava (21)**~~ → **feito em 06/10.** Garantia, atributo ou descrição de anúncio
  publicado: mostra antes/depois, só grava com `--confirmo`, recusa anúncio de outra conta e confere
  título, status, preço e contagem de atributos. Usado nos 5 anúncios da garantia. O `ml:publicar`
  grava os ids das fotos subidas no `oferta.json`. (06/10)
- ~~**`ml:saude` (24)**~~ → **feito em 06/10.** `/item/<id>/performance` apurado (estável) e virou
  comando: nota, nível e só as regras PENDING; `--conta` ordena todos os ativos do pior para o melhor.
  É o passo 10 do docs/03. (06/10)
- ~~**Lições só na skill do Hermes (25)**~~ → **feito em 06/10.** PUT de um atributo e garantia em
  `sale_terms` no docs/06; custo de imagem no topo e a armadilha da crase no AGENTS/CLAUDE;
  `/performance` no docs/06 e no docs/03. (06/10)
- ~~**Defeitos do Chrome do projeto (15, revisão de 06/10)**~~ → **feito em 06/10.** Sessão em contexto
  isolado (`Target.createBrowserContext`, descartado no fim) — vale mesmo se a janela foi aberta sem
  `--incognito`; espera a página NOVA (marca o documento anterior) e acabou a 1ª busca vazia; comando
  CDP com tempo limite e erro se o Chrome fechar; `ml:busca` sem card tenta de novo e falha sem
  salvar; `ml:pagina` falha sem título; limpeza das avaliações virou `limparAvaliacao()` com teste. (06/10)
- ~~**Mecanismo do repositório público (23, parte técnica)**~~ → **feito em 06/10.** `NOVIDADES.md`
  versionado: a 1ª seção vira a mensagem do commit público e a tag (`v1`, `v2`…), e o
  `npm run atualizar` passa a mostrar o corpo (a lista de novidades), não só "Atualiza a partir de…".
  O filtro do `publicar-repo` barra ids de anúncio/produto da conta (retrato local + API) e confere a
  mensagem; ids próprios em docs/15, docs/16, `recriar.ts` e `sugerir-catalogo.ts` viraram fictícios.
  `npm run verificar` avisa quando falta o Google Chrome. (06/10)

- ~~**Puxar dados do ML além da API**~~ → **feito em 06/10.** Navegador headless (Playwright, Hermes,
  `web_extract`) é bloqueado pelo ML; Chrome normal com perfil separado (`.chrome-ml/`), dirigido por
  CDP com o `WebSocket` nativo do Node, passa. Viraram `ml:busca` (total de resultados + 1ª página,
  patrocinados marcados), `ml:sugestoes` (autocompletar, que dá 403 fora do navegador) e `ml:pagina`
  (anúncio de terceiro, ficha, descrição, avaliações). Operador liberou busca pelo Chrome e escolheu
  perfil separado. Sem dependência nova; 2 testes de funções puras em `chrome.test.ts`. (06/10)

- ~~**README defasado**~~ e ~~**separar método de negócio**~~ → feitos juntos em 07/09, porque um
  dependia do outro.
  **README reescrito do zero, genérico:** o que é preciso antes de começar (com custo de cada
  item), instalação, as 4 fases com os 4 checkpoints, **os 23 comandos** em tabelas por etapa,
  estrutura, regras inegociáveis e limites conhecidos. Sem um exemplo do negócio de ninguém — só
  placeholders (`MLB<categoria>`, `"<termo>"`).
  **`produtos/` e `OPERACAO.md` saíram do git** (32 MB, dossiês, imagens e 164 perguntas reais de
  clientes — dado de terceiro).
  **`OPERACAO.md`** (local) recebeu o que é do operador: conta, app, produtos rodados, ferramentas
  de pesquisa e preferências. O `CLAUDE.md` manda ler esse arquivo se ele existir.
  **Varredura completa:** 150 substituições nos docs + código, prompts, snippets e o fixture do
  teste. Nenhum arquivo versionado cita marca, conta, user id, produto ou nome de pessoa.
  A troca em massa quebrou dezenas de frases ("depois do o segundo piloto", "piloto do piloto") —
  todas revisadas e reescritas à mão. (07/09)

- ~~**Achados menores do code review**~~ → **code review encerrado, tudo aplicado.** (07/09)
  - `enviarDescricao` passou a exigir `confirmado`, vindo do `--confirmo` nos dois chamadores.
    `validar` continua auto-confirmado, agora **justificado onde se lê**: `/items/validate` não cria
    nada e é o próprio dry-run — exigir confirmação ali mataria a trava que mais importa.
  - As checagens de descrição viraram `avisarSobreDescricao()`, e o `recriar` passou a usá-las: a
    cópia vem de um anúncio antigo e podia carregar vício sem ninguém ver. Seguem **avisos**, não
    erros — travar impediria consertar um título, que é para o que o `recriar` existe.
  - `testar-chaves` **parou de imprimir pedaço da chave** (imprimia 6 primeiros, 4 últimos e o
    tamanho). Agora só diz "chave presente". Importa porque essa saída aparece em gravação de tela.
  - **Google/Gemini saiu do `testar-chaves` e a `GOOGLE_API_KEY` saiu do `.env.example`** — era a
    única referência no repo inteiro, e vídeo é manual por decisão. Uma API paga a menos para quem
    for adotar o método.
  - `ml:meus-anuncios` documentado no [docs/08](08-processo-completo.md) como utilitário **fora das
    fases** — retrato da conta, não passo do pipeline.

- ~~**Busca sequencial de 5,2 min**~~ → os passos 3, 4 e 5 do `ml:descobrir` rodam em lotes de 8
  (`emLotes`, local ao arquivo — um chamador só não vira módulo compartilhado). Medido na mesma
  categoria e mesmos termos: **1m36s → 25s, 3,9× mais rápido.**
  **Mesmo resultado, provado:** 72 itens nos dois, mesma ordem, mesmos ids, vendedores, preços e
  itens — idêntico ignorando `visitas30d`, que diferiu em 1 visita em 2 dos 72 porque as execuções
  foram com 1,5 min de intervalo e o tráfego é real.
  *Não* se cortou chamada: o ranking é por visitas, então filtrar antes derrubaria o produto de
  poucos vendedores e muito tráfego. (07/09)

- ~~**Helpers duplicados em 7 arquivos**~~ → `pega` e `brl` foram para `scripts/cli.ts`; `opc` foi
  para `scripts/ml/api.js`, ao lado do `ml()` que ele embrulha. A separação é de propósito:
  `scripts/midia/` usa `pega` sem arrastar o cliente do ML junto. 10 arquivos atualizados, todos
  verificados com **execução real** — carregar sem erro não bastava: `demanda.js` e `produto.js`
  passaram no teste de carga e quebravam com argumento de verdade, porque os `.js` usam aspas
  simples e a primeira passada não pegou o import. (07/09)

- ~~**`ml:catalogo` escondia metade dos candidatos**~~ → o `slice(0, 10)` saiu; lista **todos** os
  20, como o [docs/08](08-processo-completo.md) manda. A ordenação por semelhança continua (é útil
  para ler), mas não corta mais — cortar por ela esconderia justamente o catálogo certo de nome
  diferente, que é o erro que o Checkpoint 3 existe para evitar.
  Junto: a lista de palavras genéricas **deixou de ser fixa num nicho** — agora sai dos
  próprios resultados (palavra que aparece em metade ou mais dos candidatos é genérica daquela
  busca), e as palavras da medida são descartadas. Testado em três nichos: acha a marca no piloto
  nos dois pilotos de produto, e admite "—" no piloto de outra categoria em vez de chutar "litros". Era pré-requisito do repo
  genérico (item 2). (07/09)

- ~~**Campos que a spec manda perguntar e o código não exigia**~~ → `carregarOferta` passou a exigir
  `tipo_anuncio` (só aceita `gold_special` ou `gold_pro`) e os quatro `SELLER_PACKAGE_*`, dizendo
  **quais** faltam. `montarPayload` perdeu o `?? "gold_special"` — não inventa mais o tipo, que muda
  comissão e parcelamento. O teste que consagrava o default virou dois: um provando que o valor vem
  da oferta (clássico e premium), outro provando que a ausência é recusada. As 3 ofertas reais
  passam sem alteração. (07/09)

- ~~**Escrita sem confirmação**~~ → as três corrigidas e verificadas em 07/09:
  **(1)** `--validar` não sobe mais foto sozinho. A regra do projeto é "escrita exige confirmação",
  não "validar nunca escreve" — quem manda agora é o `--confirmo`. Sem ele o dry-run roda sem fotos
  e avisa que o ML vai reclamar, em vez de escrever escondido.
  **(2)** `subirFoto` passou a usar o `ml()`. Não há mais nenhum `fetch` direto ao ML em
  `publicar.ts`, e a trava do `api.js` agora **bloqueia** o `POST /pictures/items/upload` — provado
  chamando sem confirmação.
  **(3)** `family_name` acima de 60 **lança erro** em vez de truncar em silêncio, citando que o
  título é irreversível e que o ML ainda acrescenta `COLOR` + `FINISH`. O teste que consagrava o
  corte virou teste de recusa, mais um que garante que 60 exatos passam. (07/09)

- ~~**Rodar o code review**~~ → rodado em 07/09 sobre `c4d3f38^...HEAD` (28 commits, 12 arquivos,
  ~1.100 linhas em `scripts/`), dois eixos em paralelo. **Standards:** 4 violações documentadas +
  duplicação em 7 arquivos; pior = `subirFoto` contornando a trava de escrita. **Spec:** 8 achados;
  pior = corte silencioso do `family_name` em 60, num campo irreversível. Os dois eixos acharam a
  escrita do `--validar` de forma independente. Tudo virou os itens 3 a 8. (07/09)

- ~~**Nenhum teste no caminho que gasta dinheiro**~~ → `scripts/ml/publicar.test.ts`, 10 checks com
  `node --test` (`npm test`), sem framework nem dependência. Cobre o que decide o anúncio: campo
  obrigatório faltando, preço/estoque inválidos, e o invariante que quebra a publicação em silêncio
  — **`montarPayload` nunca pode mandar `title` junto com `family_name`**. Verificado por mutação:
  reinjetando o `title`, 2 testes falham. (06/09)
- ~~**Descoberta parecia completa e não era**~~ → `ml:descobrir` agora avisa que só enxerga quem
  passou por catálogo e manda colar a URL de quem faltou. `ml:catalogo` ganhou o que fazer quando
  nenhum candidato é o mesmo produto (publicar tradicional → sugerir depois). (06/09)
- ~~**`ml:catalogo` dizia que criar catálogo exige marca registrada e loja oficial**~~ → contradizia
  o [docs/15](15-criar-catalogo.md), que provou em 31/08 que para **sugerir** não precisou. Texto
  corrigido para o que foi testado. (06/09)

- ~~**Ajuste na maneira de buscar**~~ → era a **Fase 0**: o operador traz semântica (Virtual Seller +
  Nubimetrics) e links de concorrentes validados, e a API amplia a partir disso. Medido no segundo
  piloto: rende mais que a descoberta automática sozinha. Documentado em
  [02-etapa-A-coleta.md](02-etapa-A-coleta.md) e na FASE 0 do [08](08-processo-completo.md). (06/09)

- ~~**`ml:publicar --validar` dava falso positivo**~~ → `publicar-cli.ts` lê o `v.ok`, lista erros e
  avisos, e **recusa publicar** quando o dry-run reprova. O bug era o CLI tratar `validar()` como se
  ela lançasse; ela devolve `{ok, erros, avisos}`. (06/09)
- ~~**Documentos contradizendo o código**~~ → `00-briefing` (imagem, preço, marca, checkpoints),
  `01-roadmap` (§"por que a imagem saiu do braço", status), `README` e `08` (reautorização e User
  Products) alinhados com o que roda. (06/09)
- ~~**Import morto em `publicar.ts`**~~ → `saida` removido. (06/09)

- ~~**Descoberta de concorrentes**~~ → `ml:descobrir`, de 5 para 175 com vendedor ativo. (30/08)
- ~~**Corte por vendas mínimas**~~ → o ML não expõe `sold_quantity` de terceiro; virou
  `--min-visitas`, que é tráfego real. (30/08)
- ~~**Título em 4 opções**~~ → feito no piloto, e sem rendimento no título: os campeões da
  categoria usam superfície e atributo técnico. (30/08)
- ~~**Automatizar as imagens**~~ → virou a Fase 3, rodando com `gpt-image-2` em 1200×1200. (28/08)
- ~~**Zoom do ML (≥1200px)**~~ → resolvido trocando de modelo. (30/08)
- ~~**Avaliações negativas**~~ → **decisão do operador (30/08): trabalhar só com 4★ e 5★.**
  O ML não manda 1–3★ para o cliente e não há caminho. As 4★ carregam o "porém", e as
  perguntas cobrem o resto. (30/08)
- ~~**Baldes vazios da Foto 2**~~ → resolvido com `--ajuste`; agora saem com rótulo neutro e
  "3,6kg" estampado. (30/08)
- ~~**Continuar depois de uma imagem ruim**~~ → `--ajuste "o que corrigir"` e `--variacoes N`,
  com histórico em `imagens/historico.md`. (30/08)
- ~~**Nubimetrics facultativo**~~ → saiu da **automação** em 27/08 e **voltou como pesquisa manual
  do operador** (Fase 0) em 06/09. Automatizar de novo continua fora.
- ~~**Coluna "Tendência" do Nubi**~~ → saiu da automação em 27/08; ele lê na mão na Fase 0. (06/09)
