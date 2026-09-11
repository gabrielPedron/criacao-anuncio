# Conectar a API de imagem da OpenAI

O pipeline atual gera imagens somente pela API da OpenAI. Vídeo permanece manual e não exige chave
adicional neste projeto.

O passo a passo público está nas telas 19–23 de
[manual/01-INSTALACAO.md](../manual/01-INSTALACAO.md).

## Configuração

1. Acessar [platform.openai.com](https://platform.openai.com/).
2. Selecionar o projeto e criar uma chave em **API keys**.
3. Copiar a chave no momento da criação.
4. Configurar faturamento e limites na plataforma da API.
5. Salvar somente no `.env`:

```text
OPENAI_API_KEY=cole_aqui
```

A cobrança da API é separada de assinaturas de chat. O
[quickstart oficial da OpenAI](https://developers.openai.com/api/docs/quickstart) orienta armazenar
a chave com segurança e disponibilizá-la ao processo por variável de ambiente.

## Validar sem gerar imagem

```bash
npm run midia:chaves
```

O comando consulta `/v1/models`, informa apenas se a chave está presente e lista modelos de imagem
disponíveis. Não imprime nenhum trecho da chave e não gera imagem.

## Segurança

- nunca colar a chave em conversa, print ou commit;
- borrar a chave e dados de cartão em qualquer captura;
- se houver suspeita de vazamento, revogar e criar outra;
- configurar limites de gasto no projeto da API.

Depois da validação, a geração usa `npm run midia:gerar -- produtos/<slug>` e grava versões sem
sobrescrever as anteriores.
