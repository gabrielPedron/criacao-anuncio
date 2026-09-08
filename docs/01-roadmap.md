# Roadmap de Automação — Pipeline de Criação de Anúncios EE
*(revisado: Etapa B migra pro Claude Code e vai até o publish)*

## Mapa de ferramentas (onde cada coisa roda)
- **Pesquisa (Etapa A):** **você**, no seu navegador (Virtual Seller + Nubimetrics), entrega a semântica e os links — Fase 0. Depois **Claude Code** amplia pela API do ML, e o **Chrome** cobre só as avaliações.
- **Handoff:** não há mais paste — A e B rodam no mesmo repo. O dossiê é `produtos/<slug>/dossie.md`.
- **Criação da oferta + API + publish (Etapa B):** **Claude Code** — reasoning da copy + chamadas de API + publish, tudo num lugar.
- **Imagens:** **API da OpenAI** (`npm run midia:gerar`) desde 28/08/2026, com revisão humana obrigatória (ver abaixo).
- **Orquestrar A→B num lugar só:** **Cowork** — futuro, só depois de validar.

## Onde estamos *(06/09/2026)*
- Etapa A: Fase 0 (pesquisa dele) + API + Chrome → **dossiê**. Checkpoint: confirmação das top-3 semânticas.
- Etapa B: dossiê + foto base → oferta → imagens → validação → publish.
- **Status: rodou de ponta a ponta.** Dois pilotos publicados, um deles em duas categorias. A Fase 0 formal ainda não fechou (faltam produtos para calibrar).

## Estratégia de anúncio: catálogo + tradicional
- **Sempre** criar o anúncio **tradicional (orgânico)** com os nossos ativos (foto, título, ficha+modelo, descrição).
- Se existir **catálogo** do produto: **participar dele também** (anexar oferta). O catálogo usa foto/título próprios; os nossos ativos vão pro tradicional.
- Resultado: buy box do catálogo **+** um orgânico 100% seu.
- Implicação pra B: título **sempre orgânico**, campo modelo **sempre ativo**.

## API do ML — onde entra
- **Leitura (Fase 1):** categoria certa + **schema real de atributos**. Ficha exata em vez de chutada. Read-only, risco zero.
- **Escrita/publish (Fase 4):** criar o item via API. **Sem ERP** (você não tem Bling/Olist) → é você construindo, não plugando.
  - Alerta: o ML está migrando o fluxo de publicação (**User Products**) → esperar retrabalho. Peça de maior risco e menor ganho agora; publish manual já funciona.

## Roadmap faseado
- **Fase 0 — Validar o manual (agora).** 2–3 produtos reais no fluxo atual (Chrome + copy manual), com os checkpoints. Nada de API. Ajustar o texto dos prompts.
- **Fase 1 — API de leitura (Code).** Puxador de ficha técnica: recebe o produto/categoria → devolve os atributos reais do ML. Claude Code escreve as chamadas; você lê. *Depende de criar o app de desenvolvedor primeiro.*
- **Fase 2 — Etapa B no Code.** Consome o dossiê (colado) + a ficha real → gera relatório de oferta, título, ficha+modelo, descrição **e os prompts de foto**.
- **Fase 3 — Imagens + validação.** ✅ `npm run midia:gerar` gera as 5 pela API da OpenAI, versionadas; **você revisa e reprova por foto** (`--foto N --ajuste "..."`). Ver abaixo por que deixou de ser no braço.
- **Fase 4 — Publish (API de escrita, por último).** Sobe as fotos → cria o **tradicional** → participa do **catálogo**. Sempre **após o OK humano**. Esperar ajuste por causa da migração User Products.
- **Fase 5 — (futuro, opcional) Cowork.** Orquestra A→B num lugar só, removendo o copia-e-cola. Mantém o checkpoint das semânticas.

## Por que a imagem SAIU do braço  *(revisto em 28/08/2026 — antes dizia o contrário)*
A regra antiga era "não automatizar via API". Caiu por três motivos, todos testados:
- **A API não tem conversa, e é isso que resolve a alucinação.** No ChatGPT web cada "ajusta isso"
  parte do resultado anterior e o produto vai derivando. Na API, toda tentativa parte da **mesma
  foto base + prompt**. Reprovar a foto 3 não toca nas outras quatro nem herda o defeito.
- **O zoom do ML exige ≥1200px.** `gpt-image-2` entrega 1200×1200; o web não dá esse controle.
- **A chave paga é inevitável de qualquer forma** — assinatura do ChatGPT não dá acesso à API.

**O que NÃO mudou:** a fidelidade ao produto real continua sendo o risco nº 1, e por isso o
**checkpoint 3 segue humano e obrigatório**. Automatizou-se a geração, não a aprovação.

## Checkpoints que sobrevivem a qualquer automação
1. **Confirmação das top-3 semânticas** (antes de raspar) — sempre.
2. **Revisão das imagens** geradas — sempre, foto a foto.
3. **Revisão do anúncio montado** antes de publicar — sempre.

## Continuidade técnica
- **OAuth do ML:** access token vale ~6h, refresh token pra renovar; reaproveita o mesmo app do projeto financeiro (escopos diferentes: gestão de item). Segredos em `.env` local, nunca no chat.
- **Token rotation com lock:** cuidado se dois processos usarem o mesmo refresh_token ao mesmo tempo.
- **Variações (cor/tamanho):** modelar na saída estruturada desde a Fase 2 se for publicar SKUs com variação.

---

## Atualização — teste de navegador (descoberta que muda a coleta)
Testamos a extensão do Chrome de uma superfície do Claude: **conecta e roda JS na sessão logada — funciona.** Mas a **página de busca do ML** (`lista.mercadolivre.com.br`) **trava no spinner sob navegação automatizada** — os resultados não renderizam no DOM (testado 2x, com espera). Raspar a busca por automação **não é confiável**.

Consequência:
- **Descoberta de concorrentes → API** (`/sites/MLB/search?q=...` — *testar primeiro, pode estar restrita*), não raspagem de tela.
- **Extensão fica pro qualitativo** em páginas de **anúncio individual** (server-rendered, cooperam): fotos e leitura de perguntas/avaliações — além dos cliques humanos.
- Isso aproxima a Etapa A do **Claude Code** (parte de API), em vez de depender de raspar tela. "A totalmente autônoma via extensão" não é confiável — e a limitação é do ML, não da ferramenta.
