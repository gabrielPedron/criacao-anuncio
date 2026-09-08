# O agente completo — desenho do processo ponta a ponta
*Escrito em 26/08/2026 a partir da conversa. Ainda não implementado — é o alvo.*

## Princípio
Roda sozinho de ponta a ponta, **para em 4 pontos** onde erro custa caro, e o operador só confirma. Nenhuma ação irreversível sem OK explícito.

---

## FASE 0 — a pesquisa do operador  *(manual, sempre primeiro)*
*Adicionada em 06/09/2026, depois do segundo piloto.*

| O que ele traz | Ferramenta dele |
|---|---|
| Top buscas do mês e semântica da categoria | **Virtual Seller** e **Nubimetrics** (navegador dele) |
| Termos com demanda e pouca concorrência (lacuna) | Nubimetrics — nº de anúncios por termo |
| **2+ links de concorrentes que ele validou** | ele, olhando → `ml:referencia` |

**Isto não é opcional e não é fallback — é a primeira fonte.** Medido no segundo piloto: o
resultado com a pesquisa dele saiu melhor do que com a descoberta automática. A automação acha
**nome parecido**; ele sabe o que **é** o mesmo produto. E o volume de busca eu não obtenho por
caminho nenhum — a busca do ML está bloqueada para este app.

**O Nubimetrics volta só na mão dele.** Eu dirigindo o Nubi por automação continua fora (a sessão
caía no meio da coleta). Detalhe em [11-sem-nubimetrics.md](11-sem-nubimetrics.md) e o roteiro em
[02-etapa-A-coleta.md](02-etapa-A-coleta.md).

---

## FASE 1 — Coleta (automática) ✅ *funcionando*
*Amplia a Fase 0, não substitui.*

| Passo | Ferramenta |
|---|---|
| Categoria + schema real da ficha | API `ml:categoria` |
| Semântica: tendências do ML | API `ml:semantica` |
| **Anúncios de referência do operador** | `ml:referencia` — **é a melhor entrada, quando existe** |
| Concorrentes + faixa de preço | API `ml:descobrir` |
| Ficha, vendedores, **perguntas** | API `ml:produto` |
| Fotos dos concorrentes + leitura visual | API `ml:fotos` + visão |
| Demanda real (visitas 30d) | API `ml:demanda` |
| **Avaliações** | Chrome |

### Anúncios de referência — pedir sempre no início

```bash
npm run ml:referencia -- "url1" "url2" --salvar produtos/<slug>/raw/ref.json
```

**Peça ao operador 2 ou mais links de concorrentes que ele já validou como sendo o mesmo
produto.** Isso vale mais que a minha descoberta automática: eu só sei o que tem nome parecido;
ele sabe o que É o mesmo produto. A descoberta automática erra em duas direções — traz produto
de outro porte e perde quem vende fora do catálogo.

Do link eu tiro: ficha completa, preços de todos os vendedores, visitas de 30 dias, perguntas e
fotos. Funciona tanto para link de catálogo (`/p/MLB...`) quanto de anúncio tradicional — e no
tradicional as perguntas e visitas vêm mesmo com `/items/$ID` bloqueado.

`ml:descobrir` continua rodando **junto**, para achar o que ele não conhece. As duas fontes se
somam: a dele ancora, a minha amplia.

> **🛑 CHECKPOINT 1 — confirmar as top-3 semânticas.** Antes de aprofundar.

**Pendência desta fase:** filtro de nota nas avaliações — só as 5 mais úteis vêm no DOM inicial, todas positivas; as críticas de 1–3 estrelas exigem clicar no filtro.

**Nubimetrics saiu do fluxo** em 27/08/2026 — ver [11-sem-nubimetrics.md](11-sem-nubimetrics.md).

---

## FASE 2 — Oferta (automática)

Relatório de oferta → título → ficha técnica + campo modelo → descrição → **preço**.

**Preço é input do operador, não cálculo meu.** Ele informa por qual preço quer trabalhar aquele produto na plataforma — a partir dos custos dele, que eu não tenho e não devo estimar. **Não calculo margem.**

A mediana do mercado (`ml:concorrentes`) continua sendo colhida, mas como **referência no dossiê**, para ele decidir com o dado na mão. Não vai para o payload sozinha.

### Perguntas obrigatórias antes de publicar

Estas **não se adivinha** — sempre perguntar ao operador:

| O que | Por quê |
|---|---|
| **Preço** | É decisão dele, a partir dos custos. Nunca calcular margem |
| **Quantidade em estoque** | Vai no `available_quantity`; anúncio sem estoque real gera cancelamento |
| **Clássico ou Premium** | `gold_special` (clássico) vs `gold_pro` (premium) — muda comissão e parcelamento |
| **Dimensões e peso bruto da embalagem** | Obrigatório pelo ML; define o custo do frete, que pode ser grátis obrigatório |

### Passo de catálogo (antes de publicar)

```bash
npm run ml:catalogo -- "nome do produto com marca e tamanho" --categoria MLBxxxxx
```

**REGRA: eu não decido, eu apresento.** O comando lista **todos** os candidatos com **link
clicável**, marca, nº de vendedores e preço. Quem diz se é o mesmo produto é o operador, abrindo
o link — pode ser outra embalagem, outra versão, outro acabamento. Nome parecido engana.

Eu só aponto o que notei: quais têm a marca dele no nome, quais têm o mesmo tamanho.
Nunca concluir "é esse" sozinho.

As três respostas possíveis dele:
1. **"é o catálogo X"** → anexar a oferta a ele **além** do tradicional (buy box + orgânico)
2. **"nenhum é o mesmo"** → publicar só o tradicional
3. **"quero criar catálogo"** → exige **marca registrada + loja oficial**; o produto vira um novo
   item de catálogo, ou um novo tamanho dentro de uma família que já existe

> No piloto, a semelhança textual apontava um produto **Incolor** de outra marca
> como "80% igual". Se eu tivesse decidido sozinho, teria anexado ao catálogo errado.

> **🛑 CHECKPOINT 2 — revisar a oferta (texto).**
> **Este checkpoint é novo e existe por dinheiro:** aprovar a copy *antes* de gerar mídia evita pagar por 5 imagens e um vídeo de um anúncio cujo ângulo vai mudar.

---

## FASE 3 — Mídia (automática, com autocorreção)

> **Decisão 28/08/2026: só imagens, e só pela OpenAI.** Vídeo (Veo/Gemini) fica para depois —
> é a parte cara e não é necessária para publicar.

### Como roda

```bash
npm run midia:gerar -- produtos/<slug>            # gera as 5
npm run midia:gerar -- produtos/<slug> --foto 3   # refaz só a 3
npm run midia:gerar -- produtos/<slug> --dry      # mostra sem chamar a API
```

**Qualidade padrão: `medium`.** Testado em 31/08 contra `high` na mesma foto: rótulo igualmente
legível, sem degradação visível, e **4× menos tokens de saída** (1.982 contra 7.926) — que é
onde mora quase todo o custo. Usar `--qualidade high` só quando o medium falhar de fato.

Entrada: `produtos/<slug>/prompts-imagens.json` (os prompts já preenchidos a partir do dossiê)
e a foto base de fundo branco. Saída versionada em `produtos/<slug>/imagens/0N-vN.png` — refazer
nunca sobrescreve a tentativa anterior.

**Modelo `gpt-image-2`, tamanho 1200×1200.** Testado em 28/08/2026: o `gpt-image-2` aceita
1200×1200 e **ativa o zoom do ML**, que exige ≥1200. O `gpt-image-1` não passa de 1024 — foi por
causa dele que quase aceitamos ficar sem zoom. Trocar de modelo resolveu.

Ambos seguem disponíveis via `--modelo`, para comparar fidelidade ao produto quando fizer sentido.


### Os prompts do operador entram primeiro

O operador já tem prompts robustos que usa para gerar imagem. **Eles são o ponto de partida**, não a minha proposta abaixo. O que segue é a ressalva técnica e o plano B — a decidir por teste, não por discussão.

### A ressalva: compor onde tem texto

Analisei as 9 fotos do líder de vendas de uma categoria distante da nossa. **Elas não são cenas geradas — são a foto real do produto com texto e ícones por cima**, em layout. Infográfico, não arte.

Gerar isso com modelo de imagem é pedir alucinação exatamente onde ela mais aparece: **texto sai torto** e **o produto muda** (padrão da camuflagem, posição de fivela, número de bolsos). E foto de anúncio que não corresponde ao produto real é risco de denúncia no ML e problema de consumidor — não é só estética.

| Foto | Como produzir | Por quê |
|---|---|---|
| 1. Principal, fundo branco | **Recorte da foto base** (remoção de fundo) | O produto tem que ser ele mesmo, pixel a pixel |
| 2. Qualidade/diferencial | **Composição** — foto real + texto/ícones | Texto legível e produto fiel, garantidos |
| 3. Principais dúvidas | **Composição** | idem |
| 4. Benefícios | **Composição** | idem |
| 5. Prova social | **Composição** | idem |
| (cenário/ambientação, se pedido) | **Geração por IA** | Aqui o produto não precisa ser pixel-fiel |

**Composição = HTML/CSS renderizado em PNG.** Determinístico, gratuito, reproduzível, e se você pedir "aumenta a fonte do terceiro bullet" eu mudo uma linha — em vez de tentar a sorte num novo prompt.

**O híbrido é provavelmente a resposta certa:** os prompts do operador geram a cena, e o texto entra por composição por cima. Ele fica com o visual que já sabe que funciona, e o texto para de ser loteria.

**Como decidir:** bake-off num produto só. Mesma foto base, mesmos 5 objetivos, dois caminhos — prompt puro e híbrido — lado a lado. Ganha o que passar no checkpoint com menos ida e volta.

### Onde a IA generativa entra de verdade

- **Imagem (OpenAI `gpt-image-1`):** endpoint de *edits* aceita a foto base como entrada.
- **Imagem (Gemini):** o Google também gera imagem por API. **Se o operador já paga Google, dá para fazer imagem E vídeo com uma chave só, uma conta só, uma cobrança só.**
- **Vídeo (Gemini / Veo):** clipes curtos. **Custo por segundo é a parte cara do processo.**

> ⚠️ **Assinatura não é API — vale para os dois.** Ter ChatGPT Plus não dá acesso à API da OpenAI, e ter Gemini pago no app não dá acesso à API do Google. São produtos e cobranças separados. Então *não* é problema o operador não pagar ChatGPT: pagar não ajudaria de qualquer forma. O que ele precisa, em qualquer cenário, é **habilitar a API e pôr crédito** — e como já paga Google, começar por lá tem menos atrito.

### O loop de autocorreção

Isto responde ao "não ficar alucinando" e **funciona porque eu consigo ler imagem** (comprovado na coleta: li as fotos dos concorrentes e descrevi o que argumentam).

```
gerar/compor → EU OLHO a imagem → confiro contra a especificação:
   • é o produto certo? cor, padrão, formato batem com a foto base?
   • o texto está legível e escrito certo?
   • tem artefato, dedo a mais, deformação?
   • cumpre o objetivo daquela foto (dúvida / benefício / prova)?
→ se falhar: eu ajusto o prompt (ou o CSS) e refaço
→ máximo 3 tentativas por foto
→ se ainda falhar: sobe para você com o diagnóstico do que não consegui resolver
```

Em composição o loop é ainda melhor: o defeito tem causa conhecida e a correção é determinística, não uma nova aposta.

### Reprovar uma imagem NÃO recomeça do zero — e não acumula erro

Este é o ponto que muda em relação ao ChatGPT web. **A API não tem conversa.** Cada chamada é independente e parte sempre da **mesma foto base + prompt**.

- No **ChatGPT web**, editar a imagem dentro do fio faz o erro se acumular: cada "ajusta isso" parte do resultado anterior, e o produto vai derivando. É por isso que a edição é onde mais alucina.
- Na **API**, reprovar a foto 3 significa: mesma foto base original, prompt ajustado, chamada nova. **As outras 4 aprovadas não são tocadas.** Não existe fio para degradar.

Ou seja: você aprova por foto, não por lote. O que passou, passou. O que reprovou volta sozinho, sem arrastar as outras e sem herdar o defeito da tentativa anterior.

### Quando uma imagem não agrada

```bash
npm run midia:gerar -- produtos/<slug> --foto 2 --ajuste "o que está errado"
```

O ajuste entra como **correção prioritária** no fim do prompt, e a chamada continua partindo da
**foto base original** — não herda o defeito da tentativa anterior. A versão antiga fica salva
(`02-v1.png`, `02-v2.png`…) e as fotos aprovadas não são tocadas.

`--variacoes 3` gera três tentativas de uma vez, para escolher entre elas em vez de ir uma a uma.

Cada geração é registrada em `imagens/historico.md` com data, modelo, ajuste pedido e espaço
para o veredito — para o mesmo erro não voltar duas vezes.

> **🛑 CHECKPOINT 3 — aprovar imagens e vídeo.** Continua sendo humano. O loop reduz o lixo que chega até você; não substitui seus olhos.

---

## Fora das fases — utilitários da conta

Nem tudo é passo do pipeline. `npm run ml:meus-anuncios` varre os anúncios da **própria conta**
(fichas, descrições e perguntas) e grava em `produtos/_catalogo/raw/`. Não pertence a nenhuma fase e
não segue "um produto = uma pasta" de propósito: é retrato da conta inteira, e serve de base de
conhecimento para os anúncios novos — o FAQ real sai das perguntas já respondidas.
Rodar quando a conta mudar, não a cada produto.

---

## FASE 4 — Publicação

1. Subir as imagens aprovadas
2. Criar o anúncio **tradicional (orgânico)** com título, ficha completa, campo modelo e descrição
3. Participar do **catálogo**, se existir produto compatível
4. Vídeo, se houver

> **🛑 CHECKPOINT 4 — OK final no anúncio montado.** Só depois eu executo a escrita.

**Bloqueios — situação em 06/09/2026:**
- ~~**Reautorização pendente.**~~ ✅ Resolvido. O token carrega `write` e já publicou: o primeiro piloto e o segundo piloto (duas categorias).
- ~~**User Products.**~~ ✅ Implementado contra o fluxo novo — é `family_name` que vira o título, e o ML **recusa** `title` junto. Efeito colateral caro: [o título fica travado depois de publicado](16-titulo-travado-user-products.md).
- **Vídeo no ML.** Verificar como o ML aceita vídeo hoje (historicamente por `video_id` de YouTube). Se for YouTube, entra um passo de upload — que é publicação e também precisa de OK.

---

## Riscos, na ordem em que doem

1. **Fidelidade da imagem.** O maior. Mitigado por compor em vez de gerar o produto. Não elimina a revisão humana.
2. **Custo por anúncio.** Imagem por API é barata; **vídeo não é**. Vale medir num anúncio antes de rodar em escala, e decidir se o vídeo entra sempre ou só em produto de ticket maior.
3. **Duas chaves pagas novas** (OpenAI + Google), cada uma com sua conta e cobrança, somadas ao Nubimetrics.
4. **Semântica sem volume de busca.** Consequência aceita de tirar o Nubimetrics: o título se apoia em concorrente + tendência do ML. Ver [11-sem-nubimetrics.md](11-sem-nubimetrics.md).
5. **Migração do ML.** Endpoint de publicação vai mudar.

## O que mudou no briefing ✅ *aplicado em 06/09/2026*

O §6 travava "imagens no braço, não automatizar via API". Foi revisto por decisão do operador (26/08) e **o [00-briefing](00-briefing.md) já está corrigido** — junto com a regra de preço (31/08) e a de marca registrada (01/09). A razão original — fidelidade ao produto real — continua válida e é atendida pelo checkpoint 3, que segue humano.
