# Primeiro anúncio — como conversar com o agente

Este guia cobre as telas 24–30. Você não precisa decorar os comandos: abra o Claude Code ou o Codex
local na pasta do projeto, explique o produto e responda aos checkpoints. O agente lê as regras e
usa os scripts.

## O que separar antes de abrir a conversa

- nome e categoria do produto, escolhida por você;
- estratégia: catálogo, orgânico ou ambos;
- pelo menos dois links de concorrentes que você confirmou serem o mesmo produto;
- top buscas do mês, termos com pouca concorrência e grafias alternativas da sua ferramenta de
  pesquisa, se você tiver esses dados;
- foto base nítida, preferencialmente com fundo branco;
- dados reais do produto que não podem ser inferidos.

Sem pesquisa própria o agente consegue continuar pela API, mas deve avisar que a semântica e o título
terão sinais mais fracos.

## 24 — Abrir o produto no agente escolhido

Inicie o Claude Code ou o Codex local na raiz do repositório e use uma mensagem como esta:

```text
Quero criar um anúncio para [produto]. A categoria que escolhi é [MLB...]
e a estratégia é [catálogo/orgânico/ambos].

Minha pesquisa de busca é:
[cole apenas termos e números, nunca credenciais]

Concorrentes que confirmei como o mesmo produto:
[link 1]
[link 2]

Leia as instruções do projeto e conduza o processo até o próximo checkpoint.
Não publique nada sem meu OK explícito.
```

Se `OPERACAO.md` ainda estiver incompleto, o agente deve pedir o contexto que falta antes de avançar.

## 25 — Checkpoint das top-3 semânticas

O agente cruza sua pesquisa com os sinais disponíveis no ML e apresenta três semânticas. Confirme,
corrija ou rejeite antes da coleta aprofundada. Esse é o primeiro checkpoint humano.

## 26 — Revisar dossiê e oferta

Depois da coleta, confira o dossiê, o diferencial proposto, o título, a ficha e a descrição. Dados
ausentes devem estar marcados como não encontrados ou pendentes; não podem ser inventados.

Antes de gerar imagens, aprove o ângulo da oferta. Antes da publicação, informe explicitamente:

| Dado | Quem decide |
|---|---|
| Preço | você, a partir dos seus custos |
| Estoque disponível | você |
| Clássico (`gold_special`) ou Premium (`gold_pro`) | você |
| Dimensões e peso bruto da embalagem | você |

A mediana de mercado é apenas referência. Ela nunca vira preço automaticamente.

## 27 — Revisar as imagens

O agente gera cinco imagens em `produtos/<slug>/imagens/`. Revise produto, cor, rótulo, texto,
proporções e fidelidade à foto base. Reprovar uma imagem não altera as aprovadas; o agente pode refazer
somente aquela foto a partir da base original.

Não aprove imagem com informação inventada, texto errado ou produto diferente do real.

## 27A — Escolher o catálogo

Antes de publicar, o agente lista candidatos de catálogo com links. Abra os links e diga se algum é
exatamente o mesmo produto, embalagem e versão. Nome parecido não é confirmação, e o agente não pode
decidir sozinho.

## 27B — Liberar escrita somente quando for publicar

Se o aplicativo foi criado apenas com leitura, volte ao painel do ML, habilite o escopo OAuth
`write`, libere escrita em **Publicação e sincronização** e reautorize:

```powershell
npm run ml:autorizar
```

Repita o consentimento e grave o novo token como nos passos 16–18. Isso libera a conta; ainda assim,
o código continua exigindo confirmação explícita para cada publicação.

## 27C — Validar e dar o OK final

Peça ao agente para montar o anúncio localmente e mostrar o payload. O dry-run no ML não cria o item,
mas, quando a oferta usa fotos locais, precisa enviá-las para obter URLs; isso já é uma escrita e
exige sua autorização explícita e `--confirmo`. Revise as imagens e o título com calma: no fluxo User
Products, o título fica travado depois da publicação.

Somente depois diga claramente que autoriza publicar aquela oferta. O envio exige `--publicar` e
`--confirmo`; sem as duas flags, o script não cria o anúncio.

## 28 — Conferir o anúncio no ar

Abra o link público devolvido pelo processo e confira título, preço, fotos, ficha, descrição,
categoria e modalidade. Se algo estiver errado, não presuma que o título poderá ser alterado por API.

## 29 — Registrar o resultado

Peça ao agente um resumo final com o link, o identificador do anúncio, o arquivo de oferta usado,
as decisões tomadas nos checkpoints e qualquer pendência manual. Esse resumo não deve conter token,
Secret Key nem chave da OpenAI.

## 30 — Encerrar deixando o produto reproduzível

Confirme que a pasta do produto contém, no mínimo:

```text
produtos/<slug>/
  raw/
  dossie.md
  base/produto.png
  prompts-imagens.json
  imagens/
  imagens/historico.md
  oferta*.json
```

Esses arquivos ficam locais e fora do git. Para o próximo produto, abra uma conversa nova e repita a
partir da tela 24.
