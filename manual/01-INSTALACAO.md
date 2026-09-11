# Instalação — do zero às conexões validadas

Este é o texto-base da primeira parte do manual e do vídeo. Os números 01–23 identificam a tela
correspondente; por isso não devem ser renumerados quando as imagens forem inseridas.

## Antes de começar

Você precisa de uma conta principal de vendedor no Mercado Livre, acesso ao painel de aplicativos
do ML, Git, Node.js 24 ou superior, Claude Code e uma conta na plataforma de API da OpenAI.

Os segredos ficam somente nos arquivos locais `.env` e `.tokens.json`. Nunca cole Secret Key, chave
da OpenAI, token ou o valor do `code=` numa conversa, captura pública ou commit.

## Parte 1 — preparar a máquina

### 01 — Instalar Node.js 24 ou superior

Acesse [nodejs.org](https://nodejs.org/), instale uma versão compatível e mantenha as opções padrão.
O projeto usa recursos nativos do Node 24 e não possui dependências para instalar.

### 02 — Instalar e entrar no Claude Code

Acesse [claude.com/claude-code](https://claude.com/claude-code) e use a instrução de instalação
mostrada no site. Depois, autentique o Claude Code com a sua própria conta.

> A interface e o comando de instalação podem mudar. Na gravação, siga o que o site oficial mostrar
> no dia, sem copiar um comando antigo deste manual.

## Parte 2 — criar o aplicativo no Mercado Livre

Faça esta parte logado na conta principal do Mercado Livre. Conta de colaborador pode permitir o
login e ainda assim devolver 403 quando a API for usada.

### 03 — Abrir o painel de desenvolvedor

Acesse [developers.mercadolivre.com.br](https://developers.mercadolivre.com.br/) e localize
**Minhas aplicações**.

### 04 — Criar uma aplicação

Abra **Minhas aplicações**, clique em **Criar aplicação** e escolha um nome que identifique o uso,
por exemplo `meus-anuncios`.

### 05 — Informar a Redirect URI

Use exatamente:

```text
https://httpbin.org/get
```

Essa página apenas exibe o código temporário devolvido pelo Mercado Livre. Ela evita a necessidade
de manter um servidor durante a instalação.

### 06 — Configurar os fluxos OAuth

Marque **Authorization Code** e **Refresh Token**. Deixe **Client Credentials** desmarcado.

O Refresh Token costuma vir desmarcado. Sem ele, o acesso expira e a autorização precisa ser refeita
manualmente; com ele, o projeto renova o acesso sozinho.

### 07 — Deixar PKCE desativado

Os scripts atuais não implementam `code_verifier`. Se a opção PKCE estiver ligada, a autorização
falhará.

### 08 — Selecionar negócio e escopos

Selecione **Mercado Livre**, deixe **VIS** desmarcado e habilite `read` e `offline_access`.

Comece apenas com leitura. Quando o anúncio estiver pronto para publicação, será necessário habilitar
o escopo `write`, liberar escrita em Publicação e reautorizar o app; essa elevação aparece no guia do
primeiro anúncio.

### 09 — Configurar as permissões

Use o menor acesso necessário:

| Área | Acesso inicial |
|---|---|
| Comunicações pré e pós-vendas | Leitura |
| Publicação e sincronização | Leitura |
| Demais áreas configuráveis | Sem acesso |

Se o painel travar alguma permissão obrigatória, mantenha o valor imposto pelo Mercado Livre. Não
libere escrita em mensagens: o agente não responde clientes em nome da loja.

### 10 — Não assinar tópicos

Deixe todos os tópicos ou webhooks desmarcados. O projeto não mantém servidor para receber eventos.

### 11 — Concluir a aplicação

Salve e confirme que o novo aplicativo aparece em **Minhas aplicações**.

### 12 — Preparar o projeto no terminal

Clone o repositório, entre na pasta e confirme o Node:

```powershell
git clone https://github.com/gabrielPedron/criacao-anuncio.git
Set-Location criacao-anuncio
node --version
```

A versão deve começar com `v24` ou ser superior. Não rode `npm install`: o projeto usa somente
recursos nativos.

### 13 — Localizar App ID e Secret Key

No aplicativo recém-criado, localize os dois valores. O App ID pode aparecer em documentação; a
Secret Key deve ser tratada como senha e borrada em qualquer captura.

### 14 — Criar os arquivos locais

No PowerShell, dentro do projeto:

```powershell
Copy-Item .env.example .env
Copy-Item OPERACAO.example.md OPERACAO.md
```

Abra `.env` no editor e preencha sem mostrar os valores no terminal:

```text
ML_CLIENT_ID=App ID
ML_CLIENT_SECRET=Secret Key
ML_REDIRECT_URI=https://httpbin.org/get
ML_SITE=MLB
OPENAI_API_KEY=
```

Preencha também o `OPERACAO.md` com o contexto da sua operação. Os dois arquivos são locais e não
devem ser enviados ao git.

## Parte 3 — autorizar a conta do Mercado Livre

### 15 — Gerar a URL de autorização

Execute:

```powershell
npm run ml:autorizar
```

O comando imprime uma URL. Abra-a no navegador sem copiar a URL para conversas ou documentos.

### 16 — Dar consentimento no Mercado Livre

Confira se está na conta principal correta e autorize o aplicativo.

### 17 — Copiar a URL que contém `code=`

Depois do consentimento, o navegador abre o httpbin. Copie a URL inteira da barra de endereço.
O código é temporário, de uso único e deve ser borrado na captura.

### 18 — Gravar o token e validar a conexão

Volte ao terminal e execute imediatamente:

```powershell
npm run ml:autorizar -- "COLE_A_URL_INTEIRA_AQUI"
npm run ml:teste
```

O primeiro comando grava `.tokens.json`; o segundo deve confirmar `/users/me`. Um 403 em endpoints
de busca pode ser uma restrição conhecida do ML e não significa que `/users/me` falhou.

## Parte 4 — conectar a API da OpenAI

### 19 — Abrir a área de chaves

Acesse [platform.openai.com](https://platform.openai.com/), selecione o projeto que será usado e
abra **API keys**. O [quickstart oficial da OpenAI](https://developers.openai.com/api/docs/quickstart)
é a referência caso os nomes ou a posição dos controles mudem.

### 20 — Criar uma chave secreta

Clique em **Create new secret key**, dê um nome relacionado ao projeto e confirme.

### 21 — Copiar a chave uma única vez

Copie a chave no momento da criação e guarde-a diretamente no `.env`. Na captura, deixe visível no
máximo o prefixo `sk-proj-…`.

### 22 — Configurar o faturamento da API

Abra **Billing** na plataforma da OpenAI, adicione uma forma de pagamento ou créditos e confira os
limites da conta. A API é cobrada separadamente de assinaturas de chat. Borre qualquer cartão ou
dado pessoal na captura.

### 23 — Validar a chave sem gerar imagem

Preencha `OPENAI_API_KEY` no `.env` e execute:

```powershell
npm run midia:chaves
npm test
```

O primeiro comando apenas consulta os modelos disponíveis; não gera imagem. O segundo valida o
caminho de publicação sem escrever na API do Mercado Livre.

## Instalação concluída

Você terminou quando `npm run ml:teste`, `npm run midia:chaves` e `npm test` passam. Continue em
[Primeiro anúncio — como conversar com o agente](02-PRIMEIRO-ANUNCIO.md).
