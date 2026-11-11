# Camada de inteligência — coleta, evidências e aprendizagem

Esta camada **não publica** nem escolhe categoria, preço, catálogo, imagens ou título por conta própria.
É um apoio ao agente e ao operador. Os dados do negócio continuam apenas em `OPERACAO.md` e
`produtos/` (ignorados pelo git). Os scripts só fazem leitura do ML e gravação de arquivos locais.

## 1. Coleta reproduzível

A coleta tem dois momentos. A **sondagem** roda antes do checkpoint 1, sem top-3 e sem categoria:
lê sugestões e a 1ª página da busca para o agente propor as top-3. A **coleta completa** exige a
categoria principal como `MLB123456` (e, se houver, **Categorias adicionais aprovadas**, IDs separados
por vírgula ou `nenhuma`) e as **Top-3 semânticas confirmadas** preenchidas depois do OK humano.
Texto como “mesma categoria do link” não basta: `ml:coletar` se recusa a inferir IDs. Sem os 2 links
do bloco **Concorrentes** ou sem a pesquisa do operador, as duas rodam e avisam que o resultado fica
pior. Links `/up/MLBU...` não têm ID para `ml:referencia`; só o Chrome lê essas páginas, e o ID do
anúncio sai da própria página, o que permite marcar o dono. Nas tabelas de busca, os anúncios da
conta aparecem como **(seu)**, com a posição orgânica de cada termo.

```bash
npm run ml:coletar -- produtos/<slug>                          # prévia; não consulta o ML
npm run ml:coletar -- produtos/<slug> --sondar "termo" "termo"  # sugestões + busca → propor top-3
npm run ml:coletar -- produtos/<slug> --executar               # coleta completa (API + Chrome)
npm run ml:coletar -- produtos/<slug> --executar --sem-chrome  # só API, para quem não tem Chrome
```

Cada rodada salva JSON com timestamp em `raw/` (um schema por categoria), mais
`raw/resumo-coleta-*.md` com fatos, fonte, cobertura separada por categoria e limites. Se
`dossie.md` não existir, cria somente o esqueleto; não sobrescreve o julgamento existente.
Para o mesmo produto em mais de uma categoria, criar `oferta-<categoria>.json` separadamente,
rodar `ml:conferir` **em cada arquivo** e obter revisão de título/ficha/catálogo individual.
O schema de uma categoria nunca valida outra. `ml:catalogo` aceita `--categoria` repetido para
listar candidatos em buscas separadas; a API pode devolver os mesmos candidatos em ambas, o que
não prova equivalência nem que o filtro isolou a categoria. **O script atual só lista candidatos:
não vincula automaticamente uma oferta a um catálogo.**
Falha de uma fonte principal (schema, referências, busca, páginas) interrompe a rodada, sem tratar
resultado vazio como mercado vazio; tendências e fotos são complementares e viram aviso no resumo.
O resumo e o `ml:conferir` usam só os arquivos da rodada com resumo gravado, nunca o schema solto de
uma rodada que caiu no meio. O Chrome lê poucas páginas por produto (sugestões, busca das top-3 e os
links validados); captcha ou bloqueio encerram a leitura. Não automatizar ferramentas pagas de pesquisa.

## 2. Evidências antes de promessas

O agente cria `produtos/<slug>/evidencias.json` a partir de `coleta/TEMPLATE-evidencias.json`
**só para o que vira promessa na oferta**: dado técnico afirmado na descrição ou na ficha e resposta a
objeção. Não precisa cobrir cada frase. Cada registro vincula a promessa à origem (`operador`, `rotulo`, `api` ou `chrome`), arquivo
relativo à pasta do produto, trecho literal e estado `confirmada`/`pendente`/`contraditoria`.
Para objeção do dossiê, preencher `objecao` com o **número** dela (`5.1`, `5.2`… — a coluna `#` da
tabela §5; sem a coluna, vale a ordem das linhas) e `resposta_descricao` com um trecho **literal** da
descrição. No multicategoria, `oferta` diz qual `oferta-x.json` traz a resposta. Remover esses campos
quando não se aplicarem. `chrome` sozinho
nunca confirma característica do produto próprio: requer confirmação explícita do operador.

`npm run ml:conferir -- produtos/<slug>` confere os caminhos, os trechos de arquivos textuais,
as respostas na descrição e as objeções. Nas rodadas feitas por `ml:coletar`, dossiê com objeção e
sem `evidencias.json` impede a revisão final; sem objeção, vira aviso. Em rodadas antigas também é aviso, sem migrar dados privados
automaticamente. Conferência literal não prova a veracidade: confrontar com rótulo e operador.

## 3. Resultado após publicar

```bash
npm run ml:posicao -- produtos/<slug> MLB123456789 "termo1" "termo2" "termo3" "termo4" "termo5"
# ou, sem buscar novamente, com JSON já salvo por ml:busca:
npm run ml:posicao -- produtos/<slug> MLB123456789 "termo1" "termo2" "termo3" "termo4" "termo5" --arquivo produtos/<slug>/raw/busca.json
npm run ml:saude -- MLB123456789
```

`posicao.csv` guarda data, ID, termo, posição **orgânica na primeira página**, estado e URL. A busca
marca patrocinados; aparecer só como Ad não conta como posição orgânica. Ausência na primeira página
não é “posição zero” e card sem ID não prova ausência. Card de catálogo só traz o ID do anúncio que
está ganhando: se o seu compete naquele catálogo sem ganhar, ele aparece como `nao_identificado` ou
`fora_primeira_pagina`, não como posição. O agente registra em
`produtos/<slug>/decisoes.json` (modelo em `coleta/TEMPLATE-decisoes.json`; no multicategoria, um por
oferta: `oferta-x.json` → `decisoes-x.json`) o que o operador aprovou: imagens, catálogo, título,
revisão final, ID publicado e hipóteses de resultado. As top-3 ficam só na `entrada.md`. Esse arquivo
é **registro**, nunca autorização para escrever no ML; qualquer publicação/edição ainda exige OK
explícito na conversa. Nas revisões, comparar posição e saúde com a hipótese registrada, sem assumir
causalidade ou fazer alteração automática. O histórico não estima vendas nem volume de busca.

## 4. Próxima ação e adaptação ao nicho

`npm run ml:proximo -- produtos/<slug>` aponta a lacuna seguinte pelos arquivos locais, com a
numeração dos checkpoints do CLAUDE.md (1 top-3, 2 imagens, 3 catálogo, 4 revisão final). Depois da
oferta, consulta as decisões **de cada oferta** e não chega à revisão final enquanto houver
`PENDENTE` na `entrada.md` (preço, estoque, embalagem, garantia, GTIN…). JSON quebrado vira
instrução de correção. O dossiê conta como julgado quando sai o marcador do modelo e o aviso que o
`ml:coletar` deixa no esqueleto. É uma **sugestão**, não um motor de aprovação nem um comando
que publica. Antes de agir, leia o arquivo do
nicho indicado na `entrada.md` (`nichos/<nicho>.md`, modelo em `nichos/EXEMPLO.md`) e as preferências
de anúncio do `OPERACAO.md`. Anote observações como hipóteses com fonte, data e escopo na seção
"Aprendido rodando" do nicho; peça ao operador para aprovar as regras após avaliar rodadas; registre
também o que foi descartado. Onde cada um é lido está no [docs/03](03-etapa-B-oferta.md). Regras locais não passam para
AGENTS.md ou scripts e nunca se sobrepõem a dados técnicos verificados, segurança ou checkpoints.

## Como avaliar a evolução

Em um piloto de outro nicho, registrar: tempo de coleta, fontes que falharam, correções de dados,
objeções sem resposta na primeira conferência e posição por termo após publicação. Comparar a ficha
com uma rodada anterior; se uma etapa só gerar ruído, simplificá-la em vez de adicionar mais agentes.
