# A autorização do ML — o que é, e por que ela quase nunca aparece

## O que é

É o **OAuth**: o momento em que você, dono da conta, autoriza o app `criacao-anuncio` a agir em seu nome. Não dá pra automatizar essa parte — ela **é** a fronteira de segurança. Automatizá-la significaria eu ter a senha da sua conta ML, o que eu não faço.

Em troca do seu "autorizo", o ML entrega dois tokens:

| Token | Vale | Para quê |
|---|---|---|
| `access_token` | ~6 horas | Cada chamada à API |
| `refresh_token` | ~6 meses | **Renovar o access_token sozinho, sem humano** |

## Já está automatizado

Você **não** autoriza a cada uso. O `refresh_token` faz isso sozinho.

Isso já rodou na sua frente: durante uma coleta, a saída do primeiro comando trouxe `[ml] access_token renovado.` — o token de 6h tinha vencido desde o teste anterior e o `auth.js` trocou por um novo sem perguntar nada. Aquilo era a automação funcionando.

`scripts/ml/auth.js` renova quando falta menos de 10 minutos para vencer, e usa um **lock** para dois processos não gastarem o mesmo `refresh_token` ao mesmo tempo (o ML invalida o antigo a cada uso — rotação de token).

## As únicas vezes que precisa de você

1. **A primeira vez.** Feita em 25/08/2026.
2. **Quando o escopo muda.** É o caso agora: a permissão foi para *Leitura e escrita* no painel, mas **o escopo é gravado dentro do token no momento da autorização** — o token atual ainda é só leitura. Uma passada manual e nunca mais, até o escopo mudar de novo.
3. **A cada ~6 meses**, quando o `refresh_token` expira. Duas vezes por ano.
4. **Se o `.tokens.json` for perdido** ou o acesso revogado no painel do ML.

Fora isso, roda sozinho — inclusive para publicar.

## Como ficou mais fácil

`npm run ml:autorizar` faz tudo em um comando. Ele aceita a **URL inteira colada** da barra de endereço, não só o code:

```bash
npm run ml:autorizar -- "https://httpbin.org/get?code=TG-..."
```

### Tirando o copia-e-cola de vez (opcional)

Se registrar `http://localhost:8137/callback` como redirect no painel do ML e trocar no `.env`, o comando **sobe um servidor local, captura o code sozinho e grava o token** — você só clica em "Autorizar" no navegador e volta pro terminal.

1. No painel do ML: **Adicionar URI de redirect** → `http://localhost:8137/callback` (mantenha a do httpbin como reserva)
2. No `.env`: `ML_REDIRECT_URI=http://localhost:8137/callback`
3. `npm run ml:autorizar`

> **Não testado:** alguns provedores OAuth exigem HTTPS na redirect URI e recusam `http://localhost`. Se o ML recusar, volte o `.env` para o httpbin — o modo manual continua funcionando. Vale o teste porque, se aceitar, as reautorizações semestrais viram um clique.

## O que NÃO dá para automatizar, e por quê

O consentimento inicial. Ele existe justamente para que nenhum programa — eu incluído — consiga agir na sua conta sem que você tenha dito sim uma vez, de forma consciente, logado. Se isso fosse automatizável por mim, qualquer código com acesso à sua máquina também conseguiria.

O que dá para automatizar é **tudo depois**: a renovação, que já está feita.
