import type { Cell, CellValue } from "exceljs";
import { supabase } from "./supabase";
import { normalizar } from "./formatar";

/* ---------- Tipos ---------- */

/** Uma linha da planilha, já lida e conferida. */
export type ItemPlanilha = {
  linha: number;
  nome: string;
  tamanho: string;
  und: string;
  qtde: number;
  compra: number | null;
  preco: number | null;
  vendida: number;
  /** Qtde menos o que já foi vendido (é o estoque que a planilha diz ter). */
  saldo: number;
};

type ProdutoSistema = {
  id: string;
  nome: string;
  categoria: string;
  tamanho: string | null;
  preco_venda: number;
  ativo: boolean;
  saldo: number;
};

export type PecaNova = {
  chave: string;
  item: ItemPlanilha;
  categoria: string;
  categoriaNova: boolean;
};

export type PecaAlterada = {
  chave: string;
  produto: ProdutoSistema;
  item: ItemPlanilha;
  /** Quanto somar ao estoque do sistema para ficar igual à planilha (pode ser negativo). */
  delta: number;
  /** Preço novo, ou null se não mudou. */
  precoNovo: number | null;
  reativar: boolean;
};

export type Problema = { linha: number; nome: string; motivo: string };

export type Analise = {
  novas: PecaNova[];
  alteradas: PecaAlterada[];
  iguais: number;
  soNoSistema: string[];
  problemas: Problema[];
  totalLinhas: number;
};

/* ---------- Leitura do arquivo ---------- */

function textoDe(v: CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && !(v instanceof Date)) {
    const o = v as unknown as Record<string, unknown>;
    if ("result" in o) return textoDe(o.result as CellValue);
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if ("text" in o) return String(o.text ?? "");
    return "";
  }
  return String(v).trim();
}

function numeroDe(v: CellValue): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = textoDe(v).replace(/R\$/gi, "").replace(/\s/g, "");
  if (t === "") return null;
  // aceita 25,50 e 1.250,50
  const limpo = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Chave para achar a mesma peça nos dois lados: ignora maiúsculas, acentos e espaços a mais. */
function chaveDaPeca(nome: string, tamanho: string | null) {
  const n = normalizar(nome).replace(/\s+/g, " ").trim();
  const t = normalizar(tamanho ?? "").replace(/\s+/g, "");
  return `${n}|${t}`;
}

function unidadeDe(und: string) {
  const u = normalizar(und);
  return u === "par" || u === "pares" ? "par" : "unid";
}

type Lida = { itens: ItemPlanilha[]; problemas: Problema[]; totalLinhas: number };

async function lerPlanilha(arquivo: File): Promise<Lida> {
  const modulo = await import("exceljs");
  const Excel = (modulo as unknown as { default?: typeof modulo }).default ?? modulo;
  const wb = new Excel.Workbook();
  try {
    await wb.xlsx.load(await arquivo.arrayBuffer());
  } catch {
    throw new Error("Não consegui abrir este arquivo. Ele precisa ser uma planilha do Excel (.xlsx).");
  }

  const ws = wb.getWorksheet("Lista de estoque") ?? wb.worksheets[0];
  if (!ws) throw new Error("A planilha está vazia.");

  // Acha a linha do cabeçalho e a coluna de cada título
  const colunas = new Map<string, number>();
  let linhaCabecalho = 0;
  for (let r = 1; r <= Math.min(ws.rowCount, 25) && !linhaCabecalho; r++) {
    const achadas = new Map<string, number>();
    ws.getRow(r).eachCell((cel: Cell, c: number) => {
      const t = normalizar(textoDe(cel.value)).trim();
      if (t) achadas.set(t, c);
    });
    if (achadas.has("produto") && achadas.has("qtde")) {
      linhaCabecalho = r;
      achadas.forEach((c, t) => colunas.set(t, c));
    }
  }
  if (!linhaCabecalho) {
    throw new Error("Não achei o cabeçalho (Produto, Qtde...). Este arquivo é a planilha de estoque do ponto de cultura?");
  }

  const col = (titulo: string) => colunas.get(titulo);
  const cProduto = col("produto")!;
  const cTamanho = col("tamanho");
  const cUnd = col("und");
  const cQtde = col("qtde")!;
  const cCompra = col("valor/compra");
  const cPreco = col("preco unitario");
  const cVendida = col("qtde vendida");
  if (!cPreco) throw new Error("Não achei a coluna «Preço unitário» na planilha.");

  const itens: ItemPlanilha[] = [];
  const problemas: Problema[] = [];
  let totalLinhas = 0;

  for (let r = linhaCabecalho + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const nome = textoDe(row.getCell(cProduto).value).replace(/\s+/g, " ").trim();
    if (!nome) continue;
    if (normalizar(nome).startsWith("feito a mao")) continue; // rodapé da planilha

    totalLinhas++;
    const qtde = numeroDe(row.getCell(cQtde).value);
    const preco = numeroDe(row.getCell(cPreco).value);
    const vendida = cVendida ? (numeroDe(row.getCell(cVendida).value) ?? 0) : 0;

    if (qtde === null || !Number.isInteger(qtde) || qtde < 0) {
      problemas.push({ linha: r, nome, motivo: "a Qtde está vazia ou não é um número inteiro" });
      continue;
    }
    if (!Number.isInteger(vendida) || vendida < 0 || vendida > qtde) {
      problemas.push({ linha: r, nome, motivo: "a QTDE Vendida está errada (maior que a Qtde ou não é inteira)" });
      continue;
    }

    itens.push({
      linha: r,
      nome,
      tamanho: cTamanho ? textoDe(row.getCell(cTamanho).value).replace(/\s+/g, " ").trim() : "",
      und: cUnd ? textoDe(row.getCell(cUnd).value) : "",
      qtde,
      compra: cCompra ? numeroDe(row.getCell(cCompra).value) : null,
      preco: preco !== null && preco >= 0 ? preco : null,
      vendida,
      saldo: qtde - vendida,
    });
  }

  return { itens, problemas, totalLinhas };
}

/* ---------- Comparação com o sistema ---------- */

async function carregarSistema(): Promise<ProdutoSistema[]> {
  const [prod, sal] = await Promise.all([
    supabase.from("produtos").select("id, nome, categoria, tamanho, preco_venda, ativo"),
    supabase.from("saldo_estoque").select("produto_id, saldo"),
  ]);
  if (prod.error || sal.error) throw new Error("Não foi possível ler o estoque do sistema. Confira a internet e tente de novo.");
  const saldos = new Map<string, number>();
  for (const x of sal.data ?? []) saldos.set(x.produto_id as string, Number(x.saldo));
  return ((prod.data ?? []) as unknown as Omit<ProdutoSistema, "saldo">[]).map((p) => ({
    ...p,
    preco_venda: Number(p.preco_venda),
    saldo: saldos.get(p.id) ?? 0,
  }));
}

/** O tipo da peça é o começo do nome (Pirex, Suplar, Caminho de mesa...). */
function descobrirCategoria(nome: string, categorias: string[]) {
  const n = normalizar(nome);
  const achada = [...categorias]
    .sort((a, b) => b.length - a.length)
    .find((c) => n === normalizar(c) || n.startsWith(normalizar(c) + " "));
  if (achada) return { categoria: achada, nova: false };
  const primeira = nome.split(" ")[0] ?? nome;
  return { categoria: primeira.charAt(0).toUpperCase() + primeira.slice(1), nova: true };
}

/** Lê a planilha e compara com o sistema. Não muda nada: só mostra o que mudaria. */
export async function analisarPlanilha(arquivo: File): Promise<Analise> {
  const [lida, sistema] = await Promise.all([lerPlanilha(arquivo), carregarSistema()]);

  const porChave = new Map<string, ProdutoSistema>();
  for (const p of sistema) {
    const k = chaveDaPeca(p.nome, p.tamanho);
    const atual = porChave.get(k);
    // se houver duas iguais no sistema, vale a que está na lista (ativa)
    if (!atual || (!atual.ativo && p.ativo)) porChave.set(k, p);
  }
  const categorias = Array.from(new Set(sistema.map((p) => p.categoria)));

  const novas: PecaNova[] = [];
  const alteradas: PecaAlterada[] = [];
  const problemas = [...lida.problemas];
  const vistas = new Set<string>();
  let iguais = 0;

  for (const item of lida.itens) {
    const chave = chaveDaPeca(item.nome, item.tamanho);
    if (vistas.has(chave)) {
      problemas.push({ linha: item.linha, nome: item.nome, motivo: "aparece repetida na planilha (ignorei esta linha)" });
      continue;
    }
    vistas.add(chave);

    const existente = porChave.get(chave);
    if (!existente) {
      if (item.preco === null || item.preco <= 0) {
        problemas.push({ linha: item.linha, nome: item.nome, motivo: "peça nova sem Preço unitário" });
        continue;
      }
      const { categoria, nova } = descobrirCategoria(item.nome, categorias);
      novas.push({ chave, item, categoria, categoriaNova: nova });
      continue;
    }

    const delta = item.saldo - existente.saldo;
    const precoMudou = item.preco !== null && item.preco > 0 && Math.abs(item.preco - existente.preco_venda) > 0.004;
    const reativar = !existente.ativo;
    if (delta !== 0 || precoMudou || reativar) {
      alteradas.push({ chave, produto: existente, item, delta, precoNovo: precoMudou ? item.preco : null, reativar });
    } else {
      iguais++;
    }
  }

  const soNoSistema = sistema
    .filter((p) => p.ativo && !vistas.has(chaveDaPeca(p.nome, p.tamanho)))
    .map((p) => (p.tamanho ? `${p.nome} (${p.tamanho})` : p.nome));

  return { novas, alteradas, iguais, soNoSistema, problemas, totalLinhas: lida.totalLinhas };
}

/* ---------- Aplicar ---------- */

/** Aplica só as mudanças que a pessoa deixou marcadas, tudo de uma vez no banco. */
export async function aplicarMudancas(novas: PecaNova[], alteradas: PecaAlterada[]) {
  const itens = [
    ...novas.map((n) => ({
      acao: "novo",
      nome: n.item.nome,
      categoria: n.categoria,
      tamanho: n.item.tamanho || null,
      unidade: unidadeDe(n.item.und),
      preco_venda: n.item.preco,
      custo_unit:
        n.item.compra !== null && n.item.qtde > 0 ? Math.round((n.item.compra / n.item.qtde) * 100) / 100 : null,
      saldo: n.item.saldo,
    })),
    ...alteradas.map((a) => ({
      acao: "atualizar",
      produto_id: a.produto.id,
      preco_venda: a.precoNovo,
      reativar: a.reativar,
      delta: a.delta,
    })),
  ];
  if (itens.length === 0) return { novos: 0, atualizados: 0 };

  const { data, error } = await supabase.rpc("importar_planilha", { p_itens: itens });
  if (error) throw new Error("Não foi possível atualizar o sistema. Nada foi mudado. Confira a internet e tente de novo.");
  const r = (data ?? {}) as { novos?: number; atualizados?: number };
  return { novos: r.novos ?? 0, atualizados: r.atualizados ?? 0 };
}
