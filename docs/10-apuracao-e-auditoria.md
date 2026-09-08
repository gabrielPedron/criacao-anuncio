# Apuração e auditoria da API
*Item 1 do must-have. Instalado em 27/08/2026 e apurado contra a conta real.*

## Por que existe
Dois problemas que aparecem em toda integração e não são bug de código:
- **O nome não bate.** A gente diz "é Full?", o ML diz `shipping.logistic_type = "fulfillment"`.
- **O número não se repete.** A mesma chamada devolve valores diferentes por réplica e cache.

## Onde está
- `scripts/apuracao/` — **núcleo**, cópia do skill `apuracao-de-api`. Não sabe que API é. Não mexer sem sincronizar de volta.
- `scripts/ml/glossario.ts` — glossário PT ↔ ML, sinônimos do ML, recursos sugeridos.
- `scripts/ml/apurador.ts` — adaptador: trava de segurança, coleta, catálogo, auditoria.
- `scripts/ml/apurar.ts` — CLI.

## Comandos

```bash
npm run ml:apurar -- --glossario                      # a tabela PT ↔ ML e o que está confirmado
npm run ml:apurar -- /products/MLB51958382            # apura e audita um recurso
npm run ml:apurar -- /products/MLB.../items --termo "é Full?"   # onde mora esse dado?
npm run ml:apurar -- /products/MLB.../items --valor 189.9       # de onde veio esse número?
npm run apuracao:teste                                 # 23 checagens do núcleo
```

## O que a apuração já encontrou

**`tags[]` muda de ordem entre chamadas.** Mesmo conteúdo, posições trocadas:
`results[item_id=...].tags[0]` veio ora `kvs_primary`, ora `has_published_clips`. Código que
fizesse `tags[0] === "kvs_primary"` quebraria de forma intermitente — o pior tipo de bug.
**Sempre tratar `tags` como conjunto (`includes`), nunca por posição.**

Preço, vendedor, frete e logística vieram estáveis nas repetições.

## Glossário: 23 de 26 confirmados

Os 23 apareceram numa apuração real contra uma conta de verdade. Os 3 restantes são
os **endpoints bloqueados** (`/reviews/*`, `/sites/MLB/search`, `/items/$ID` de terceiro) e
ficam `confirmado: false` de propósito — não há caminho para confirmar. Ver [06-mapa-da-api.md](06-mapa-da-api.md).

**Regra:** `confirmado` só vira `true` depois de aparecer numa apuração real. Caminho de
documentação ou de memória não conta.

## Decisões locais que fogem do núcleo canônico

1. **Extensões `.ts` explícitas nos imports.** O núcleo veio com imports sem extensão (funciona
   com bundler). Este projeto é Node puro, que exige a extensão. Corrigido localmente.
   **Isto precisa de decisão do operador:** levar para a cópia canônica pode quebrar o projeto de
   referência (Rota da Conta), que usa bundler e talvez não tenha `allowImportingTsExtensions`.
2. **TypeScript sem build.** Node 24 roda `.ts` nativamente por type stripping, então o núcleo
   entra sem transpilar e sem dependência — respeitando a regra do projeto.
3. **Caminho do Git Bash no Windows.** O MSYS converte `/products/x` em `C:/Program Files/Git/products/x`
   quando o argumento não tem `?`. O CLI detecta e desfaz. Sem isso, o mesmo comando funcionava
   ou falhava dependendo de ter query string — falha intermitente e confusa.
