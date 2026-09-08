# Prompts de Imagens — Set de Anúncio (Mercado Livre)

Um prompt para cada foto do set. Preencha os campos entre colchetes, anexe a **foto base do produto** e gere cada imagem no ChatGPT.

## Como usar
- Tenha a **melhor foto do produto** (nítida, alta qualidade). Produto complexo? Anexe **vários ângulos**. Ideal: uma foto padrão com **fundo branco**.
- Cada bloco abaixo é o prompt de **uma foto**. Gere uma por vez no ChatGPT — ou peça antes pro Claude **ajustar o prompt ao seu produto e às objeções do anúncio**.
- **Formato:** quadrado 1:1, alta resolução (**≥1200×1200** para ativar o zoom do ML).
- **Ambientação x tipo de produto:** produto apelativo (moda, suplemento) → mais ambientação; produto básico → fundo mais limpo.

### Regras que valem para TODAS as fotos
- **Fidelidade do produto:** o produto tem que ficar **exatamente igual à foto base** — mesma cor, formato, proporções e detalhes. NÃO inventar variação, NÃO distorcer, NÃO trocar cor, NÃO adicionar nem remover partes.
- **Texto/bullets nas fotos:** liberado nas fotos **2 a 5** e passa fácil em **catálogo**; em **orgânico** o ML às vezes pede para tirar — se acontecer, gere a versão **sem texto**.
- **Foto de capa (foto 1) NUNCA tem texto, selo, logo nem marca d'água** (regra do ML).
- Aparência de **foto de produto profissional** — nada que pareça artificial ou gerado.

---

## FOTO 1 — Capa (levemente ambientada)
*Fundo quase branco, sem texto. É a que mais aparece na busca.*

```
Gere uma foto de capa para anúncio de Mercado Livre a partir da imagem anexada.
- Produto: [nome do produto]
- Cena: produto centralizado, ocupando bem o quadro, sobre fundo branco (ou quase branco) com uma leve ambientação — uma superfície clara/neutra e uma sombra suave e realista, só para dar profundidade. Nada que distraia do produto.
- Iluminação: clara, uniforme, de estúdio; produto nítido e em foco.
- Formato: quadrado 1:1, alta resolução.
- REGRAS: produto 100% fiel à imagem anexada (mesma cor, formato, proporções e detalhes; não distorcer, não trocar cor). SEM texto, SEM logo, SEM selo, SEM marca d'água. Aparência de foto de produto profissional, não artificial.
```

## FOTO 2 — Qualidades / diferencial
*Destaca a qualidade e o diferencial que a concorrência não mostra.*

```
Gere uma foto que destaque a QUALIDADE e o DIFERENCIAL do produto, a partir da imagem anexada.
- Produto: [nome]
- Diferencial a destacar: [ex.: material, acabamento, resistência, tecnologia, o que a concorrência não mostra]
- Cena: produto em destaque, com um close ou ângulo que evidencie [o diferencial]. Fundo semiambientado com leve quebra de cor coerente com o produto.
- Texto (opcional, curto): [1 a 3 bullets com os diferenciais — ex.: "Material X", "Resistente a Y"]
- Formato: quadrado 1:1, alta resolução.
- REGRAS: produto 100% fiel à imagem anexada. Se usar texto, deixe-o curto, legível e discreto. Nada artificial.
```

## FOTO 3 — Principais dúvidas
*Responde visualmente o que mais gera dúvida antes da compra.*

```
Gere uma foto que responda visualmente as PRINCIPAIS DÚVIDAS de quem compra este produto, a partir da imagem anexada.
- Produto: [nome]
- Dúvidas a resolver: [ex.: medidas/dimensões, o que vem na caixa, compatibilidade, como usa, voltagem]
- Cena: [escolha o que resolve a dúvida — ex.: produto com cotas de medida ao lado de uma referência de escala / itens que vêm na caixa dispostos lado a lado / produto sendo usado no contexto real]
- Texto (opcional): [rótulos curtos indicando as medidas / os itens / a compatibilidade]
- Formato: quadrado 1:1, alta resolução.
- REGRAS: produto 100% fiel à imagem anexada. Informação clara e verdadeira. Nada artificial.
```

## FOTO 4 — Benefícios
*Os principais benefícios, de forma escaneável.*

```
Gere uma foto que destaque os PRINCIPAIS BENEFÍCIOS do produto, a partir da imagem anexada.
- Produto: [nome]
- Benefícios: [ex.: 3 a 4 benefícios principais — o que o cliente ganha na prática]
- Cena: produto em destaque, com os benefícios em bullets curtos ao lado, layout limpo e escaneável.
- Texto: [bullets dos benefícios, frases curtas]
- Formato: quadrado 1:1, alta resolução.
- REGRAS: produto 100% fiel à imagem anexada. Bullets curtos e legíveis. Visual de anúncio profissional, não poluído.
```

## FOTO 5 — Prova social *(situacional — use se você tiver prova real)*
*Reforça com avaliação/feedback verdadeiro. Forte em moda.*

```
Gere uma foto de PROVA SOCIAL para o anúncio, a partir da imagem anexada.
- Produto: [nome]
- Prova real (você fornece): [ex.: o texto de uma avaliação real de cliente satisfeito / o número real de "X vendidos" / a nota real de avaliação]
- Cena: produto em destaque com o elemento de prova social integrado de forma limpa (ex.: um card de avaliação ao lado do produto).
- Formato: quadrado 1:1, alta resolução.
- REGRAS: produto 100% fiel à imagem anexada. Use SOMENTE prova social real e verdadeira — NÃO invente avaliações, nomes nem números. Visual limpo e crível.
```

---

### Sequência sugerida do set
1. Capa (levemente ambientada, sem texto) · 2. Qualidades/diferencial · 3. Principais dúvidas · 4. Benefícios · 5. Prova social (se tiver).
Se quiser um 6º slot, o clássico é "o que vem na caixa" / características em bullet — passa fácil em catálogo.

---

## De onde eu preencho os colchetes (mapa dossiê → prompt)

Os campos entre colchetes não são chute meu: cada um sai de uma seção do dossiê da Etapa A.

| Prompt | Campo | Fonte no dossiê |
|---|---|---|
| Todas | `[nome do produto]` | Cabeçalho + título aprovado na Fase 2 |
| **Foto 2** | `Diferencial a destacar` | **§4 LACUNAS** — o que a concorrência não diz |
| **Foto 2** | bullets | §4 + ficha técnica (atributo que só nós preenchemos) |
| **Foto 3** | `Dúvidas a resolver` | **§5 Objeções reais** — as perguntas mais frequentes, por volume |
| **Foto 4** | `Benefícios` | §3 + §4 + atributos da ficha traduzidos em ganho prático |
| **Foto 5** | `Prova real` | Avaliações reais coletadas / nº real de vendas. **Nunca inventar** |

Exemplo do teste com mochila tática: 12 das 50 perguntas eram sobre o patch da bandeira dos EUA — isso vira **Foto 3** direto, sem eu precisar adivinhar a dúvida.

## Regras operacionais

- **Foto base:** fundo branco, nítida. Produto complexo → vários ângulos, como o operador já faz.
- **Uma foto por chamada.** Não gerar o set inteiro numa tacada.
- **Reprovar não contamina:** cada chamada parte da foto base original. A foto 3 reprovada volta sozinha, sem mexer nas aprovadas e sem herdar o defeito da tentativa anterior.
- **Antes de mandar pro operador eu confiro cada imagem** contra: produto fiel à base, texto legível e correto, sem deformação, cumpre o objetivo da foto, capa sem texto/logo/selo. Máximo 3 tentativas; depois sobe com o diagnóstico.
- **Foto 5 é situacional** — só entra com prova real. Sem avaliação verdadeira coletada, pular.
- **Se o ML pedir para tirar texto** em anúncio orgânico, gerar a versão sem texto do mesmo prompt.
