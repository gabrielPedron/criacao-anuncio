# Primeiro anúncio — como conversar com o agente

Este guia começa depois da instalação (`npm.cmd run verificar` com tudo ✓). Você não precisa decorar
comandos: abre o projeto no Claude Code ou no Codex, manda o que tem do produto e responde às
perguntas. O agente faz o processo de ponta a ponta, da pesquisa dos concorrentes até subir o
anúncio, e só publica depois do seu OK.

## O que separar antes de começar

| O que | Por quê |
|---|---|
| **Foto do produto com fundo branco** | é a base de todas as imagens; o agente sempre parte dela |
| **2 ou mais links de concorrentes** que você confirmou serem o mesmo produto | a análise se baseia neles; nome parecido pode ser outra versão ou embalagem |
| **Principais semânticas** (top buscas do mês) do Nubimetrics, Virtual Seller, Mercado Livre Tendências ou outra ferramenta | a API do ML não mostra volume de busca; sem isso o título sai mais fraco |
| **Dados técnicos que a IA não descobre** | rendimento (m² da tinta), voltagem, amperagem, tamanho, composição… |
| **Categoria** e estratégia (catálogo, orgânico ou ambos) | a escolha é sua |
| **Preço, estoque, Clássico ou Premium** | decisão do seu negócio; a IA nunca calcula nem copia |
| **Medidas e peso bruto da embalagem pronta para envio** | obrigatório no ML; a IA não adivinha pela foto |

Não precisa de texto grande nem descrição pronta, só as informações principais. O que faltar, o
agente pergunta. Ele registra tudo numa ficha em `produtos/<produto>/entrada.md`, com `PENDENTE` em
cada campo que ainda não foi informado.

Sem links de concorrentes ou sem semântica o agente consegue continuar, mas avisa que o resultado
fica pior. Isso foi medido: a pesquisa do operador rende mais que a descoberta automática sozinha.

## 1 — Começar o produto

Abra uma **conversa nova** para cada produto, anexe a foto e mande algo assim:

```text
Quero criar um anúncio para [produto]. Categoria: [nome ou MLB...]. Estratégia: [catálogo/orgânico/ambos].

Concorrentes que confirmei como o mesmo produto:
[link 1]
[link 2]

Minhas semânticas / top buscas do mês:
[termos e números]

Dados do produto:
[ex.: rendimento 18 m², embalagem 24 kg, cor cinza]

Preço [R$], estoque [quantidade], [clássico/premium].
Embalagem: [altura] x [largura] x [comprimento] cm, [peso bruto] kg.

Leia as instruções do projeto e conduza o processo. Não publique nada sem meu OK.
```

O que você ainda não tiver, deixe de fora: o agente pede na hora certa.

## 2 — Confirmar as semânticas

O agente cruza a sua pesquisa com o que encontra no Mercado Livre e propõe **as 3 semânticas
principais**. Confirme ou corrija antes de ele aprofundar a pesquisa.

## 3 — Revisar a oferta e o título

Depois da pesquisa, o agente mostra o dossiê dos concorrentes, o diferencial da oferta e **opções de
título**. Não gostou? Peça mais opções.

> **Escolha o título com calma.** Depois de publicado, o Mercado Livre não deixa alterar o título
> pela integração. Só pelo painel ou republicando.

Dados que não foram encontrados aparecem como pendentes, nunca inventados.

## 4 — Revisar as imagens

Antes de gerar, o agente mostra **quanto vai custar** (até cerca de US$ 0,40 pelas 5 imagens) e espera
o seu OK. As imagens ficam em `produtos/<produto>/imagens/`.

Confira produto, cor, rótulo, textos e fidelidade à foto original. Se uma imagem estiver ruim, diga
qual e o que está errado: o agente refaz **só aquela**, a partir da foto original, sem mexer nas
aprovadas. Cada refação custa menos de US$ 0,08.

Não aprove imagem com informação inventada, texto errado ou produto diferente do real.

## 5 — Escolher o catálogo

Se a estratégia envolver catálogo, o agente lista os produtos de catálogo candidatos **com links**.
Abra e diga se algum é exatamente o mesmo produto, na mesma embalagem e versão. Essa decisão é
sempre sua.

## 6 — Revisar e dar o OK

O agente monta a ficha técnica (preenchida com o máximo de informação), a descrição e o anúncio
completo, e mostra tudo para você revisar. Confira preço, estoque, modalidade, medidas, título e
imagens.

Só depois de você dizer claramente que autoriza, ele sobe o anúncio.

## 7 — Conferir no ar

Abra o link que o agente devolve e confira título, preço, fotos, ficha, descrição e modalidade. Peça
também um resumo final: link, código do anúncio e pendências manuais, se houver.

Para o próximo produto, abra uma conversa nova e repita a partir do passo 1.

## Se aparecer algum erro

Peça ao agente "rode o verificar" (ou rode `npm.cmd run verificar` no PowerShell, dentro da pasta
`Documents\criacao-anuncio`), mande a saída e explique em uma frase o que estava fazendo. Se mandar print, esconda antes chaves, tokens, dados de compradores, da conta e de
pagamento. Nunca cole o conteúdo de `.env`, `.tokens.json` ou `OPERACAO.md` na conversa.
