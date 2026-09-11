# Conectar a API do Mercado Livre

O guia público, com as telas numeradas, está em
[manual/01-INSTALACAO.md](../manual/01-INSTALACAO.md). Este documento registra apenas o caminho
técnico atual.

## Configuração do aplicativo

- usar a conta principal do Mercado Livre;
- Redirect URI: `https://httpbin.org/get`;
- fluxos: Authorization Code e Refresh Token;
- PKCE desativado;
- negócio Mercado Livre, sem VIS;
- escopos iniciais `read` e `offline_access`;
- Comunicações em leitura, Publicação em leitura e demais áreas configuráveis sem acesso;
- nenhum tópico ou webhook.

Para publicar, habilitar o escopo OAuth `write`, liberar escrita em Publicação e reautorizar. Essas
permissões só entram no token depois de uma nova autorização.

## Arquivos locais

```powershell
Copy-Item .env.example .env
Copy-Item OPERACAO.example.md OPERACAO.md
```

Preencher `.env` sem exibir os valores em chat ou terminal. `.env`, `.tokens.json` e `OPERACAO.md`
ficam fora do git.

## Autorizar e testar

```powershell
npm run ml:autorizar
npm run ml:autorizar -- "URL_INTEIRA_COM_CODE"
npm run ml:teste
```

O primeiro comando imprime a URL de consentimento. Depois de autorizar no navegador, o segundo
aceita a URL inteira do httpbin, grava `.tokens.json` e o token passa a renovar automaticamente.

`/users/me` confirma a conexão. Um 403 em `/sites/MLB/search` é uma restrição conhecida e não
invalida o token.

## Erros comuns

| Erro | Causa provável | Correção |
|---|---|---|
| `invalid_grant` | code expirado ou reutilizado | gerar nova URL e autorizar novamente |
| redirect diferente | painel e `.env` não coincidem | usar exatamente a URI registrada |
| 403 geral | conta colaboradora ou permissão ausente | entrar na conta principal e rever o app |
| falta `.env` | configuração local não criada | copiar `.env.example` |

A publicação está implementada e protegida por confirmação dupla. O fluxo completo está em
[docs/03-etapa-B-oferta.md](03-etapa-B-oferta.md).
