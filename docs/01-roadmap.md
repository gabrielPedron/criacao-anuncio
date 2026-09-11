# Roadmap de automação — pipeline de criação de anúncios
*(revisado: Etapa B migra pro Claude Code e vai até o publish)*

## Mapa de ferramentas (onde cada coisa roda)
- **Pesquisa (Etapa A):** **você**, na ferramenta que escolher, entrega a semântica e os links —
  Fase 0. Depois **Claude Code** amplia pela API do ML, e o **Chrome** cobre só as avaliações.
- **Handoff:** não há mais paste — A e B rodam no mesmo repo. O dossiê é `produtos/<slug>/dossie.md`.
- **Criação da oferta + API + publish (Etapa B):** **Claude Code** — reasoning da copy + chamadas de API + publish, tudo num lugar.
- **Imagens:** **API da OpenAI** (`npm run midia:gerar`) desde 28/08/2026, com revisão humana obrigatória (ver abaixo).
- **Orquestrar A→B num lugar só:** **Cowork** — futuro, só depois de validar.

## Onde estamos *(06/09/2026)*
- Etapa A: Fase 0 (pesquisa dele) + API + Chrome → **dossiê**. Checkpoint: confirmação das top-3 semânticas.
- Etapa B: dossiê + foto base → oferta → imagens → validação → publish.
- **Status: rodou de ponta a ponta.** Dois pilotos publicados, um deles em duas categorias. A Fase 0 formal ainda não fechou (faltam produtos para calibrar).

## Estratégia de anúncio
- O operador escolhe catálogo, orgânico ou ambos.
- No catálogo, o operador confirma a equivalência exata antes de participar.
- No orgânico, os ativos são próprios e o campo modelo pode receber palavras-chave confirmadas.

## API do ML — onde entra
- **Leitura (Fase 1):** categoria certa + **schema real de atributos**. Ficha exata em vez de chutada. Read-only, risco zero.
- **Escrita/publish (Fase 4):** criar o item via API. **Sem ERP** (você não tem Bling/Olist) → é você construindo, não plugando.
  - O fluxo **User Products** está implementado. `family_name` vira o título e fica travado
    depois da publicação.

## Roadmap faseado
- **Fase 0 — Pesquisa do operador.** Semântica e links validados entram antes da automação.
- **Fase 1 — API de leitura (Code).** Recebe o produto/categoria → devolve atributos reais,
  catálogo, vendedores, perguntas, visitas e fotos.
- **Fase 2 — Etapa B no Code.** Consome o dossiê + a ficha real → gera relatório de oferta,
  prompts de foto, título, ficha+modelo e descrição, nessa ordem.
- **Fase 3 — Imagens + validação.** ✅ `npm run midia:gerar` gera as 5 pela API da OpenAI, versionadas; **você revisa e reprova por foto** (`--foto N --ajuste "..."`). Ver abaixo por que deixou de ser no braço.
- **Fase 4 — Publicação (API de escrita, por último).** Sobe as fotos e publica somente as
  modalidades escolhidas pelo operador: catálogo, orgânico ou ambos. Sempre **após o OK humano**.
- **Fase 5 — (futuro, opcional) Cowork.** Orquestra A→B num lugar só, removendo o copia-e-cola. Mantém o checkpoint das semânticas.

## Por que a imagem SAIU do braço  *(revisto em 28/08/2026 — antes dizia o contrário)*
A regra antiga era "não automatizar via API". Caiu por três motivos, todos testados:
- **A API não tem conversa, e é isso que resolve a alucinação.** No ChatGPT web cada "ajusta isso"
  parte do resultado anterior e o produto vai derivando. Na API, toda tentativa parte da **mesma
  foto base + prompt**. Reprovar a foto 3 não toca nas outras quatro nem herda o defeito.
- **O zoom do ML exige ≥1200px.** `gpt-image-2` entrega 1200×1200; o web não dá esse controle.
- **A chave paga é inevitável de qualquer forma** — assinatura do ChatGPT não dá acesso à API.

**O que NÃO mudou:** a fidelidade ao produto real continua sendo o risco nº 1, e por isso o
**checkpoint 2 segue humano e obrigatório**. Automatizou-se a geração, não a aprovação.

## Checkpoints que sobrevivem a qualquer automação
1. **Confirmação das top-3 semânticas** (antes de raspar) — sempre.
2. **Revisão das imagens** geradas — sempre, foto a foto.
3. **Escolha do catálogo** pelo operador — sempre.
4. **Revisão do anúncio montado** antes de publicar — sempre.

## Continuidade técnica
- **OAuth do ML:** access token vale ~6h e o refresh token permite renovar; cada operador usa o
  próprio app. Segredos ficam em `.env` e `.tokens.json`, nunca no chat.
- **Token rotation com lock:** cuidado se dois processos usarem o mesmo refresh_token ao mesmo tempo.
- **Variações (cor/tamanho):** modelar na saída estruturada desde a Fase 2 se for publicar SKUs com variação.

---

## Rotas confirmadas da coleta
`/sites/MLB/search` e a busca visual automatizada não são utilizáveis. A descoberta usa categoria →
highlights → produto de catálogo → itens. Perguntas e fotos vêm da API; o Chrome é usado somente
para avaliações de concorrentes. A pesquisa de volume e concorrência continua manual, feita pelo
operador na ferramenta que escolher.
