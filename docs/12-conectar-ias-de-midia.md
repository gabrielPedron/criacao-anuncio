# Conectar Google e OpenAI — passo a passo
*Fase 3. Só você pode fazer estes passos: envolvem login e cartão.*

## A confusão que pega todo mundo primeiro

**Assinatura não é API.** São produtos diferentes, com cobranças diferentes:

| Você usa | Site | Isso dá acesso à API? |
|---|---|---|
| ChatGPT Plus | chatgpt.com | ❌ **Não** |
| Gemini pago no app | gemini.google.com | ❌ **Não** |
| API da OpenAI | **platform**.openai.com | ✅ sim, cobrança separada |
| API do Google | **aistudio**.google.com | ✅ sim, cobrança separada |

Por isso **não é problema** você não pagar ChatGPT: pagar não ajudaria. O que vale, em qualquer
caso, é abrir a conta de API e pôr crédito.

---

## PARTE 1 — Google (imagem e vídeo). Comece por aqui.

Você já tem conta Google, e o Google faz **imagem e vídeo** — uma chave só resolve as duas
pontas da Fase 3.

1. Acesse **aistudio.google.com** e entre com sua conta Google.
2. Procure **"Get API key"** (ou "Chave de API") — costuma ficar no menu lateral ou no canto superior.
3. Clique em **criar chave de API**. Se pedir para escolher/criar um projeto do Google Cloud,
   pode criar um novo — nome não importa.
4. **Copie a chave na hora.** Ela aparece uma vez só.
5. Abra o arquivo `.env` na raiz do projeto e cole:
   ```
   GOOGLE_API_KEY=cole_aqui
   ```
6. **Ative a cobrança.** O vídeo (Veo) não roda no plano gratuito. No AI Studio procure
   "Billing"/"Faturamento" e vincule um cartão ao projeto.

> Imagem costuma ter cota gratuita; **vídeo não**. Se só quiser testar imagem primeiro, dá para
> pular o passo 6 e voltar nele quando for gerar vídeo.

## PARTE 2 — OpenAI (imagem). Só se quiser comparar.

1. Acesse **platform.openai.com** — repare: **platform**, não chatgpt.com. É outro site.
2. Entre (ou crie conta). Serve o mesmo login do ChatGPT, mas a cobrança é separada.
3. Vá em **Billing** / "Faturamento" → adicione crédito. É **pré-pago**: você põe US$ 5 ou 10 e
   ele vai descontando. Sem crédito, a chave existe mas toda chamada falha.
4. Vá em **API keys** → **Create new secret key**.
5. **Copie na hora** — ela aparece uma vez só. Se perder, apague e crie outra.
6. Cole no `.env`:
   ```
   OPENAI_API_KEY=cole_aqui
   ```

---

## PARTE 3 — Conferir (sem gastar nada)

```bash
npm run midia:chaves
```

Ele só **lista os modelos** disponíveis em cada provedor — chamada gratuita. Não gera imagem
nem vídeo, não consome crédito. Serve para saber se a chave está válida e quais modelos de
imagem e vídeo a sua conta enxerga.

Saída esperada: `✓ N modelos`, com as linhas de imagem e vídeo preenchidas.

Se der erro, o texto do erro já diz o motivo — normalmente chave errada, cobrança não ativada,
ou projeto sem a API habilitada.

---

## Regras de segurança

- **Nunca cole as chaves na conversa.** Elas vão no `.env`, que está no `.gitignore`. Eu leio
  o arquivo direto; não preciso ver o valor.
- **Chave de API é senha com cartão atrás.** Quem tem a chave gasta o seu crédito.
- Se desconfiar que vazou: apague no painel do provedor e crie outra. Leva um minuto.
- Ponha **limite de gasto** no painel dos dois (a OpenAI chama "usage limits"). É a rede de
  proteção contra um loop com bug.

## Depois que as chaves passarem

Eu implemento a Fase 3 em cima dos [prompts que você já usa](../prompts/imagens-set-anuncio.md):
gera a partir da foto base, eu confiro cada imagem com visão, corrijo e refaço até 3 vezes, e
só então sobe para você aprovar. Reprovar uma foto não mexe nas outras — cada chamada parte da
foto base original.
