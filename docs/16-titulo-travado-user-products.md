# Título fica TRAVADO depois de publicado (fluxo User Products)
*Descoberto em 04/09/2026 tentando corrigir os títulos do primeiro piloto.*

## O problema
Anúncio publicado com `family_name` **não deixa mudar o título**. Testado nos dois sentidos:

| Tentativa | Resposta do ML |
|---|---|
| `PUT /items/$ID` com `title` | `You cannot modify the title if the item has a family_name` |
| `PUT /items/$ID` com `family_name` | `The field family name is invalid` |
| `PUT /user-products/$UPI` com `family_name` ou `name` | `resource not found` |
| `GET /user-products/families/$FAMILY_ID` | 404 |
| `GET /families/$FAMILY_ID` | 404 |
| `GET /user-products/$UPI/family` | 500 |

O item aponta para um **user product** (`user_product_id`), que por sua vez pertence a uma
**família** (`family_id`). O título é derivado de `family_name` + atributos. Não achei nenhum
endpoint que edite a família.

## A consequência, que é grande
**O título precisa estar certo na primeira publicação.** Não dá para testar um título, medir e
corrigir por API. Isso muda o peso do checkpoint: revisar título deixa de ser "confere aí" e
passa a ser a decisão mais cara do anúncio.

## O que fazer
1. **Pelo painel do ML.** A interface de vendedor edita a ficha do produto e provavelmente a
   família — é o caminho prático hoje. (Não testei; não tenho acesso de UI.)
2. **Republicar** com o título certo e encerrar o antigo. Custa o histórico do anúncio (visitas,
   perguntas, reputação acumulada). Só vale se o anúncio for novo.

## Regra que passa a valer
No CHECKPOINT do título, tratar como **irreversível**. Gerar as 4 opções, decidir com calma, e
só então publicar.

## Saída encontrada (04/09/2026): recriar o anúncio

Não há rota de edição, mas dá para **clonar o anúncio mudando só a família**.
`npm run ml:recriar -- MLB<id> "Nova Família"` copia do item vivo preço, estoque, tipo de
anúncio, fotos (mesmos ids, sem re-upload), atributos, sale_terms e descrição.

Executado nos dois anúncios do piloto:

| antigo | novo | título resultante |
|---|---|---|
| MLB7566538598 | MLB7590381684 | o primeiro piloto Emborrachada 24kg Impermeabilizante Laje Telha Branco Fosco |
| MLB7487086196 | MLB7590369326 | o primeiro piloto Emborrachada 18kg Impermeabilizante Laje Telha Branco Fosco |

### Duas coisas confirmadas na prática

**1. `title` puro não existe nesta categoria.** Publicar sem `family_name` devolve
`body.required_fields ... [family_name]`. Não há como escapar do fluxo User Products.

**2. O ML acrescenta `COLOR` + `FINISH` no fim do título.** A família tem 60 chars e o título
sai com 73. Regra não documentada e não exposta em `/domains/.../technical_specs` — descoberta
comparando o que foi enviado com o que saiu. **Ao escolher a família, contar com o acréscimo.**

### O que não se copia
`PACKAGE_*`, `PRODUCT_FEATURES`, `PACKAGE_DATA_SOURCE`, `SYI_PYMES_ID` e `ITEM_CONDITION` são
calculados pelo ML (`ignored because it is not modifiable`). O que vale são os `SELLER_PACKAGE_*`,
esses sim copiados. A tag de frete `self_service_in`/`out` também é classificação do ML, não do vendedor.

### Custo
O anúncio novo nasce com histórico zerado — visitas, perguntas e posição de busca. Por isso
recriar só compensa cedo. Continua valendo: **acertar o título na primeira publicação.**
