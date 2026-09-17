# Handoff para outro agente (Codex)
*Escrito em 10/09/2026 e atualizado em 17/09/2026. É a foto do estado. As regras ficam no `AGENTS.md`.*

> **Este arquivo vai para o repo público** quando for commitado (o gerador do snapshot exporta o
> `HEAD`). Não escreva aqui nome de conta, de loja, de pessoa nem id de usuário. Isso mora no
> `OPERACAO.md`, que é local.

---

## 1. Objetivo e stack

**Objetivo:** um pipeline de criação de anúncios do Mercado Livre, conduzido por um agente de código:
Fase 0 (pesquisa manual do operador) → coleta (API do ML + Chrome para avaliações) → dossiê →
oferta → 5 imagens (OpenAI) → escolha de catálogo → publicação. Tem 4 checkpoints humanos. Já
publicou anúncios reais.

**Stack:** Node 24 puro, ESM, **sem dependências**. Os `.ts` rodam direto por type stripping, sem
build, e os imports levam **extensão explícita**. São cerca de 24 scripts de CLI em `scripts/ml/`,
`scripts/midia/` e `scripts/apuracao/`. Não tem servidor, banco nem deploy: o "runtime" é o agente
lendo os docs e rodando os scripts.

**Leitura obrigatória antes de agir, nesta ordem:**
1. `AGENTS.md` — as regras (hoje é uma cópia idêntica do `CLAUDE.md`)
2. `OPERACAO.md` — **local, fora do git**: conta, produtos e preferências de quem opera
3. `docs/17-como-roda.md` — como a máquina funciona
4. `docs/07-backlog.md` — o que está aberto

## 2. Estado do Git

| | |
|---|---|
| Branch de trabalho | **`master`**. O handoff foi integrado por fast-forward em 10/09 |
| Branch principal | **`master`**. **Não existe `main`** neste repo |
| Remote | **nenhum**. O repo só existe nesta máquina |

Commits recentes relevantes, do mais novo para o mais antigo:
```
1b003f6 Adiciona ressalva do Codex ao roteiro
5f5b442 Adapta manual para Claude Code e Codex
f433e49 Publica URL oficial do projeto
```

`AGENTS.md` e `CLAUDE.md` são mantidos byte a byte iguais para que Codex e Claude Code recebam as
mesmas regras. O onboarding de um clone novo está nesses arquivos: o agente verifica o ambiente,
orienta os arquivos privados, valida as conexões e então pede os inputs da Fase 0.

**O repo público** fica em `../criacao-anuncio-publico`, branch `main`, com o remote
`https://github.com/gabrielPedron/criacao-anuncio.git`. O snapshot foi regenerado e publicado no
GitHub depois da integração do handoff e da remoção do comando interno `publicar` do `package.json`.

## 3. O que foi feito

**Continuação no Codex (10/09):** o handoff foi integrado ao `master` por fast-forward. O comando
interno `publicar` saiu do `package.json`, porque o script correspondente não faz parte do clone
público. Os 14 testes passaram no repo de trabalho e no snapshot público. O snapshot foi publicado
em `https://github.com/gabrielPedron/criacao-anuncio`. Nenhuma chamada foi feita à API do ML nem à
OpenAI.

Depois disso, a documentação genérica foi estruturada em `manual/`: instalação escrita, primeiro
anúncio e roteiro curto do vídeo de distribuição. Foi criado `OPERACAO.example.md`, as fontes
canônicas foram declaradas e uma revisão em dois eixos alinhou User Products, os quatro checkpoints,
a ordem da Etapa B, os segredos locais e a estrutura real de `produtos/<slug>/`.

**Nas sessões anteriores (06–07/09)**, para contexto. O detalhe está em `docs/07-backlog.md` §RESOLVIDOS:
- **Método separado do negócio.** `produtos/` e `OPERACAO.md` saíram do git. O README foi reescrito
  genérico, e nenhum arquivo versionado cita marca, conta ou pessoa.
- **Gerador do snapshot público** (`scripts/publicar-repo.ts`, que o `.gitignore` exclui porque é ferramenta do
  mantenedor). Ele regera o repo público como snapshot sem histórico, a partir do `HEAD`, e **recusa**
  se achar segredo, identidade de quem opera ou `produtos/`. Não faz push.
- **Code review encerrado:** as três escritas sem confirmação foram fechadas, o `family_name` acima de
  60 agora lança erro em vez de truncar, e o `tipo_anuncio` e as dimensões passaram a ser exigidos.
- O `ml:descobrir` foi paralelizado em lotes de 8: de 1m36s para 25s, com o mesmo resultado.

## 4. Decisões e restrições que não se negociam

Estão completas no `AGENTS.md`. As que mais machucam se forem esquecidas:
- **Não escrever na API do ML** (publicar, editar, apagar) sem OK explícito do operador na conversa.
  A trava em `scripts/ml/api.js` bloqueia POST/PUT/DELETE/PATCH. **Não remova.**
- **O título é irreversível** depois de publicado com `family_name` (`docs/16`).
- **Preço, estoque, clássico/premium, dimensões e peso vêm do operador.** Não se calcula margem, e a
  mediana do mercado nunca vira preço.
- **Categoria e catálogo são escolha do operador.** Mande os links dos candidatos e deixe ele decidir.
- **Ferramenta de pesquisa (Nubimetrics etc.) não se automatiza.** O operador cola o resultado em
  texto (`docs/11`).
- **Endpoints bloqueados (403):** `/sites/MLB/search`, `/items/$ID` de terceiros e
  `/reviews/item/$ID`. Leia `docs/06-mapa-da-api.md` antes de escrever chamada nova.
- **Campo novo da API:** rode `npm run ml:apurar -- /caminho` antes de escrever código que lê esse
  campo. `tags[]` é conjunto, nunca posição.
- **Sem dependências novas.** Comentários e mensagens de erro em português.
- **Operadores não fazem push.** Eles apenas clonam o repo público e trabalham localmente. O push do
  snapshot público é tarefa de manutenção deste projeto.

## 5. Testes e comandos executados nesta continuação

| Comando | Resultado |
|---|---|
| `npm test` | **14/14 passando**, 0 falhas (`scripts/ml/publicar.test.ts`, via `node --test`) |
| `npm run apuracao:teste` | núcleo de apuração passando |
| `npm run ml:apurar -- /users/me --repeticoes 3` | leitura real concluída: 3 amostras, 0 falhas e 0 campos instáveis |
| links e comandos do manual | documentação escrita e roteiro de instalação coerentes |
| `git diff --check` | sem erro de whitespace; apenas aviso esperado de CRLF do Git no Windows |
| `node --version` | v24.14.1 |

Não houve escrita na API do Mercado Livre nem chamada de geração na OpenAI.

## 6. Pendências, bugs conhecidos e próximos passos (em ordem)

1. **Gravar o vídeo de distribuição.** Mostrar o repo público, o clone local, a abertura no agente e
   as conexões. A criação do anúncio permanece no manual escrito e é conduzida pelo agente.
2. **Backlog que continua aberto** (`docs/07-backlog.md`):
   - comando de setup guiado;
   - testar o método num nicho distante do atual;
   - item 9: sincronizar `scripts/apuracao/` com o skill canônico. **Espera decisão do operador** e
     mexe em outro repo;
   - item 10: trazer os prompts de vídeo do operador para `prompts/`.
3. **A pendência da operação** (ficha incompleta de anúncios já publicados) é dado de produto, não
   engenharia. Está descrita no `OPERACAO.md`.

**Limitação conhecida, que não é tarefa:** um concorrente que nunca entrou em catálogo não aparece
na API. O contorno é a Fase 0 (backlog item 14).

## 7. Ambiente

- **Node 24+** (o type stripping de `.ts` depende disso). Não precisa de `npm install`: não há dependências.
- Os segredos ficam no **`.env`** (modelo em `.env.example`), com as variáveis `ML_CLIENT_ID`,
  `ML_CLIENT_SECRET`, `ML_REDIRECT_URI`, `ML_SITE` e `OPENAI_API_KEY`. **Nunca imprima nem commite
  o `.env`.**
- O token do ML fica em **`.tokens.json`**, gerado por `npm run ml:autorizar` e renovado sozinho, com
  um lock em `auth.js` porque o ML rotaciona o `refresh_token`. **Não abra, não copie, não apague.**
  Se dois processos renovarem ao mesmo tempo, o token queima e o operador precisa reautorizar.
- Para conferir a conexão sem expor nada: `npm run ml:teste` (leitura) e `npm run midia:chaves`
  (só diz se a chave está presente).
- O `.env`, o `.tokens.json`, o `OPERACAO.md` e o `produtos/` existem nesta máquina e **estão todos
  fora do git**. Quem rodar num clone limpo não tem nenhum deles: precisa criar o próprio app no ML
  (`docs/05`) e pedir o `OPERACAO.md` ao operador.
- Shell: Windows. O `publicar-repo.ts` chama `sh`, `tar` e `cp`, então rode pelo Git Bash.
