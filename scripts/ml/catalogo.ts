// Procura catálogo existente para o produto ANTES de publicar.
// Três saídas possíveis: (a) existe catálogo compatível → vale anexar a oferta;
// (b) existe família parecida mas não o nosso item → candidato a criar catálogo novo;
// (c) não existe nada → anúncio tradicional puro.
//
//   npm run ml:catalogo -- "<produto com marca e tamanho>" --categoria MLB<id>
import { ml, morrer, opc } from "./api.js";
import { lerEnv } from "./auth.js";
import { args, brl, pega } from "../cli.ts";

const cat = pega("--categoria");
const termo = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")).join(" ").trim();
if (!termo) morrer(new Error('Uso: npm run ml:catalogo -- "nome do produto" [--categoria MLBxxxx]'));

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

try {
  const site = lerEnv().ML_SITE;
  let url = `/products/search?site_id=${site}&q=${encodeURIComponent(termo)}&limit=20`;
  if (cat) url += `&category_id=${cat}`;
  const r = await ml(url);

  const meus = new Set(norm(termo));
  const achados = [];
  for (const p of r.results ?? []) {
    const deles = new Set(norm(p.name));
    const comuns = [...meus].filter((w) => deles.has(w) && w.length > 2);
    const score = comuns.length / meus.size;
    const [itens, det] = await Promise.all([opc(`/products/${p.id}/items?limit=5`), opc(`/products/${p.id}`)]);
    const precos = (itens?.results ?? []).map((i: any) => i.price).filter((n: any) => typeof n === "number").sort((a: number, b: number) => a - b);
    achados.push({
      id: p.id, nome: p.name, score, vendedores: precos.length, menor: precos[0] ?? null, comuns,
      link: det?.permalink || `https://www.mercadolivre.com.br/p/${p.id}`,
      marca: (det?.attributes ?? []).find((a: any) => a.id === "BRAND")?.value_name ?? null,
    });
  }
  achados.sort((a, b) => b.score - a.score);

  console.log(`\nProcurando catálogo para: "${termo}"\n`);
  // ponytail: /products/search e fuzzy — termo inexistente ainda devolve ~20 aproximados,
  // entao este branch quase nunca dispara. A orientacao de verdade esta no bloco de baixo,
  // que sempre imprime, porque "nenhum e o mesmo produto" e decisao do operador, nao do codigo.
  if (!achados.length) {
    console.log("Nenhum produto de catalogo encontrado para este termo.");
  } else {
    // O operador decide se é o mesmo produto — pode ser outra embalagem, outra versão.
    // Por isso: LINK de todos, sempre.
    console.log(`${achados.length} candidatos — TODOS listados. **Abra os links e diga quais são o mesmo produto.**
`);
    // Sem corte de proposito. Ordenar por semelhanca textual e util para ler, mas cortar por ela
    // esconderia justamente o catalogo certo de nome diferente — que e o erro que o Checkpoint 3
    // existe para evitar (docs/08: "lista TODOS os candidatos com link").
    achados.forEach((a, n) => {
      console.log(`${n + 1}. ${a.nome}`);
      console.log(`   marca: ${a.marca ?? "—"} · ${a.vendedores} vendedor(es) · a partir de ${brl(a.menor)}`);
      console.log(`   ${a.link}`);
      console.log("");
    });
  }

  // Semelhança de palavra não basta: MARCA e TAMANHO decidem se é o mesmo produto.
  // Anexar a catálogo de tamanho errado prejudica o anúncio.
  const tamanho = (t: string) => (t.match(/(\d+[.,]?\d*)\s*(kg|g|l|ml|litros?)\b/i) || [])[0]?.replace(/\s+/g, "").toLowerCase() ?? null;
  // As palavras genericas saem DOS PROPRIOS resultados, nao de uma lista fixa: o que aparece na
  // maioria dos candidatos e generico daquela busca. Antes era uma lista colada ao nicho de tintas,
  // que dava leitura errada em qualquer outra categoria.
  const genericas = new Set(
    [...new Set(achados.flatMap((a) => norm(a.nome)))].filter(
      (w) => achados.filter((a) => norm(a.nome).includes(w)).length >= Math.max(2, achados.length / 2),
    ),
  );
  const meuTam = tamanho(termo);
  // Tira tambem as palavras da medida ("50 litros" nao e marca) — sem isso, num termo cujo
  // resto todo e generico, a unidade sobrava sozinha e virava "marca provavel".
  // meuTam vem colado ("50litros"); separa numero de unidade antes de comparar palavra a palavra.
  const palavrasDoTamanho = new Set(meuTam ? norm(meuTam.replace(/(\d)([a-z])/gi, "$1 $2")) : []);
  const marcas = norm(termo).filter(
    (w) => w.length > 3 && !genericas.has(w) && !palavrasDoTamanho.has(w) && !/^\d/.test(w),
  );

  // Eu NÃO decido se é o mesmo produto. Nome parecido pode ser outra embalagem,
  // outra versão ou outra marca — só o operador, abrindo o link, sabe.
  const mesmaMarca = achados.filter((a) => marcas.some((m) => norm(a.nome).includes(m)));
  const mesmoTam = achados.filter((a) => meuTam && tamanho(a.nome) === meuTam);

  console.log("──── O QUE EU NOTEI (leitura, não decisão) ────");
  console.log(`  Seu produto: marca provável "${marcas.join(" ") || "—"}", tamanho ${meuTam ?? "não detectado"}`);
  console.log(`  Com a sua marca no nome: ${mesmaMarca.length ? mesmaMarca.map((a) => a.id).join(", ") : "nenhum"}`);
  console.log(`  Com o mesmo tamanho:     ${mesmoTam.length ? mesmoTam.map((a) => a.id).join(", ") : "nenhum"}`);
  console.log("");
  console.log("  ⚠ Nome parecido NÃO quer dizer mesmo produto — pode ser outra embalagem ou versão.");
  console.log("");
  console.log("  Me responda uma das três:");
  console.log('    • "é o catálogo X"       → anexo a oferta a ele + publico o tradicional');
  console.log('    • "nenhum é o mesmo"     → publico só o tradicional (é o padrão e funciona sozinho)');
  console.log('    • "quero criar catálogo" → sugerimos o produto ao ML (ver abaixo)');
  console.log("");
  console.log("──── SE NENHUM FOR O MESMO PRODUTO ────");
  console.log("  Não é problema: quer dizer que o produto ainda não existe no catálogo do ML.");
  console.log("  1. Publique o anúncio TRADICIONAL. É 100% seu — sua foto, seu título, sua ficha.");
  console.log("  2. Depois, se quiser disputar buy box, SUGIRA o produto ao catálogo:");
  console.log("       npm run ml:sugerir-catalogo -- <ID do seu anúncio já publicado>");
  console.log("     A sugestão parte de um anúncio SEU no ar, então o passo 1 vem antes.");
  console.log("     O ML recebe como sugestão e cura antes de virar produto (UNDER_REVIEW).");
  console.log("     Para SUGERIR não precisou de loja oficial (testado 31/08/2026, docs/15).");
  console.log("     Se precisa para ser APROVADO, ainda não sabemos.");
  console.log("");
} catch (e) { morrer(e as Error); }
