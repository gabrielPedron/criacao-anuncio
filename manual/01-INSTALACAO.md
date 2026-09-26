# Instalação — do zero ao primeiro anúncio pronto para começar

Este manual segue a mesma ordem da aula em vídeo. Faça uma vez só; depois de instalado, cada produto
novo começa direto no [guia do primeiro anúncio](02-PRIMEIRO-ANUNCIO.md).

## O que você vai precisar

- Windows com **PowerShell** (já vem instalado).
- **Claude Code** ou **Codex** (versão *Code* do Claude ou do ChatGPT). Tanto faz qual: o projeto
  funciona igual nos dois.
- Conta **principal** de vendedor no Mercado Livre. Conta de colaborador pode entrar no painel e
  mesmo assim ser recusada pela API.
- Conta na **plataforma de API da OpenAI**, com crédito pré-pago (mínimo US$ 5). É separada da
  assinatura do ChatGPT e serve só para gerar as imagens.

> **Três coisas nunca vão para conversa, print ou vídeo:** a Secret Key do Mercado Livre, a chave
> da OpenAI e o conteúdo dos arquivos `.env`, `.tokens.json` e `OPERACAO.md`. Elas ficam só no seu
> computador.

## Parte 1 — preparar o computador

### 1. Conferir o Node.js

Abra o menu Iniciar, pesquise **PowerShell** e abra o **Windows PowerShell** (não precisa ser como
administrador). Digite:

```powershell
node --version
```

Se aparecer `v24` ou maior (ex.: `v24.14.1`), está pronto. Se der erro ou mostrar versão menor,
pesquise **node.js download**, baixe o instalador para Windows em
[nodejs.org](https://nodejs.org/), instale com as opções padrão e **feche e abra o PowerShell** de
novo.

### 2. Conferir o Git

```powershell
git --version
```

Se der erro, instale pelo [git-scm.com](https://git-scm.com/download/win) com as opções padrão e
feche e abra o PowerShell de novo.

### 3. Baixar o projeto

Rode os três comandos, um de cada vez:

```powershell
Set-Location $HOME\Documents
git clone https://github.com/gabrielPedron/criacao-anuncio.git
Set-Location .\criacao-anuncio
```

O `git clone` já cria a cópia do projeto no seu computador. Você não precisa criar repositório,
fazer fork nem enviar nada para a nuvem.

> **Dica de organização:** se você já usa o Claude Code ou o Codex, provavelmente tem uma pasta
> `Documents\Claude` ou `Documents\Codex` com seus projetos. Nesse caso, troque o primeiro comando
> por `Set-Location $HOME\Documents\Claude` (ou `Codex`) para manter tudo junto.

### 4. Criar os arquivos da sua operação

Ainda no PowerShell, dentro da pasta do projeto:

```powershell
Copy-Item .env.example .env
Copy-Item OPERACAO.example.md OPERACAO.md
```

- `.env` vai guardar as chaves de conexão com o Mercado Livre e com a OpenAI.
- `OPERACAO.md` vai guardar o contexto do seu negócio (nicho, conta, preferências).
- `.tokens.json` aparece sozinho depois que você autorizar o Mercado Livre, e o projeto o renova
  automaticamente.
- `produtos/` vai receber uma pasta para cada produto que o agente criar.

Nenhum desses quatro vai para o Git: eles são só seus.

### 5. Abrir o projeto no agente

No **Claude** ou no **ChatGPT**, entre na versão **Code** (na parte superior da janela), clique em
**Novo**, escolha a pasta `Documents\criacao-anuncio` e confirme **Confiar no workspace**.

Mande esta primeira mensagem:

```text
Acabei de baixar este projeto, leia as instruções do repositório e me conduza pela
configuração inicial.
```

O agente lê as regras do projeto sozinho e vai acompanhando você nas próximas partes.

## Parte 2 — conectar o Mercado Livre

### 6. Criar o aplicativo

Logado na conta **principal**, acesse
[developers.mercadolivre.com.br/devcenter](https://developers.mercadolivre.com.br/devcenter) e
clique em **Criar nova aplicação**. Preencha:

| Campo | O que colocar |
|---|---|
| Nome | algo como `criacao-anuncio-seunegocio` |
| Faixa de usuários | 1 a 10 |
| Logotipo | qualquer imagem |
| URI de Redirect | `https://httpbin.org/get` (exatamente assim) |
| Fluxos OAuth | **Authorization Code** e **Refresh Token** marcados; **Client Credentials** desmarcado |
| PKCE | desativado |
| Negócio | Mercado Livre |
| Escopos | `read`, `write` e `offline_access` |
| Tópicos / notificações | nenhum |

O **Refresh Token** é o que mantém a conexão ativa sozinha. Sem ele, você teria que autorizar de
novo a cada poucas horas.

### 7. Configurar as permissões

| Área | Acesso |
|---|---|
| Comunicações pré e pós-venda | Leitura |
| Publicação e sincronização | **Leitura e escrita** |
| Publicidade | Leitura |
| Faturamento | Leitura |
| Métricas do negócio | Leitura |
| Promoções, cupons e descontos | Leitura |
| Vendas e envios | Leitura |

A única escrita é em **Publicação**, que é o que permite subir o anúncio. Mesmo com ela liberada,
o agente **nunca publica sem o seu OK** na conversa.

Aceite os termos, faça a verificação de "não sou um robô" e clique em **Criar**.

### 8. Colar as chaves no `.env`

Na lista de aplicações do DevCenter, clique em **Editar** no app que você criou. Lá estão o
**ID do aplicativo** e a **Secret Key**.

Abra o arquivo `.env` da pasta do projeto no Bloco de Notas ou no editor e cole:

```text
ML_CLIENT_ID=cole_aqui_o_id_do_aplicativo
ML_CLIENT_SECRET=cole_aqui_a_secret_key
```

**Sem espaço** antes nem depois do valor. Salve com **Ctrl+S**.

### 9. Autorizar a conta

No PowerShell, dentro da pasta do projeto:

```powershell
npm.cmd run ml:autorizar
```

> Use `npm.cmd` e não só `npm`: no Windows, o PowerShell costuma bloquear o `npm` com o erro
> "a execução de scripts foi desabilitada neste sistema". O `npm.cmd` é o mesmo comando, sem esse
> bloqueio.

O comando mostra um link. Copie, abra no navegador (logado na conta principal) e clique em
**Autorizar**. Você vai cair numa página de texto do `httpbin.org`.

Copie a **URL inteira** da barra de endereço dessa página e cole na conversa com o agente, pedindo:

```text
Autorizei o Mercado Livre, esta é a URL que apareceu: [cole aqui]
Grave o token e confirme se a conexão está funcionando.
```

O código dentro dessa URL vale uma vez só e expira em poucos minutos. Por isso cole logo depois de
autorizar. Se demorar e der erro, é só rodar o `npm.cmd run ml:autorizar` de novo.

## Parte 3 — conectar a OpenAI (imagens)

Todo o resto do anúncio (pesquisa, título, ficha, descrição) usa a sua assinatura do Claude ou do
ChatGPT. Só as **imagens** usam a API da OpenAI, que é cobrada à parte.

### 10. Colocar crédito

Acesse [platform.openai.com](https://platform.openai.com/). Na tela inicial, em **Credit balance**,
clique em **Add credits**. O mínimo é US$ 5, e **não precisa ser recorrente**: deixe a recarga
automática desligada.

**Quanto rende:** cada imagem custa menos de **US$ 0,08**. Um anúncio completo tem 5 imagens, até
cerca de **US$ 0,40**. Com US$ 5, dá para uns **10 anúncios**, já contando algumas imagens
refeitas. O agente sempre mostra o custo e pede o seu OK antes de gerar.

### 11. Criar a chave

Vá em **API keys** → **Create new secret key**:

| Campo | O que colocar |
|---|---|
| Nome | `criacao-anuncio` |
| Projeto | Default project |
| Permissões | All |

Clique em **Create secret key** e **copie a chave antes de clicar em Done**. Depois ela não
aparece mais. Se perder, é só criar outra.

Cole no `.env`, na linha da OpenAI, sem espaço, e salve com **Ctrl+S**:

```text
OPENAI_API_KEY=cole_aqui_a_chave
```

## Parte 4 — conferir e configurar a operação

### 12. Rodar o diagnóstico

Peça ao agente para conferir se está tudo certo, ou rode você mesmo:

```powershell
npm.cmd run verificar
```

Ele confere Node, `.env`, conexão com o Mercado Livre, chave da OpenAI e `OPERACAO.md`, sem mostrar
nenhum segredo. Tudo com ✓ significa instalação concluída. Se algum item aparecer com ✗, a própria
mensagem diz o que fazer. Se não resolver, mande a saída para o agente.

### 13. Configurar o `OPERACAO.md`

Mande para o agente:

```text
Me ajude a configurar o OPERACAO.md. Quais informações você precisa de mim?
Como você já está conectado com a API do meu Mercado Livre, acesse o máximo de
informações que conseguir para levantar os dados da minha operação.
```

Ele lê o que a API já mostra da sua conta e pergunta só o resto: seu nicho, a ferramenta de pesquisa
que você usa e suas preferências.

**Pronto.** Continue em [Primeiro anúncio](02-PRIMEIRO-ANUNCIO.md).

## Receber atualizações do projeto

Quando houver melhorias no projeto, peça ao agente "rode a atualização do projeto". Se preferir
fazer você mesmo: abra o **Windows PowerShell** (menu Iniciar → pesquise PowerShell), entre na
pasta do projeto e rode:

```powershell
Set-Location $HOME\Documents\criacao-anuncio
npm.cmd run atualizar
```

Suas chaves, o `OPERACAO.md` e a pasta `produtos/` nunca são tocados.

Para a atualização funcionar sempre, **adapte o projeto à sua operação pelo `OPERACAO.md`**. Se
quiser que o agente trabalhe de um jeito diferente, peça: "grave isso como preferência no
OPERACAO.md". Evite editar `CLAUDE.md`, `AGENTS.md` ou os scripts: arquivo do projeto alterado
trava a atualização. Se isso acontecer, o próprio comando explica como resolver.

## Se aparecer algum erro

A primeira ajuda é o próprio agente que está conduzindo o projeto:

1. Peça ao agente "rode o verificar", ou rode você mesmo no PowerShell, dentro da pasta do projeto
   (`Set-Location $HOME\Documents\criacao-anuncio` e depois `npm.cmd run verificar`), e mande a saída.
2. Diga qual comando você executou e, em uma frase, o que estava tentando fazer.
3. Se ajudar, mande um print. Antes, **esconda** Secret Key, chave da OpenAI, tokens, dados de
   compradores, dados da conta e de pagamento.

Nunca cole o conteúdo de `.env`, `.tokens.json` ou `OPERACAO.md` na conversa.

| Erro comum | O que fazer |
|---|---|
| "a execução de scripts foi desabilitada" | use `npm.cmd run ...` no lugar de `npm run ...` |
| `node` ou `git` "não é reconhecido" | instale (passos 1 e 2) e abra o PowerShell de novo |
| `invalid_grant` ao autorizar | o código expirou ou já foi usado: rode `npm.cmd run ml:autorizar` de novo |
| "A autorização do Mercado Livre venceu" | passou muito tempo sem uso: autorize de novo (passo 9) |
| 403 do Mercado Livre | confira se autorizou com a conta **principal** e se as permissões do passo 7 foram salvas |
| OpenAI "insufficient_quota" | acabou o crédito: adicione mais em Billing (passo 10) |
