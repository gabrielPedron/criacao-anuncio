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

1. capa sem texto, selo nem logo novo: semiambientada (produto grande em destaque, fundo com
   contexto e quebra de cor) ou fundo quase branco para produto básico;
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

O ML acrescenta `COLOR` e `FINISH` no fim do título (docs/16). Não gastar caractere da família com
cor ou acabamento que já estão na ficha, e mostrar ao operador o título final com o acréscimo.
Entregar três opções, cada uma com o ângulo de busca que ela cobre.

## 4. Ficha e modelo

Preencher todos os atributos confirmados da categoria e marcar o que depende do operador. O campo
modelo pode receber palavras-chave apenas no anúncio orgânico.

## 5. Descrição

Escrever em texto corrido, sem bullets, emoji ou método de envio.

Cada objeção do dossiê (§5) precisa de um trecho da descrição que a responda. Se o dado não existe
(número de demãos, lado de aplicar, como remover…), perguntar ao operador **antes** da revisão
final — editar depois de publicado pode mexer no ranqueamento.

## 6. Dados obrigatórios do operador

Antes de montar a oferta final, perguntar sempre:

| Dado | Regra |
|---|---|
| Preço | informado pelo operador; nunca calcular margem |
| Estoque | quantidade real disponível |
| Tipo de anúncio | `gold_special` ou `gold_pro` |
| Embalagem | dimensões e peso bruto reais |
| Garantia | tipo (`fabrica`, `vendedor`, `sem`) e prazo — vai em `"garantia"` no `oferta.json` |
| Código de barras | GTIN no atributo, ou o motivo em `"sem_gtin_motivo"` |

Categoria também é decisão do operador.

## 7. Gerar e revisar imagens

Gerar com:

```bash
npm run midia:gerar -- produtos/<slug>             # mostra o custo e para
npm run midia:gerar -- produtos/<slug> --confirmo  # gera, depois do OK do operador
```

Cada nova tentativa parte da foto base e recebe versão própria. Para refazer uma imagem:

```bash
npm run midia:gerar -- produtos/<slug> --foto 3 --ajuste "o que precisa corrigir" --confirmo
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

Antes da revisão final, a conferência (só lê arquivos locais):

```bash
npm run ml:conferir -- produtos/<slug>
```

Ela mostra o título como vai aparecer (com o acréscimo de cor e acabamento), a ficha comparada com a
categoria e com os concorrentes, GTIN, garantia, as objeções do dossiê e o que ainda está PENDENTE
no `entrada.md`. Com ✗, não vai para a revisão.

> **Checkpoint 4:** operador revisa título, preço, estoque, tipo, embalagem, garantia, ficha,
> imagens e descrição e autoriza explicitamente a publicação.

Somente após esse OK:

```bash
npm run ml:publicar -- produtos/<slug> --validar --publicar --confirmo
```

As duas flags finais são obrigatórias. Nunca contornar a trava em `scripts/ml/api.js`.

## 10. Depois de publicar

```bash
npm run ml:saude -- MLB<id>          # nota de qualidade do próprio ML e o que ele aponta
```

O que o ML sugere é sugestão: preço, clássico ou premium e vídeo são decisão do operador.

Para completar algo depois de publicado (garantia, atributo, descrição), nunca script avulso:

```bash
npm run ml:editar -- MLB<id> --garantia "fabrica:3 meses"          # mostra o antes e o depois
npm run ml:editar -- MLB<id> --atributo "ID=valor" --confirmo      # grava e confere
```

O `ml:editar` só grava com `--confirmo` (escrita, com OK do operador) e confere que título, status,
preço e o resto da ficha não mudaram. Título não se edita: é irreversível (docs/16).
