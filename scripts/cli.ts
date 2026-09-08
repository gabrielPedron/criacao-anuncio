// Helpers de linha de comando compartilhados. Não dependem da API do ML de propósito:
// scripts/midia/ usa `pega` sem precisar arrastar o cliente do Mercado Livre junto.
// (`opc` mora em ml/api.js, ao lado do `ml()` que ele embrulha.)

/** Argumentos passados depois do nome do script. */
export const args = process.argv.slice(2);

/** Valor de uma flag: `pega("--categoria")` em `-- --categoria MLB123` devolve "MLB123". */
export const pega = (flag: string, padrao: string | null = null): string | null => {
  const i = args.indexOf(flag);
  return i > -1 ? args[i + 1] ?? padrao : padrao;
};

/** Formata em real. Devolve "-" para o que não é número, que é o caso de preço ausente. */
export const brl = (n?: number | null): string =>
  typeof n === "number" ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";
