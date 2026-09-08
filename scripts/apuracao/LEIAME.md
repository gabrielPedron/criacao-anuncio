# Núcleo de apuração e auditoria de API

Pasta **portátil**: nada aqui conhece o Mercado Livre, o Supabase, o TanStack ou este
projeto. Zero dependências. Copiar a pasta inteira já instala em qualquer projeto.

> A cópia canônica vive no skill `apuracao-de-api` (`~/.claude/skills/apuracao-de-api/nucleo/`).
> Corrigiu um bug aqui? Leve a correção para lá também, senão o próximo projeto nasce com o
> bug de volta.

## Os dois problemas que isto resolve

**1. O nome não bate.** A gente diz "reclamação", a API diz `claims`. A gente diz "é Full?",
a API diz `shipping.logistic_type`. O campo existe — está com outro nome, ou fundo demais.

**2. O número não se repete.** API grande tem réplica, cache e consistência eventual. A mesma
chamada, três vezes, devolve 23, 20 e 23. Ler uma vez e confiar é apostar.

## Uso

```ts
import {
  coletar, catalogar, buscarPorTermo, buscarPorValor, auditar, resumirAuditoria,
} from "@/lib/apuracao";

const coleta = await coletar(
  async () => (await fetch(url, { headers })).json(),
  { repeticoes: 3, intervaloMs: 700 },
);
const amostras = coleta.amostras.map((a) => a.dados);

// APURAR
const catalogo = catalogar(amostras);
buscarPorTermo(catalogo, "reputação");
buscarPorValor(catalogo, 23);

// AUDITAR
const auditoria = auditar(amostras, { toleranciaRelativa: 0.01 });
console.log(resumirAuditoria(auditoria));
auditoria.instaveis; // só o que não bateu
```

## Arquivos

| Arquivo | Papel |
|---|---|
| `achatar.ts` | JSON inteiro → pares `caminho → valor`. Base de tudo. |
| `catalogo.ts` | Junta as amostras num mapa de campos com tipo e exemplos. |
| `busca.ts` | Busca reversa: por termo (PT↔EN, sem acento) ou pelo valor. |
| `sinonimos.ts` | Dicionário de e-commerce PT↔EN. Amplie por API no adaptador. |
| `auditoria.ts` | Moda por campo, com margem numérica e selo de confiança. |
| `coleta.ts` | Repete a chamada N vezes, sequencial e espaçada. |
| `relatorio.ts` | Resumo em português da auditoria. |
| `tipos.ts` | Tipos compartilhados. |
| `teste.ts` | 23 checagens sem framework. `bun run src/lib/apuracao/teste.ts` |

## Decisões que não são acidentais

- **Listas indexadas por identidade, não por posição** (`results[id=MLB1].price`). Muita API
  devolve a lista em ordem diferente a cada chamada; sem isso a auditoria acusaria divergência
  em todo campo só porque os itens trocaram de lugar.
- **Toda lista ganha `caminho#quantidade`.** "Vieram 23 ou 20 pedidos?" é a divergência que
  interessa, e o tamanho da lista passaria batido sem esse campo sintético.
- **Coleta sequencial e espaçada.** Em paralelo as chamadas caem na mesma réplica e no mesmo
  cache — a auditoria não provaria nada.
- **`respostasIdenticas` é ressalva, não medalha.** Respostas idênticas podem ser dado estável
  ou cache. Mostre como dúvida, nunca como confirmação.
- **Campo ausente conta como instável** mesmo com os valores presentes concordando: "às vezes
  vem, às vezes não" é o que quebra integração em produção.
- **Tolerância numérica padrão zero.** Ligue no adaptador — 1% costuma servir para dinheiro e
  métricas, onde ordem de grandeza basta.
- **`ValorJson`, não `unknown`.** Os valores atravessam a fronteira servidor → navegador e o
  serializador do TanStack recusa `unknown`. Como a origem é sempre resposta de API, o tipo
  estreito também é o honesto.

## Adaptador neste projeto

`src/lib/ml/glossario.ts` (vocabulário) · `src/lib/ml/apurador.server.ts` (adaptador do
Mercado Livre) · `src/components/painel-apuracao.tsx` (painel admin em `/integracoes`).
