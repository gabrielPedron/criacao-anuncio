# Como o projeto roda hoje
*Escrito em 06/09/2026, lendo o repo como ele está. É a foto do que existe — não do que foi planejado.*

Os outros documentos descrevem o **método** e o **alvo**. Este descreve a **máquina**: o que entra,
o que sai, onde cada coisa mora e o que ainda está solto.

---

## O que este projeto é, mecanicamente

Uma coleção de **24 scripts Node de linha de comando**, sem dependência nenhuma, mais um conjunto de
documentos que o agente lê como manual. Não é um app, não tem servidor, não tem banco. O "runtime"
é você conversando com o Claude Code ou com o Codex local neste repo: o primeiro lê `CLAUDE.md`, o
segundo lê `AGENTS.md`, e ambos decidem qual script rodar, leem a saída e escrevem arquivos dentro de
`produtos/<slug>/`.

**~3.100 linhas no total.** Metade em `scripts/ml/` (cliente do Mercado Livre) e um terço em
`scripts/apuracao/` (núcleo de auditoria de API, que não é específico do ML).

## O que entra (inputs)

| Input | De onde vem | Sem ele |
|---|---|---|
| `ML_CLIENT_ID` / `ML_CLIENT_SECRET` | `.env`, do painel de dev do ML | nada roda |
| `.tokens.json` | gerado por `ml:autorizar`, renova sozinho 10 min antes de expirar | nada roda |
| **2+ links de concorrentes validados** | **você**, no início de todo produto | a coleta fica só no meu chute de nome parecido |
| **Semântica e top buscas do mês** | **você**, no Virtual Seller e no Nubimetrics | o título fica sem volume de busca por trás — a API não me dá isso |
| Foto base do produto, fundo branco | você → `produtos/<slug>/base/produto.png` | Fase 3 não gera |
| **Preço, estoque, clássico/premium, dimensões e peso** | **você**, antes de publicar | não se adivinha, é regra travada |
| Categoria do ML | **você** escolhe, eu não questiono | — |
| `OPENAI_API_KEY` | `.env` | Fase 3 não gera imagem |
| Avaliações dos concorrentes | Chrome, skill `leitor-de-sites` (API bloqueia 403) | perde-se o "porém" das 4★ |

Tudo o mais é derivado. **Preço nunca é calculado** — a mediana de mercado entra só como referência
no dossiê.

**As duas primeiras linhas de "você" são a Fase 0, e são o input de maior impacto.** Medido no
o segundo piloto em 06/09: a pesquisa manual rendeu mais que a descoberta automática. O projeto foi
desenhado assim de propósito — a automação cobre o que é volumoso e estruturado, o julgamento de "é
o mesmo produto" e o volume de busca ficam com a pessoa. Ver [02-etapa-A-coleta.md](02-etapa-A-coleta.md).

## O que sai (outputs)

Um produto = uma pasta. É o formato de saída inteiro do projeto:

```
produtos/<slug>/
  raw/              JSON cru da API + fotos dos concorrentes   (fora do git)
  dossie.md         a leitura do mercado, escrita por mim
  base/produto.png  a foto que você deu
  prompts-imagens.json   os 5 prompts, preenchidos a partir do dossiê
  imagens/0N-vN.png      as imagens geradas, versionadas — refazer nunca sobrescreve
  imagens/historico.md   data, modelo, ajuste pedido, veredito
  oferta*.json      título, family_name, categoria, preço, atributos, fotos, descrição
```

`oferta.json` é o **artefato central**: é o que `ml:publicar` transforma em payload do ML. Quando o
mesmo produto vira dois anúncios em categorias diferentes, viram dois arquivos na mesma pasta
(`oferta-cimento.json`, `oferta-protecao.json`) e o CLI aceita o caminho do arquivo direto.

Fora das pastas de produto: `produtos/_catalogo/` guarda o retrato da conta inteira (27 anúncios,
164 perguntas de clientes), que é base de conhecimento para os anúncios novos.

## O caminho de dados, ponta a ponta

```
FASE 0 (você, na mão): pesquisa de mercado → semântica e top buscas
                       2+ links de concorrentes validados
   │
   ├─ agente propõe top-3 semânticas
   │  🛑 CP1 você confirma antes da coleta
   ▼
links seus + categoria
   └─ ml:referencia / ml:descobrir / ml:produto / ml:demanda / ml:fotos ─┐
      Chrome (avaliações) ────────────────────────────────────────────────┤
                                                                          ▼
                                                         raw/*.json  →  dossie.md
                                                                          │
                                                                          ▼
                         relatório → prompts → título → ficha/modelo → descrição → oferta*.json
                                                                          │
                                                    midia:gerar  →  imagens/0N-vN.png
                                                                          │  🛑 CP2 revisar imagens
                                                                          ▼
                                              ml:catalogo → candidatos com links
                                                                          │  🛑 CP3 você escolhe
                                                                          ▼
                                                        ml:publicar --validar
                                                                          │  🛑 CP4 OK no anúncio
                                                                          ▼
                                                     ml:publicar --publicar --confirmo
```

## O que o projeto leva em consideração

Duas travas de segurança de verdade, em código e não só em documento:

1. **`scripts/ml/api.js` bloqueia POST/PUT/DELETE/PATCH** por padrão. Escrever exige passar
   `confirmadoPeloHumano: true` no código, e no CLI exige `--publicar --confirmo` — as duas flags.
2. **`.env` e `.tokens.json` no `.gitignore`**, tokens salvos com `mode: 0o600`, e um lock de
   diretório em `auth.js` para dois processos não queimarem o mesmo `refresh_token` (o ML rotaciona).

E as regras de conteúdo, checadas em `carregarOferta()` como aviso: título ≤ 60, descrição sem
bullet/emoji, descrição sem citar método de envio.

**A restrição que mais moldou o desenho:** o ML devolve 403 para este app em `/sites/MLB/search`,
`/items/$ID` de terceiro e `/reviews/item/$ID`. Todo o caminho de descoberta foi construído em volta
disso — categoria → highlights → produto de catálogo → itens + perguntas, e Chrome só para avaliação.

**A irreversibilidade que dói:** publicado com `family_name`, o título não muda mais por API. Por
isso existe o `ml:recriar`, que clona o anúncio inteiro só para trocar o título — e deixa o antigo
ativo, exigindo que você feche na mão.

---

## Pontas soltas (achadas lendo o código em 06/09/2026)

### 1. ~~`ml:publicar --validar` dá falso positivo~~ ✅ CORRIGIDO em 06/09/2026
`publicar-cli.ts` agora lê o `v.ok`, imprime erros e avisos um a um, e **bloqueia o `--publicar`
quando o dry-run reprova** — antes ele publicaria por cima de um payload recusado.

### 2. ~~README defasado~~ ✅ RESOLVIDO em 07/09/2026
O README passou a listar os comandos públicos e, em 10/09, ganhou um caminho direto para o manual
do operador.

### 3. ~~Documentos que se contradizem~~ ✅ ALINHADOS em 06/09/2026
*Registro do que estava errado:*
`docs/00-briefing.md`, `docs/01-roadmap.md` e o `README.md` diziam **"imagem no braço, não automatizar
via API"**. A Fase 3 roda por API desde 28/08. A regra antiga foi removida dos documentos ativos.

`docs/08` também dizia "Reautorização pendente — o token não carrega `write`". Isso foi resolvido e
o processo completo foi consolidado em 10/09.

### 4. ~~Zero teste no caminho que custa dinheiro~~ ✅ RESOLVIDO em 06/09/2026
`scripts/ml/publicar.test.ts` — 10 checks em `node --test` (`npm test`), sem framework.

### 5. `scripts/apuracao/` divergiu do skill canônico — só nas extensões
Comparado em 06/09: nos 6 arquivos, **a única diferença são as extensões `.ts` nos imports**. Zero
linha de lógica diverge. Continua aberto porque a decisão mexe em outro repo (item 5 do backlog).

### 6. ~~Import morto~~ ✅ removido em 06/09/2026.
