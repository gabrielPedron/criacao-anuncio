# Roteiro do vídeo — baixar, abrir e conectar

## Objetivo

O vídeo termina com o projeto instalado e as conexões explicadas ou validadas. A criação do primeiro
anúncio não precisa ser gravada: depois da configuração, o Claude Code ou o Codex lê as regras do
repositório e conduz o operador pelo processo escrito.

O caminho mostrado é:

```text
repositório público no GitHub
        ↓ git clone
cópia local na máquina do operador
        ↓ abrir no Claude Code ou Codex
o agente lê CLAUDE.md ou AGENTS.md
        ↓
arquivos privados e conexões são configurados localmente
        ↓
o agente pede os dados do primeiro produto
```

## Qual repositório mostrar

Mostre somente o repositório público:

```text
https://github.com/gabrielPedron/criacao-anuncio
```

O operador **baixa uma cópia** desse repositório para a própria máquina. Ele não precisa criar outro
repositório, fazer fork, enviar arquivos ao GitHub nem executar `git push`. O trabalho real acontece
na pasta local, e os dados da operação ficam fora do git.

Para gravar, use de preferência uma pasta nova obtida do repositório público. Não grave dentro do
repositório privado de desenvolvimento.

## O que nunca pode aparecer no vídeo

- conteúdo do `.env` preenchido;
- `ML_CLIENT_SECRET`;
- `OPENAI_API_KEY`, mesmo parcialmente;
- conteúdo do `.tokens.json`, incluindo Access Token e Refresh Token;
- valor de `code=` ou a URL completa devolvida após autorizar o Mercado Livre;
- `OPERACAO.md` preenchido;
- dados de compradores, mensagens, vendas, notificações ou números da conta;
- cartão, saldo e dados pessoais da área de faturamento.

O App ID não é tratado como senha, mas também não precisa ser mostrado. Antes de gravar, feche abas,
oculte favoritos e notificações e use uma janela de terminal sem histórico sensível.

## Parte 1 — apresentar o projeto

Abra o repositório público e diga:

> Este repositório contém o método, os scripts e as instruções do agente. Ele não contém minha conta,
> meus produtos nem minhas credenciais. Cada pessoa baixa uma cópia e conecta as próprias contas na
> própria máquina.

Mostre rapidamente `README.md`, `AGENTS.md`, `CLAUDE.md` e `manual/`, sem percorrer todos os arquivos.

## Parte 2 — baixar a cópia local

No terminal, execute:

```powershell
git clone https://github.com/gabrielPedron/criacao-anuncio.git
Set-Location criacao-anuncio
node --version
```

Explique que `git clone` significa **baixar o projeto**. A versão do Node deve ser 24 ou superior, e
não é necessário executar `npm install`.

## Parte 3 — abrir a pasta na IA

Abra a pasta `criacao-anuncio` no agente escolhido:

- Claude Code lê `CLAUDE.md`;
- Codex local lê `AGENTS.md`.

Use esta primeira mensagem:

```text
Acabei de baixar este projeto. Leia as instruções do repositório e me conduza pela configuração
inicial. Verifique o que está faltando sem mostrar nem pedir que eu cole segredos na conversa.
Pare quando as conexões estiverem validadas e me diga o próximo passo.
```

Explique que não é preciso instalar o agente dentro do projeto nem importar um prompt. Abrir a pasta
correta é o que dá à IA acesso às instruções e aos scripts.

## Parte 4 — explicar os arquivos locais

Mostre apenas os modelos públicos `.env.example` e `OPERACAO.example.md`. A IA deve orientar ou
executar a criação das cópias locais:

```powershell
Copy-Item .env.example .env
Copy-Item OPERACAO.example.md OPERACAO.md
```

Explique sem abrir os arquivos preenchidos:

- `.env.example`: modelo vazio das configurações técnicas;
- `.env`: credenciais reais do Mercado Livre e da API da OpenAI;
- `OPERACAO.example.md`: modelo de contexto do negócio;
- `OPERACAO.md`: contexto real da operação;
- `.tokens.json`: criado pela autorização do Mercado Livre e renovado pelo projeto;
- `produtos/`: pasta local de trabalho de cada produto.

Esses arquivos privados não são enviados ao GitHub.

## Parte 5 — conectar o Mercado Livre

Mostre no painel de desenvolvedores onde criar a aplicação e explique as configurações escritas no
[manual de instalação](01-INSTALACAO.md): Redirect URI, Authorization Code, Refresh Token, escopos e
permissões iniciais de leitura.

Não mostre a Secret Key nem faça a troca do código com a gravação aberta. Narre a sequência:

1. App ID e Secret Key são colocados no `.env`, fora da gravação.
2. `npm run ml:autorizar` gera a URL de consentimento.
3. O operador autoriza a própria conta principal no navegador.
4. A URL devolvida, que contém `code=`, é usada localmente e não é enviada para a IA.
5. O projeto cria `.tokens.json`.
6. `npm run ml:teste` confirma a conexão.

Se quiser mostrar a confirmação real, retome a gravação somente depois que `.tokens.json` já existir
e mostre uma saída sanitizada de `npm run ml:teste`, sem identificadores da conta.

## Parte 6 — conectar a geração de imagens

Explique que a assinatura do ChatGPT ou do Claude não paga a API usada para gerar imagens. Cada
operador cria a própria chave em `platform.openai.com`, configura faturamento e guarda a chave no
`.env`, fora da gravação.

Depois de ocultar os dados da conta, mostre apenas os comandos de validação:

```powershell
npm run midia:chaves
npm test
```

O primeiro confirma a chave sem gerar imagem; o segundo testa o caminho de publicação sem criar um
anúncio.

## Parte 7 — entregar a condução para a IA

Finalize com esta mensagem no agente:

```text
A configuração inicial terminou. Verifique as conexões sem exibir segredos e me diga exatamente o
que você precisa de mim para começar o primeiro produto. Não publique nada sem meu OK explícito.
```

O agente deve pedir, no mínimo, a semântica da pesquisa e dois links de concorrentes que o operador
confirmou serem o mesmo produto. A partir daí, o processo continua pelo
[guia do primeiro anúncio](02-PRIMEIRO-ANUNCIO.md), com os quatro checkpoints humanos.

## Abertura sugerida

> Neste vídeo eu vou mostrar onde encontrar o projeto, como baixar uma cópia para o seu computador e
> como deixar o Claude Code ou o Codex pronto para conectar suas contas. Depois dessa configuração,
> o próprio agente lê as regras e conduz você na criação do primeiro anúncio.

## Encerramento sugerido

> O projeto ficou instalado localmente e as conexões estão prontas. Daqui em diante, eu só informo o
> produto, minha pesquisa e os concorrentes que validei. O agente pede o que faltar, organiza os
> arquivos e para nos checkpoints antes de qualquer publicação.

## Conferência antes de publicar o vídeo

- assistir ao vídeo inteiro procurando chaves, tokens, códigos, URLs e dados de conta;
- revisar terminal, barra de endereço, notificações, favoritos e histórico do navegador;
- confirmar que apenas o repositório público foi apresentado;
- confirmar que nenhum `git push` ou upload foi ensinado;
- confirmar que a IA recebeu a mensagem de configuração inicial e assumiu o próximo passo.
