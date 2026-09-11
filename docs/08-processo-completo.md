# Processo completo — do produto ao anúncio

Esta é a visão canônica do método. O estado mecânico dos scripts está em
[docs/17-como-roda.md](17-como-roda.md).

## Princípio

O agente executa o trabalho repetitivo e para em quatro decisões humanas. Nenhuma escrita na API do
Mercado Livre acontece sem confirmação explícita.

## Fase 0 — pesquisa do operador

O operador entrega:

- categoria e estratégia;
- top buscas do mês, termos com pouca concorrência e grafias alternativas, se tiver pesquisa;
- dois ou mais links de concorrentes que confirmou serem o mesmo produto.

A ferramenta de pesquisa é usada manualmente pelo operador. O agente não automatiza Nubimetrics,
Virtual Seller ou equivalente. Sem esses dados, continua pela API e avisa que o resultado semântico
será mais fraco.

> **Checkpoint 1:** confirmar as top-3 semânticas propostas pelo agente.

## Fase 1 — coleta

A API fornece categoria, ficha, catálogo, vendedores, perguntas, visitas e fotos. Avaliações de
concorrentes vêm da página, lida por código com a skill `leitor-de-sites`.

O agente salva os dados crus em `produtos/<slug>/raw/` e consolida
`produtos/<slug>/dossie.md`. Detalhes em [docs/02-etapa-A-coleta.md](02-etapa-A-coleta.md).

## Fase 2 — oferta

Do dossiê saem, nesta ordem, relatório de oferta, prompts de imagem, título, ficha/modelo e
descrição. Categoria e preço são decisões do operador. A mediana do mercado aparece apenas como
referência.

Antes de publicar, o operador também informa estoque, clássico ou premium, dimensões e peso bruto da
embalagem. Nada disso é inferido.

## Fase 3 — imagens

O agente gera cinco imagens pela API da OpenAI a partir da foto base. Cada nova tentativa recebe uma
versão; refazer uma foto não altera as aprovadas.

```bash
npm run midia:gerar -- produtos/<slug>
npm run midia:gerar -- produtos/<slug> --foto 3 --ajuste "correção"
```

> **Checkpoint 2:** revisar fidelidade do produto, texto e qualidade de cada imagem.

Vídeo não é automatizado. Quando usado, seu prompt e sua execução ficam no processo manual do
operador.

## Catálogo

O agente lista todos os candidatos com links. Similaridade textual não decide equivalência.

> **Checkpoint 3:** o operador escolhe o catálogo ou confirma que nenhum candidato é o mesmo
> produto.

## Fase 4 — validação e publicação

O agente monta a oferta e pode chamar o dry-run do ML. O título precisa de atenção especial: no fluxo
User Products, `family_name` vira o título e fica irreversível pela API.

> **Checkpoint 4:** revisar o anúncio completo e autorizar explicitamente a publicação.

Somente após o OK, o CLI recebe `--publicar --confirmo`. A trava em `scripts/ml/api.js` continua
ativa mesmo que o aplicativo tenha escopo de escrita.

## Saídas

```text
produtos/<slug>/
  raw/
  dossie.md
  base/produto.png
  prompts-imagens.json
  imagens/0N-vN.png
  imagens/historico.md
  oferta*.json
```

Esses arquivos são da operação e ficam fora do git. O repositório compartilhado contém apenas o
método, os scripts e a documentação.
