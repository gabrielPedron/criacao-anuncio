# Prints que preciso — checklist de captura

**Regra geral:** são 21 capturas visuais: 19 telas de **navegador**, uma do agente escolhido (24) e
uma da pasta de imagens (27). As 9 saídas de terminal serão geradas como texto no PDF.

**Salve como** `manual/prints/NN-nome.png`, com o número desta lista. O número é o que amarra o
print ao lugar certo no manual.

**Antes de começar:** deixe a janela do navegador em ~1280px de largura e o zoom em 100%.
Print de janela larga demais fica ilegível no PDF.

---

## ⚠ Os 4 prints que mostram segredo — borre ANTES de me mandar

| # | O que aparece | O que borrar |
|---|---|---|
| 13 | App ID e Secret Key | **a Secret Key inteira** (o App ID pode ficar, não é segredo) |
| 17 | URL do httpbin com o `code=` | **o valor do code** |
| 21 | Chave da OpenAI recém-criada | **a chave inteira**, deixando só o `sk-proj-…` inicial |
| 22 | Faturamento da OpenAI | cartão, se aparecer |

Se preferir, refaça esses passos com uma conta de teste. Mas borrar resolve.

---

## Parte 1 — Preparar a máquina (2 prints)

**01 — Página de download do Node**
Onde: `nodejs.org`
Capturar: a página inicial com o botão de download em destaque.

**02 — Agente de código escolhido**
Onde: página oficial do Claude Code ou do Codex.
Capturar: a página com a opção de instalação escolhida visível. Salvar como
`02-agente-codigo.png`.

---

## Parte 2 — Criar o app no Mercado Livre (10 prints — a parte mais longa)

> Faça tudo logado na sua **conta ML principal**. Conta de colaborador dá erro 403 depois,
> e isso só aparece lá na frente — é o erro mais caro de descobrir tarde.

**03 — Painel de desenvolvedor**
Onde: `developers.mercadolivre.com.br`, logado.
Capturar: a tela inicial, mostrando onde fica **"Minhas aplicações"**.

**04 — Botão de criar**
Capturar: a tela de "Minhas aplicações" com o botão **"Criar aplicação"** visível.

**05 — Nome e Redirect URI**
Capturar: o topo do formulário com **Nome** e **Redirect URI** já preenchidos.
O Redirect URI tem que ser exatamente `https://httpbin.org/get`.

**06 — Fluxos OAuth**
Capturar: a seção de fluxos, com **Authorization Code** e **Refresh Token** MARCADOS
e **Client Credentials** DESMARCADO.
*É o print mais importante da Parte 2:* o Refresh Token vem desmarcado por padrão, e sem ele
o acesso morre em 6 horas e a pessoa refaz tudo na mão toda vez.

**07 — PKCE desativado**
Capturar: a opção de PKCE, desligada. Se ligar, a autorização falha.

**08 — Negócios e escopos**
Capturar: **Mercado Livre** marcado, **VIS** desmarcado, e os escopos `read` e `offline_access`.

**09 — Tabela de permissões**
Capturar: a tela de permissões **inteira**, mostrando *Comunicações* em **Leitura** e
*Publicação* em **Leitura**, e o resto em **Sem acesso**.
Se não couber numa tela, mande dois prints: `09a` e `09b`.

**10 — Tópicos / webhooks**
Capturar: a seção de tópicos com **nenhum** assinado.

**11 — Aplicação criada**
Capturar: a tela de sucesso ou a lista já com o app aparecendo.

**13 — App ID e Secret Key** ⚠ *borre a Secret Key*
Capturar: a tela que mostra os dois valores. É deles que saem `ML_CLIENT_ID` e `ML_CLIENT_SECRET`.

---

## Parte 3 — Autorizar (2 prints)

**16 — Tela de consentimento do ML**
Onde: aparece ao abrir a URL que o `npm run ml:autorizar` imprime.
Capturar: a tela do ML pedindo para permitir que o app acesse a conta, com o botão de autorizar.

**17 — O `code` na barra de endereço** ⚠ *borre o valor do code*
Onde: logo após autorizar, você cai no `httpbin.org/get`.
Capturar: **a barra de endereço**, onde aparece `?code=...`. Pode ser só a barra, recortada.
*Este é o passo que mais trava gente* — ninguém adivinha que tem que copiar da barra do navegador.
Se der, coloque uma seta apontando para o `code=`.

---

## Parte 4 — Chave da OpenAI (4 prints)

**19 — Onde ficam as chaves**
Onde: `platform.openai.com` → **API keys**.
Capturar: a tela com o botão **"Create new secret key"**.

**20 — Criando a chave**
Capturar: o diálogo de criação, antes de confirmar.

**21 — A chave criada** ⚠ *borre a chave*
Capturar: a tela que mostra a chave, deixando visível só o começo `sk-proj-…`.
*Importante para o manual:* a OpenAI mostra a chave **uma vez só**. Quem não copiar, cria outra.

**22 — Crédito / faturamento** ⚠ *borre o cartão se aparecer*
Onde: `platform.openai.com` → **Billing**.
Capturar: a tela de saldo/adicionar crédito.
*Por que este print importa:* muita gente cria a chave, não põe crédito, e recebe erro sem
entender. E aqui entra o aviso de que **isto não é a assinatura do ChatGPT** — são cobranças
separadas, e pagar o ChatGPT não dá acesso à API.

---

## Parte 5 — Resultado (3 prints)

**24 — Agente rodando o processo**
Capturar: a janela do Claude Code ou do Codex no meio de um checkpoint, pedindo sua confirmação.
Serve para mostrar que a pessoa **conversa em português**, não decora comando.
Salvar como `24-agente-checkpoint.png`.

**27 — As 5 imagens geradas**
Capturar: a pasta `produtos/<slug>/imagens/` com as miniaturas visíveis.

Entre esta captura e a 28, grave os passos 27A–27C do manual: escolha humana do catálogo, elevação
das permissões de escrita e revisão final do anúncio. Eles são decisões narradas e não
precisam de print separado.

**28 — O anúncio no ar**
Capturar: a página pública do anúncio no Mercado Livre.
Use um anúncio que você não se importe de mostrar.

---

## Resumo

| Parte | Prints | Esforço |
|---|---|---|
| 1 — Máquina | 01, 02 | 2 min |
| 2 — App no ML | 03–11, 13 | 15 min, é a parte longa |
| 3 — Autorizar | 16, 17 | 5 min |
| 4 — OpenAI | 19–22 | 5 min |
| 5 — Resultado | 24, 27, 28 | 5 min |

**21 capturas visuais.** Os números que faltam (12, 14, 15, 18, 23, 25, 26, 29, 30) são saídas de
terminal — eu gero como texto, você não precisa capturar. Os passos 27A–27C são narrados no vídeo.

Grave o vídeo **fazendo exatamente esta sequência**. Aí o vídeo e o manual contam a mesma história
na mesma ordem, e quem travar no passo 6 acha o trecho do passo 6.
