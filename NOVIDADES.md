# Novidades

O que mudou em cada versão publicada. O `npm run atualizar` mostra a versão nova; aqui fica o
histórico. Quem mantém o projeto escreve a versão nova no topo antes de publicar.

## v3 — 11/11/2026 — Ajustes do Chrome do projeto no .env.example

**Depois de atualizar:** nada obrigatório. Só se quiser mudar o teto diário ou apontar onde está o
Chrome: copie as linhas novas do fim do `.env.example` para o seu `.env` e tire o `#` da que for usar.

- **O `.env.example` lista os ajustes que a v2 anunciou:** `ML_CHROME_LIMITE_DIA` (páginas do ML por
  dia, padrão 80), `CHROME_PATH` (caminho do Chrome, se o `verificar` não achar sozinho) e
  `ML_CHROME_PORTA` (padrão 9334). Vêm comentados: sem eles, vale o padrão.
- **Valor vazio ou errado não mexe mais no teto.** `ML_CHROME_LIMITE_DIA=` sem número, ou com texto,
  volta para 80. Antes, vazio travava o Chrome e texto tirava o limite.

## v2 — 11/11/2026 — Coleta num comando, seu nicho e leitura do site com ritmo

**Depois de atualizar:** rode `npm.cmd run verificar`. Depois, duas coisas que o `atualizar` não faz
por você, porque mexem em arquivo seu:
- abra o `OPERACAO.example.md` e copie a seção nova **"Minhas preferências de anúncio"** para o seu
  `OPERACAO.md`;
- crie o arquivo do seu nicho copiando `nichos/EXEMPLO.md` para `nichos/<seu-nicho>.md` — ou peça
  ao agente: ele faz 4 ou 5 perguntas e preenche.

- **Aviso: a leitura do site do Mercado Livre é por sua conta e risco.** `ml:busca`, `ml:sugestoes`
  e `ml:pagina` leem o site com um Chrome dirigido por código, em guia anônima, num perfil separado
  e sem a sua conta. Isso não é um canal oferecido pelo ML, que declara adotar medidas contra
  extração automatizada de dados. Quem preferir não correr o risco roda a coleta só pela API, com
  `--sem-chrome`.
- **O agente nunca abre o Mercado Livre no seu navegador.** Nada de extensão (Claude in Chrome),
  controle do computador ou navegador em que você esteja logado: só o Chrome do projeto, sem login.
- **Chrome do projeto com ritmo de gente:** pausa entre uma página e outra, no máximo 80 páginas do
  ML por dia (`ML_CHROME_LIMITE_DIA` no `.env` muda), 6 h parado se o ML bloquear e cache de 12 h
  para não ler a mesma página duas vezes (`--recarregar` lê de novo). O `CHROME_PATH` no `.env`
  agora funciona.
- **`ml:coletar` — a coleta num comando, em dois momentos.** `--sondar` lê as sugestões e a busca
  para o agente propor as 3 semânticas (checkpoint 1); `--executar` faz a coleta completa pela API e
  pelo Chrome. Sem nenhum dos dois, só mostra o que faria. O resumo mostra onde os seus anúncios
  aparecem na busca de cada termo.
- **Categoria pelo nome.** Diga o nome; o agente mostra ID, caminho e link e só grava com o seu OK.
- **`ml:referencia` diz de quem é cada link** — seu, catálogo em que você também vende, ou
  concorrente — e o agente para e pergunta se não bater com o que você disse.
- **Seu nicho e suas preferências** passam a ser lidos antes do título, das imagens e da descrição.
  No fim de cada anúncio, o agente propõe o que aprendeu e só grava no arquivo do nicho com o seu OK.
- **Comandos novos:** `ml:proximo` (diz o próximo passo pelos arquivos do produto), `ml:posicao`
  (histórico da posição orgânica em `posicao.csv`, para abrir na planilha) e `ml:catalogo-status`
  (se o seu anúncio está ligado a um produto de catálogo e se pode competir nele).
- **Visitas de concorrente saíram.** Desde outubro o ML não mostra mais as visitas de anúncio de
  outro vendedor. O `ml:demanda` funciona só para o seu anúncio e avisa em vez de mostrar 0; o
  `ml:descobrir` passa a ordenar pelos mais vendidos da categoria e pelo número de perguntas.
- **`ml:produto` traz a descrição dos concorrentes** pela API, sem precisar do Chrome.

## v1 — 06/10/2026 — Chrome para busca, garantia no publicar e conferência antes de publicar

Primeira versão numerada. As atualizações anteriores (até 26/09/2026) não tinham número.

**Depois de atualizar:** rode `npm.cmd run verificar`. Se você tem uma oferta em andamento, acrescente
a garantia no `oferta.json` (veja abaixo), senão o `ml:publicar` recusa.

- **Comandos novos que leem a página do Mercado Livre** (o que a API não entrega): `ml:busca` (total
  de resultados e 1ª página da busca, com os patrocinados marcados), `ml:sugestoes` (as sugestões de
  busca do ML) e `ml:pagina` (anúncio de outro vendedor: preço, vendidos, ficha, descrição e
  avaliações). Abrem o Google Chrome em guia anônima, num perfil separado — não usam o seu Chrome
  nem a sua conta. **Precisam do Google Chrome instalado**; o `verificar` agora confere.
- **Garantia obrigatória na oferta.** O `oferta.json` ganhou o campo
  `"garantia": {"tipo": "fabrica", "prazo": "3 meses"}` (tipos: `fabrica`, `vendedor`, `sem`). Antes o
  `ml:publicar` nunca enviava garantia e o anúncio ia ao ar sem ela. Sem código de barras, o
  `ml:publicar` avisa; diga o motivo em `"sem_gtin_motivo"`.
- **`ml:conferir`** — roda antes da revisão final: título como vai aparecer, ficha comparada com a
  categoria e com os concorrentes, código de barras, garantia, dúvidas do dossiê que a descrição
  precisa responder e o que ainda está PENDENTE na ficha de entrada.
- **`ml:editar`** — completa um anúncio já publicado (garantia, atributo da ficha ou descrição),
  mostra o antes e o depois, só grava com `--confirmo` e confere que nada mais mudou.
- **`ml:saude`** — a nota de qualidade que o próprio Mercado Livre dá ao anúncio e o que ele aponta
  como pendente. Último passo depois de publicar; `--conta` revisa todos os anúncios ativos.
- **`ml:publicar`** grava no `oferta.json` os ids das fotos que subiu: se a publicação falhar depois,
  a próxima tentativa não sobe as fotos de novo.
- **Método:** conferências antes do dossiê (anúncio "próprio" precisa de prova, a unidade do rótulo
  manda, avaliação de catálogo pode ser de outro produto); capa semiambientada; o ML acrescenta cor e
  acabamento no fim do título; metodologia externa lida com `git pull` antes de consultar.
- **Trilha Hermes (em teste)** documentada em `manual/HERMES-INSTALACAO.md`.
