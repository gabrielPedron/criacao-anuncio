# Conectar a API — o que falta (checklist)

> Este roteiro já foi percorrido de ponta a ponta: app criado, `.env` preenchido, autorização concluída, `.tokens.json` gravado e `ml:teste` passando. A renovação do token é automática daqui pra frente.
> Este documento fica como registro do que foi feito e receita para refazer (trocar de conta, reautorizar ao ativar `write`).
> **O que a API libera de verdade está em [06-mapa-da-api.md](06-mapa-da-api.md)** — leia esse antes de escrever chamada nova.


## Passo 1 — Criar o aplicativo de desenvolvedor (você)

1. Abra **developers.mercadolivre.com.br** logado na sua **conta ML principal** — não conta de colaborador (colaborador dá 403 depois).
2. **Minhas aplicações → Criar aplicação.**
3. Preencha:
   - **Nome:** qualquer coisa (ex.: `meus-anuncios`)
   - **Redirect URI:** `https://httpbin.org/get`
     *Tem que ser idêntica a essa string. Ela só serve pra te mostrar o code na tela — é o caminho mais simples pra quem não tem servidor.*
   - **Fluxos OAuth:** marque **Authorization Code** e **Refresh Token**. Desmarque **Client Credentials**.
     > O **Refresh Token** vem desmarcado por padrão e é o mais importante: sem ele o ML não emite `refresh_token`, o access_token morre em 6h e você refaz a autorização na mão toda vez. É o que faz `auth.js` renovar sozinho.
   - **PKCE:** deixe **desativado** — os scripts não implementam `code_verifier`; se marcar, a autorização falha.
   - **Negócios:** marque **Mercado Livre** (itens, categorias, perguntas, avaliações). Deixe **VIS** desmarcado — é veículos/imóveis/serviços.
   - **Escopos:** `read` e `offline_access`. Deixe `write` **desmarcado** — só na Fase 4, quando for publicar. Ativar depois custa uma reautorização (`ml:url` → `ml:token`), dois minutos.
4. **Permissões** (a tela pede uma opção para cada — o padrão é **Sem acesso**):

   | Permissão | Agora | Na Fase 4 (publicar) |
   |---|---|---|
   | Usuários | *Leitura e escrita* (vem travado pelo ML) | igual |
   | Comunicações pré e pós-vendas | **Leitura** | Leitura |
   | Publicação e sincronização | **Leitura** | **Leitura e escrita** |
   | Publicidade de um produto | Sem acesso | Sem acesso |
   | Faturamento de uma venda | Sem acesso | Sem acesso |
   | Métricas do negócio | Sem acesso | Sem acesso |
   | Promoções, cupons e descontos | Sem acesso | Sem acesso |
   | Venda e envios de um produto | Sem acesso | Sem acesso |

   *Comunicações* em **Leitura** porque as **perguntas dos anúncios** entram por aí — é o dado que alimenta as objeções do dossiê. Nunca "leitura e escrita": escrita ali significa responder mensagem de cliente em nome da loja.
   *Publicação* em **Leitura** cobre ler item e ficha dos concorrentes; a escrita é a Fase 4 e exige reautorização.
   Qualquer permissão nova que apareça na tela e não seja sobre **item, categoria ou pergunta**: **Sem acesso**.
5. **Tópicos (Orders, Messages, etc.):** **não assine nenhum.** Tópico é webhook — o ML faz POST numa URL de callback sua a cada evento. Não temos servidor ouvindo, e os eventos são de operação de venda, não de criação de anúncio. Deixe todos fechados.
4. Anote os dois valores que aparecem:
   - **App ID** → é o `client_id`
   - **Secret Key** → é o `client_secret` (trate como senha)

## Passo 2 — Colocar as credenciais no `.env` (você, no editor)

Na raiz do projeto, copie `.env.example` para `.env` e preencha:

```
ML_CLIENT_ID=1234567890123456
ML_CLIENT_SECRET=abcdEFGH...
ML_REDIRECT_URI=https://httpbin.org/get
ML_SITE=MLB
```

> **Não cole essas chaves na conversa comigo.** Eu leio o arquivo direto; não preciso ver o valor. O `.env` está no `.gitignore`.

## Passo 3 — Autorizar e pegar o primeiro token

```bash
npm run ml:url
```

Isso imprime a URL de autorização. Abra no navegador **logado na conta principal**, autorize, e o ML te joga no httpbin mostrando um JSON. Procure `"code": "TG-..."` e copie.

O code **dura poucos minutos e é de uso único** — rode o próximo comando logo em seguida:

```bash
npm run ml:token -- COLE_O_CODE_AQUI
```

Isso grava `.tokens.json` (também fora do git). **Daqui pra frente a renovação é automática** — o access_token vale ~6h e o script troca sozinho pelo refresh_token quando falta menos de 10 min.

## Passo 4 — Provar que está de pé

```bash
npm run ml:teste
```

Deve imprimir seu nickname e testar dois endpoints. A saída te diz o que está liberado:

- **`/users/me` ✓** → conexão de pé. É o Marco 1.
- **`/sites/MLB/search`** → se vier ✓, a descoberta de concorrentes é por API. Se vier ✗ 403, é esperado — o ML restringiu esse endpoint pra vários apps, e a descoberta volta pro Chrome com a skill `leitor-de-sites`.
- **`domain_discovery`** → se vier ✗, você passa o `MLBxxxxx` da categoria na mão.

## Depois que funcionar

```bash
npm run ml:categoria -- "<nome do seu produto>"
```

Devolve o **schema real de atributos da categoria**: cada campo, se é obrigatório, quais valores o ML aceita. É a lista verdadeira contra a qual a Etapa B monta a ficha técnica — e contra a qual dá pra medir o que a concorrência deixou vazio.

```bash
npm run ml:anuncio -- MLB1234567890
```

Dossiê de um concorrente direto da API: ficha preenchida, descrição, **perguntas e avaliações**. Esse último é o dado mais valioso da Etapa A e vinha sendo colhido na mão.

## Se der erro

| Erro | Causa | Saída |
|---|---|---|
| `invalid_grant` | code ou refresh expirou / já foi usado | refazer o `ml:url` → `ml:token` |
| `redirect_uri não bate` | diferente da registrada | usar exatamente `https://httpbin.org/get` nos dois lugares |
| `403 forbidden` | logou como colaborador, ou endpoint restrito | conferir conta principal; se for o `search`, é restrição do ML mesmo |
| `Falta o arquivo .env` | passo 2 não feito | copiar `.env.example` |

## O que ainda NÃO está pronto (de propósito)

- **Publicação via API (escrita).** Não foi escrita ainda: o ML está migrando o fluxo pra *User Products* e construir agora garante retrabalho. Publicação manual já funciona. `scripts/ml/api.js` **bloqueia** POST/PUT/DELETE até isso ser decidido.
- **Nubimetrics.** Não tem API. Continua no Chrome — snippets em [coleta/snippets-chrome.md](coleta/snippets-chrome.md).
