# Manual do operador

Este diretório é a documentação para quem vai usar o agente, não para quem mantém o código.
O material é genérico: cada pessoa opera a própria conta do Mercado Livre, guarda as próprias
credenciais e fornece os dados dos próprios produtos.

## Ordem de leitura

1. [Instalação — do zero às conexões validadas](01-INSTALACAO.md)
2. [Primeiro anúncio — como conversar com o agente](02-PRIMEIRO-ANUNCIO.md)
3. [Roteiro da gravação](ROTEIRO-VIDEO.md)

O [checklist de capturas](PRINTS-NECESSARIOS.md) indica quais telas visuais ainda precisam ser
fotografadas. As telas de terminal serão montadas como texto a partir do teste gravado.

## O que fica fora do material compartilhado

- `.env`, `.tokens.json` e qualquer chave ou token;
- `OPERACAO.md` preenchido;
- `produtos/`, que contém pesquisas, imagens e dados reais;
- assinaturas de ferramentas de pesquisa;
- promessa de manutenção ou operação da conta por quem distribui o projeto.

## Referência técnica

- [README principal](../README.md): visão geral e comandos;
- [como a máquina roda](../docs/17-como-roda.md): entradas, saídas e fluxo de dados;
- [mapa da API do Mercado Livre](../docs/06-mapa-da-api.md): caminhos disponíveis e bloqueados;
- [apuração de campos da API](../docs/10-apuracao-e-auditoria.md): regra para integrar dado novo.

Para evitar versões concorrentes, use como fontes canônicas: `AGENTS.md`/`CLAUDE.md` para regras do
agente, [docs/08](../docs/08-processo-completo.md) para o método, [docs/17](../docs/17-como-roda.md)
para o estado dos scripts e este manual para a sequência de telas do operador.

> O texto do manual pode ser finalizado agora. As imagens e os trechos reais de terminal entram
> depois do teste gravado, sem mudar a ordem das telas 01–30.
