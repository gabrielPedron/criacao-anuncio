# Etapa B — oferta, imagens e publicação

Esta etapa recebe o dossiê aprovado e a foto base. Ela produz a oferta, os prompts, as imagens e o
arquivo que será validado pelo Mercado Livre.

## Entradas

- `produtos/<slug>/dossie.md`;
- foto base nítida em `produtos/<slug>/base/`;
- estratégia escolhida pelo operador: catálogo, orgânico ou ambos;
- dados físicos verdadeiros do produto.

Preço não é derivado do dossiê. A mediana do mercado é apenas referência; o operador informa o
preço a partir dos próprios custos.

## 1. Relatório de oferta

Consolidar a dor de quem compra, objeções reais, acertos da concorrência e lacunas. Fechar com três
a seis ângulos que guiarão título, ficha, descrição e imagens.

## 2. Prompts de imagem

Criar `produtos/<slug>/prompts-imagens.json` a partir do dossiê:

1. capa em fundo branco, sem texto;
2. qualidade ou diferencial;
3. principais dúvidas;
4. benefícios;
5. prova social, somente se houver prova real.

## 3. Título

- **Catálogo:** usar marca, modelo e especificações reais, sem empilhar palavras-chave.
- **Orgânico:** aproximar-se de 60 caracteres usando as semânticas confirmadas.
- **Sem pesquisa própria:** usar termos dos concorrentes e tendências do ML, avisando que o sinal é
  mais fraco.

O `family_name` não pode passar de 60 caracteres. Depois da publicação no fluxo User Products, o
título fica irreversível pela API.

## 4. Ficha e modelo

Preencher todos os atributos confirmados da categoria e marcar o que depende do operador. O campo
modelo pode receber palavras-chave apenas no anúncio orgânico.

## 5. Descrição

Escrever em texto corrido, sem bullets, emoji ou método de envio.

## 6. Dados obrigatórios do operador

Antes de montar a oferta final, perguntar sempre:

| Dado | Regra |
|---|---|
| Preço | informado pelo operador; nunca calcular margem |
| Estoque | quantidade real disponível |
| Tipo de anúncio | `gold_special` ou `gold_pro` |
| Embalagem | dimensões e peso bruto reais |

Categoria também é decisão do operador.

## 7. Gerar e revisar imagens

Gerar com:

```bash
npm run midia:gerar -- produtos/<slug>
```

Cada nova tentativa parte da foto base e recebe versão própria. Para refazer uma imagem:

```bash
npm run midia:gerar -- produtos/<slug> --foto 3 --ajuste "o que precisa corrigir"
```

> **Checkpoint 2:** operador revisa e aprova as imagens.

## 8. Catálogo

Executar:

```bash
npm run ml:catalogo -- "produto com marca e tamanho" --categoria MLBxxxxx
```

Entregar todos os links dos candidatos. O operador decide se algum é exatamente o mesmo produto,
embalagem e versão.

> **Checkpoint 3:** operador escolhe o catálogo ou confirma que nenhum candidato serve.

## 9. Validar e publicar

Primeiro montar a oferta sem enviar nada:

```bash
npm run ml:publicar -- produtos/<slug>
```

O dry-run no ML não cria item:

```bash
npm run ml:publicar -- produtos/<slug> --validar
```

Fotos locais são escrita. Para validar com as fotos reais, `--confirmo` é necessário e o comando
deve ser explicado ao operador antes de executar.

> **Checkpoint 4:** operador revisa título, preço, estoque, tipo, embalagem, ficha, imagens e
> descrição e autoriza explicitamente a publicação.

Somente após esse OK:

```bash
npm run ml:publicar -- produtos/<slug> --validar --publicar --confirmo
```

As duas flags finais são obrigatórias. Nunca contornar a trava em `scripts/ml/api.js`.
