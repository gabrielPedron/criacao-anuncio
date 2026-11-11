# Ficha de entrada — [produto]

O agente copia este modelo para `produtos/<slug>/entrada.md` no início de todo produto, preenche
com o que o operador mandar e **pergunta o que faltar**. Campo vazio fica `PENDENTE`, nunca
estimado. Os blocos 1 e 2 são necessários para começar; o bloco 3 só é exigido antes de publicar.

## 1. Para começar a pesquisa

- **Foto base** (fundo branco, nítida): [caminho do arquivo]
- **Categoria** (principal, escolha do operador; ID explícito): [MLB123456 — se o operador der só o nome, o agente roda `ml:categoria "<nome>"`, mostra ID, caminho e link, e só preenche depois do OK]
- **Categorias adicionais aprovadas:** [nenhuma ou MLB234567, MLB345678 — IDs escolhidos pelo operador; cada categoria terá oferta, ficha e revisão próprias]
- **Estratégia:** [catálogo / orgânico / ambos]
- **Nicho:** [nichos/<nicho>.md, ou "nenhum" — o agente lê antes da sondagem, do título, das imagens e da descrição]
- **Concorrentes validados pelo operador** (2 ou mais links do mesmo produto):
  - [link 1]
  - [link 2]
- **Semântica** (top buscas do mês e termos com pouca concorrência, de qualquer ferramenta): [termos e
  números, ou "não tenho" — o agente avisa que o título fica mais fraco]
- **Top-3 semânticas confirmadas:** [termo 1, termo 2, termo 3 — o agente propõe pela sondagem (`ml:coletar --sondar`); preencher SOMENTE após OK humano; a coleta completa recusa sem elas]

## 2. Dados técnicos que a IA não descobre sozinha

Só o que é do produto real. Exemplos: rendimento (m² por embalagem), voltagem, amperagem, potência,
medidas do produto, composição, cor, validade, garantia, conteúdo da embalagem.

- [dado]: [valor]
- [dado]: [valor]
- **Garantia:** [de fábrica / do vendedor / sem] e prazo [ex.: 3 meses]
- **Código de barras (GTIN):** [número, ou o motivo de não ter]

**Dúvidas que a descrição precisa responder** — o agente lista a partir das perguntas e avaliações
dos concorrentes (modo de aplicar, quantidade, compatibilidade, remoção…) e o operador responde aqui.
O que ficar sem resposta não entra na descrição como promessa.

- [dúvida]: [resposta do operador]

## 3. Para publicar (sempre do operador)

| Dado | Valor |
|---|---|
| Preço (a partir dos custos do operador) | PENDENTE |
| Estoque disponível | PENDENTE |
| Clássico ou Premium | PENDENTE |
| Embalagem pronta para envio: altura × largura × comprimento (cm) | PENDENTE |
| Peso bruto da embalagem (kg) | PENDENTE |
