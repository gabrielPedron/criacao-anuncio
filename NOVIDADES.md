# Novidades

O que mudou em cada versão publicada. O `npm run atualizar` mostra a versão nova; aqui fica o
histórico. Quem mantém o projeto escreve a versão nova no topo antes de publicar.

## v1 — 06/10/2026 — Chrome para busca, garantia no publicar e conferência antes de publicar

Primeira versão numerada. As atualizações anteriores (até 26/09/2026) não tinham número.

**Depois de atualizar:** rode `npm.cmd run verificar`. Se você tem uma oferta em andamento, acrescente
a garantia no `oferta.json` (veja abaixo), senão o `ml:publicar` recusa.

- **Comandos novos que leem a página do Mercado Livre** (o que a API não entrega): `ml:busca` (total
  de resultados e 1ª página da busca, com os patrocinados marcados), `ml:sugestoes` (as sugestões de
  busca do ML) e `ml:pagina` (anúncio de outro vendedor: preço, vendidos, ficha, descrição e
  avaliações). Abrem o Google Chrome em guia anônima, num perfil separado — não usam o seu Chrome
  nem a sua conta. **Precisam do Google Chrome instalado**; o `verificar` agora confere.
- **Garantia obrigatória na oferta.** O `oferta.json` ganhou o campo
  `"garantia": {"tipo": "fabrica", "prazo": "3 meses"}` (tipos: `fabrica`, `vendedor`, `sem`). Antes o
  `ml:publicar` nunca enviava garantia e o anúncio ia ao ar sem ela. Sem código de barras, o
  `ml:publicar` avisa; diga o motivo em `"sem_gtin_motivo"`.
- **`ml:conferir`** — roda antes da revisão final: título como vai aparecer, ficha comparada com a
  categoria e com os concorrentes, código de barras, garantia, dúvidas do dossiê que a descrição
  precisa responder e o que ainda está PENDENTE na ficha de entrada.
- **`ml:editar`** — completa um anúncio já publicado (garantia, atributo da ficha ou descrição),
  mostra o antes e o depois, só grava com `--confirmo` e confere que nada mais mudou.
- **`ml:saude`** — a nota de qualidade que o próprio Mercado Livre dá ao anúncio e o que ele aponta
  como pendente. Último passo depois de publicar; `--conta` revisa todos os anúncios ativos.
- **`ml:publicar`** grava no `oferta.json` os ids das fotos que subiu: se a publicação falhar depois,
  a próxima tentativa não sobe as fotos de novo.
- **Método:** conferências antes do dossiê (anúncio "próprio" precisa de prova, a unidade do rótulo
  manda, avaliação de catálogo pode ser de outro produto); capa semiambientada; o ML acrescenta cor e
  acabamento no fim do título; metodologia externa lida com `git pull` antes de consultar.
- **Trilha Hermes (em teste)** documentada em `manual/HERMES-INSTALACAO.md`.
