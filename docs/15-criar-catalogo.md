# Criar produto de catálogo — RESOLVIDO
*Descoberto por tentativa e erro em 31/08/2026. Não estava documentado para nós.*

## Funcionou
Sugestão enviada para o produto do primeiro piloto — status inicial **UNDER_REVIEW**.
Como o operador previu: **é sugestão, não publicação.** O ML cura antes de virar produto.

```bash
npm run ml:sugerir-catalogo -- MLB7566538598              # monta e mostra
npm run ml:sugerir-catalogo -- MLB7566538598 --confirmo   # envia
npm run ml:sugerir-catalogo -- --status MLB7575844910     # acompanha
```

## O contrato, que custou 12 tentativas

```json
POST /catalog_suggestions
{
  "domain_id": "MLB-...",
  "item_id":   "MLB...",        // parte de um anúncio SEU que já existe
  "title":     "...",
  "attributes": [ { "id": "BRAND", "values": [ { "id": "<id da marca>", "name": "<nome da marca>" } ] } ],
  "pictures":  [ { "id": "..." } ]
}
```

**A pegadinha que travou tudo:** os atributos usam o formato **`values: [{id, name}]`**.
Com `value_name` — que é o formato usado em `/items` — o ML responde
`item_modify.attributes.null_values` e **não lê atributo nenhum**. O mesmo campo, dois formatos,
duas rotas do mesmo produto.

**Sequência de erros até chegar lá**, na ordem (cada um ensinou uma coisa):
1. `null_values` — formato de atributo errado
2. `Invalid domain format` — falta `domain_id`
3. `CatalogRequiredMissing` — o domínio exige BRAND, PAINT_TYPE, BASE_TYPE
4. `TitleMinimumLength` — o título precisa de várias características
5. `requiresPictures` — fotos obrigatórias
6. **200 · UNDER_REVIEW**

## Alerta econômico que apareceu no caminho

Numa das tentativas o ML devolveu:

```
shipping.free_shipping.cost_exceeded — Free shipping costs exceeds sale
```

**O custo do frete grátis obrigatório supera a venda** para este produto de 24 kg.
Não impediu a sugestão, mas é um aviso do próprio ML sobre a margem — vale conferir antes de
manter o preço em R$ 549.

## O desfecho: RECUSADA
*Conferido em 07/09/2026 com `npm run ml:sugerir-catalogo -- --status MLB7575844910`.*

A sugestão **MLB7575844910** saiu de `UNDER_REVIEW` para **`REJECTED` em 03/09/2026**, cerca de
**2 dias** depois de enviada. Nenhum produto de catálogo foi gerado, e o ML **não disse o motivo** —
o status vem sem campo de justificativa.

O que isso responde do que estava em aberto: a curadoria leva ~2 dias e **não avisa por
notificação** (só consultando o status é que se sabe). O que continua sem resposta é *por que*
recusou — e sem motivo declarado, tentar de novo é chute. Antes de reenviar, vale conferir se a
conta precisa de loja oficial para **aprovar**, que é a hipótese que sobrou.

## O que ainda não sei
- **Por que a sugestão foi recusada** — o ML não devolve motivo.
- Se dá para corrigir e reenviar, ou se precisa de sugestão nova.
- Se a conta precisa de loja oficial para o produto ser **aprovado** — para **sugerir** não
  precisou.
