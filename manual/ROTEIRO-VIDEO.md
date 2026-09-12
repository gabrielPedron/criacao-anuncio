# Roteiro de gravação e capturas

Esta é a folha de produção do vídeo. Grave na ordem das telas e, ao chegar numa linha marcada como
**PRINT**, pause o avanço, salve a imagem com o nome indicado e só então continue.

## Antes de gravar

- confirme que o repositório público abre em https://github.com/gabrielPedron/criacao-anuncio;
- separe produto, categoria, estratégia, foto base, pesquisa semântica e 2+ concorrentes validados;
- confirme o acesso ao Claude Code ou ao Codex e, separadamente, os créditos da API da OpenAI;
- use navegador com cerca de 1280 px e zoom em 100%;
- desligue notificações e feche abas, favoritos e perfis que revelem dados pessoais;
- crie `manual/prints/` e mantenha `.env`, `.tokens.json`, `OPERACAO.md` e `produtos/` fora do git.

> **Ressalva para o Codex:** neste projeto, ensine o uso pelo aplicativo ou pela CLI **local**. O
> fluxo depende de `.env`, `.tokens.json`, fotos e produtos guardados no computador; esses arquivos
> não acompanham o repositório público para o Codex na nuvem. A assinatura do ChatGPT pode dar
> acesso ao Codex conforme o plano, mas não paga o uso da API da OpenAI para gerar imagens — a API
> exige chave e créditos próprios.

Grave em cinco capítulos. Isso permite parar nas telas sensíveis sem perder a gravação inteira.
Nas telas 13, 17, 21 e 22, não deixe o segredo entrar no vídeo: pare a gravação, capture a tela,
borre a cópia e use apenas a versão borrada na edição. Se não for editar, narre o passo sem abrir o
valor real.

## Legenda

- **PRINT** — salvar PNG em `manual/prints/`;
- **TEXTO** — não tirar print; guardar a saída limpa do terminal para montar o PDF;
- **NARRAR** — explicar durante o vídeo, sem captura própria.

Em toda tela, diga: onde você está, o que precisa fazer e como sabe que deu certo.

## Capítulo 1 — preparar a máquina

| Tela | Mostrar e falar | Captura |
|---|---|---|
| 01 | Abra o Node.js. Explique que o projeto exige Node 24+ e não usa dependências externas. | **PRINT** `01-node-download.png` |
| 02 | Mostre as opções Claude Code e Codex local, escolha uma para a demonstração e explique que cada uma lê seu arquivo de regras. | **PRINT** `02-agente-codigo.png` |

## Capítulo 2 — criar o aplicativo no Mercado Livre

Faça esta parte na conta principal. Uma conta colaboradora pode autenticar e ainda devolver 403.

| Tela | Mostrar e falar | Captura |
|---|---|---|
| 03 | Abra o painel de desenvolvedor e aponte **Minhas aplicações**. | **PRINT** `03-painel-ml.png` |
| 04 | Mostre o botão **Criar aplicação**. | **PRINT** `04-criar-aplicacao.png` |
| 05 | Preencha nome e Redirect URI `https://httpbin.org/get`. Explique que ela recebe o código temporário. | **PRINT** `05-nome-redirect-uri.png` |
| 06 | Marque Authorization Code e Refresh Token; deixe Client Credentials desmarcado. Destaque que sem Refresh Token a renovação automática não funciona. | **PRINT** `06-fluxos-oauth.png` |
| 07 | Mostre PKCE desativado, pois o script atual não usa `code_verifier`. | **PRINT** `07-pkce-desativado.png` |
| 08 | Mostre Mercado Livre marcado, VIS desmarcado e os escopos iniciais `read` e `offline_access`. | **PRINT** `08-negocios-escopos.png` |
| 09 | Mostre Comunicações e Publicação em leitura, com o restante sem acesso. Se a tabela não couber, divida em `09a` e `09b`. | **PRINT** `09-permissoes.png` |
| 10 | Mostre todos os tópicos ou webhooks desmarcados. Explique que o projeto não mantém servidor de eventos. | **PRINT** `10-topicos.png` |
| 11 | Salve e mostre a aplicação criada na lista. | **PRINT** `11-aplicacao-criada.png` |
| 12 | No terminal, clone a URL pública, entre na pasta e rode `node --version`. Mostre Node 24+ e explique que não precisa de `npm install`. | **TEXTO** guardar a saída limpa |
| 13 | Mostre onde ficam App ID e Secret Key. O App ID pode aparecer; a Secret Key inteira deve ser borrada. | **PRINT SENSÍVEL** `13-app-id-secret-key.png` |
| 14 | Mostre apenas os comandos que copiam `.env.example` e `OPERACAO.example.md`. Não abra os arquivos preenchidos. | **TEXTO** guardar os comandos, sem valores |

## Capítulo 3 — autorizar a conta do Mercado Livre

| Tela | Mostrar e falar | Captura |
|---|---|---|
| 15 | Rode `npm run ml:autorizar`. Explique que a URL deve ser aberta na conta principal. Não publique a URL completa. | **TEXTO** guardar uma versão sem código ou credenciais |
| 16 | Mostre a tela de consentimento e confira visualmente a conta correta antes de autorizar. | **PRINT** `16-consentimento-ml.png` |
| 17 | Depois do consentimento, mostre que o `code=` está na barra de endereço. Borre somente o valor e, se possível, aponte o parâmetro com uma seta. | **PRINT SENSÍVEL** `17-code-url.png` |
| 18 | Grave o token e rode `npm run ml:teste`. Mostre apenas a confirmação final; esconda o comando que contém a URL ou o código. | **TEXTO** guardar a saída sanitizada |

## Capítulo 4 — conectar a API da OpenAI

| Tela | Mostrar e falar | Captura |
|---|---|---|
| 19 | Abra API keys no projeto da plataforma OpenAI e mostre **Create new secret key**. | **PRINT** `19-api-keys-openai.png` |
| 20 | Mostre o diálogo de criação e dê um nome relacionado ao projeto. | **PRINT** `20-criar-chave-openai.png` |
| 21 | Explique que a chave aparece uma vez. Copie diretamente para o `.env`, fora da gravação. Deixe visível no máximo `sk-proj-…`. | **PRINT SENSÍVEL** `21-chave-openai.png` |
| 22 | Abra Billing, explique que API e assinatura de chat são cobranças separadas e mostre onde configurar crédito ou pagamento. Borre cartão e dados pessoais. | **PRINT SENSÍVEL** `22-billing-openai.png` |
| 23 | Rode `npm run midia:chaves` e `npm test`. Mostre que a chave responde sem gerar imagem e que os testes passam. | **TEXTO** guardar a saída limpa |

## Capítulo 5 — executar um produto

Use um produto e um anúncio que possam aparecer publicamente.

| Tela | Mostrar e falar | Captura |
|---|---|---|
| 24 | Abra o Claude Code ou o Codex local na raiz, envie a solicitação do produto e mostre o agente parando num checkpoint. Destaque que a pessoa conversa em português, sem decorar comandos. | **PRINT** `24-agente-checkpoint.png` |
| 25 | Mostre as três semânticas propostas. Explique que o operador confirma ou corrige antes da coleta aprofundada. | **TEXTO** guardar a resposta do agente |
| 26 | Mostre o resumo do dossiê e da oferta. Confira diferencial, título, ficha e descrição; informe preço, estoque, modalidade, dimensões e peso. | **TEXTO** guardar a resposta do agente |
| 27 | Mostre as cinco imagens juntas e explique a revisão de fidelidade, rótulo, texto, cor e proporção. | **PRINT** `27-imagens-geradas.png` |
| 27A | Abra os links dos candidatos de catálogo e escolha somente se produto, embalagem e versão forem idênticos. | **NARRAR** checkpoint de catálogo |
| 27B | Habilite o escopo `write` e escrita em Publicação, reautorize e explique que isso não remove a confirmação dupla do código. Não mostre novo `code=`. | **NARRAR** elevação de permissão |
| 27C | Mostre o payload e a validação. Explique que subir fotos locais já é escrita, que exige OK, e que o título fica travado depois da publicação. Dê o OK explícito somente após revisar tudo. | **NARRAR** checkpoint final |
| 28 | Abra o anúncio público e confira título, preço, fotos, ficha, descrição, categoria e modalidade. | **PRINT** `28-anuncio-no-ar.png` |
| 29 | Peça um resumo final com link, id, arquivo de oferta, decisões dos checkpoints e pendências, sem segredos. | **TEXTO** guardar a resposta do agente |
| 30 | Mostre a árvore final do produto: `raw/`, dossiê, base, prompts, imagens, histórico e `oferta*.json`. Explique que o próximo produto começa numa conversa nova. | **TEXTO** guardar a árvore sanitizada |

## Abertura sugerida

> Neste vídeo eu vou instalar e usar um agente que conduz a criação de um anúncio do Mercado Livre,
> da pesquisa até a publicação. Cada pessoa usa a própria conta e as próprias chaves, e nenhuma
> publicação acontece sem confirmação explícita.

## Encerramento sugerido

> O anúncio foi publicado e todo o material ficou organizado na pasta do produto. Para repetir o
> processo, eu abro uma conversa nova, entrego a pesquisa e os concorrentes validados e sigo os
> mesmos quatro checkpoints.

## Conferência depois da gravação

- confirmar os 21 PNGs previstos no [checklist](PRINTS-NECESSARIOS.md);
- borrar 13, 17, 21 e 22 também dentro do vídeo;
- revisar se terminal, histórico do shell, barra de endereço ou notificações expuseram segredos;
- transcrever as 9 telas de terminal: 12, 14, 15, 18, 23, 25, 26, 29 e 30;
- inserir os prints e saídas nos mesmos números do manual;
- revisar o PDF e assistir ao vídeo inteiro antes de publicar.
