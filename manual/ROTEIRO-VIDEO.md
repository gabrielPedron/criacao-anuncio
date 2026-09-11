# Roteiro de gravação

Objetivo: mostrar uma instalação limpa e um primeiro anúncio sem improvisar etapas. O vídeo segue os
mesmos números do manual, para que quem travar numa tela encontre o trecho correspondente.

## Antes de gravar

- use uma conta e um anúncio que possam aparecer publicamente;
- navegador com cerca de 1280 px de largura e zoom em 100%;
- notificações desligadas;
- `.env` e `.tokens.json` nunca abertos durante a gravação;
- Secret Key, `code=`, chave da OpenAI e cartão borrados antes de publicar o vídeo;
- faça um ensaio sem gerar imagens para confirmar o produto, a categoria e os concorrentes.

## Capítulos

| Capítulo | Telas | Resultado mostrado |
|---|---|---|
| 1. Preparar a máquina | 01–02 | Node e Claude Code disponíveis |
| 2. Criar o app no ML | 03–14 | app criado e arquivos locais preparados |
| 3. Autorizar a conta | 15–18 | conexão do ML validada |
| 4. Conectar a OpenAI | 19–23 | chave e testes validados |
| 5. Rodar um produto | 24–30, com 27A–27C | checkpoints, imagens e anúncio no ar |

## Regra de narração

Em cada tela, diga três coisas: onde a pessoa está, o que ela precisa fazer e como sabe que deu certo.
Não leia comandos longos caractere por caractere; deixe-os visíveis e explique o resultado.

## Capturas

As 21 capturas visuais estão em [PRINTS-NECESSARIOS.md](PRINTS-NECESSARIOS.md). As telas 12, 14,
15, 18, 23, 25, 26, 29 e 30 serão produzidas como blocos de terminal a partir da gravação real.
Os passos 27A, 27B e 27C são decisões narradas entre a revisão das imagens e o anúncio no ar; não
exigem uma captura separada.

## O que ficará para depois do teste

- substituir `<URL_DO_REPOSITORIO>` pela URL pública;
- inserir os prints borrados nos lugares numerados;
- transcrever as saídas reais do terminal;
- ajustar nomes de botões se a interface do ML ou da OpenAI tiver mudado;
- montar e revisar o PDF final.
