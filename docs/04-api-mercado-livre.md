# Conectar a API do Mercado Livre ao Claude — Passo a Passo
### Marco 1: provar a conexão (puxar a ficha técnica de uma categoria)

> **Nota:** este documento é a **explicação** de como o OAuth do ML funciona (útil pra entender e pra depurar). O **passo a passo operacional de agora**, já com os comandos do projeto, está em [05-conectar-api-agora.md](05-conectar-api-agora.md) — os `curl` daqui viraram scripts em `scripts/ml/`.

## Leia antes (o que "conectar" significa de verdade)
Não é um botão nem um plugin. É: você cria um **aplicativo de desenvolvedor** no ML, pega as credenciais, e usa elas pra chamar a API.
- Quem roda as chamadas é o **Claude Code** (ou o terminal) **na sua máquina** — não esta conversa (o ambiente do chat não alcança a API do ML).
- **Suas chaves ficam só com você.** Nunca cole `client_secret` nem token no chat. Eles moram num arquivo local que o Claude Code lê.
- **Meta deste guia:** fazer **uma leitura funcionar** — puxar os atributos de uma categoria. Isso prova a conexão. Depois viramos isso num script que alimenta a Etapa B.

---

## Parte 1 — Criar o aplicativo (pega App ID + Secret)
1. Acesse **developers.mercadolivre.com.br** → entre com sua **conta ML principal** (não colaborador) → área de aplicações ("Minhas aplicações" / "Criar aplicação").
2. Crie um app e anote:
   - **App ID** → é o `client_id`
   - **Secret Key** → é o `client_secret` (trate como senha)
3. Em **Redirect URI**, coloque uma URL que você controla. *Truque de iniciante:* use `https://httpbin.org/get` — ela mostra na tela o que o ML mandar, então você lê o código fácil. Tem que ser **idêntica** à que você usar depois.
4. **Não ative PKCE** agora (deixa o fluxo mais simples). Para leitura, escopo `read` basta.

## Parte 2 — Pegar seu primeiro token
1. Monte esta URL (troque `SEU_APP_ID`) e abra no navegador, logado na **conta principal**:
   ```
   https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=SEU_APP_ID&redirect_uri=https://httpbin.org/get
   ```
2. Autorize o app. O ML te redireciona pro httpbin, e na tela aparece um `code` (procure `"code": "..."` no JSON). **Copie esse código — ele dura poucos minutos e é de uso único.**
3. Troque o código por um token (no terminal, ou peça pro Claude Code rodar), preenchendo os 3 valores:
   ```
   curl -X POST 'https://api.mercadolibre.com/oauth/token' \
     -H 'accept: application/json' \
     -H 'content-type: application/x-www-form-urlencoded' \
     -d 'grant_type=authorization_code' \
     -d 'client_id=SEU_APP_ID' \
     -d 'client_secret=SEU_SECRET' \
     -d 'code=O_CODIGO_QUE_COPIOU' \
     -d 'redirect_uri=https://httpbin.org/get'
   ```
   A resposta traz **`access_token`** (vale ~6h) e **`refresh_token`** (guarde — renova sem precisar logar de novo).

## Parte 3 — Primeira leitura
1. **Testa se o token funciona** (chamada mais simples, devolve seus dados):
   ```
   curl -H 'Authorization: Bearer SEU_ACCESS_TOKEN' https://api.mercadolibre.com/users/me
   ```
   Se voltar seus dados, a conexão está de pé.
2. **Ache o category_id do seu produto** (a partir do nome):
   ```
   curl -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
     'https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=<termo+do+seu+produto>'
   ```
   (devolve a categoria sugerida, com o `category_id`).
3. **Puxe os atributos da categoria** (o objetivo):
   ```
   curl -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
     https://api.mercadolibre.com/categories/CATEGORY_ID/attributes
   ```
   Isso devolve **todos os atributos da categoria** — nome, se é obrigatório, valores aceitos. É a lista real que a Etapa B usa pra montar a ficha técnica exata (e pra saber o que a concorrência deixou vazio contra a lista verdadeira do ML).

## Renovar o token (quando expirar, ~6h)
```
curl -X POST 'https://api.mercadolibre.com/oauth/token' \
  -H 'content-type: application/x-www-form-urlencoded' \
  -d 'grant_type=refresh_token' \
  -d 'client_id=SEU_APP_ID' \
  -d 'client_secret=SEU_SECRET' \
  -d 'refresh_token=SEU_REFRESH_TOKEN'
```
Guarde o **novo** refresh_token que vier (o antigo vira uso único). O refresh_token em si expira em ~6 meses ou se você revogar o acesso.

---

## Onde o Claude Code entra (próximo passo, depois do Marco 1)
Assim que o Marco 1 funcionar, o Claude Code transforma isso num script pequeno que:
- guarda as credenciais num arquivo local (`.env`) — nunca no chat;
- **renova o token sozinho** quando expira;
- recebe um `category_id` (ou o nome do produto) e devolve o **mapa de atributos** pronto pra colar na Etapa B.

## Erros comuns
- `invalid_grant`: o code/refresh expirou ou já foi usado → refaça a autorização.
- **redirect_uri não bate:** tem que ser idêntica à registrada, sem nada variável.
- `403 / forbidden`: logou com colaborador em vez da conta principal, ou usou token de outro usuário.

---

## Também útil: descoberta de concorrentes pela API
Depois do Marco 1, testar a busca de itens (mesma autenticação):
```
curl -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
  'https://api.mercadolibre.com/sites/MLB/search?q=<termo+do+seu+produto>&limit=20'
```
Se vier o JSON dos anúncios, a **descoberta de concorrentes** da Etapa A passa a ser API (mais confiável que raspar a página de busca, que trava sob automação). *Obs.: o acesso a esse endpoint pode estar restrito — por isso é a primeira coisa a testar.*
