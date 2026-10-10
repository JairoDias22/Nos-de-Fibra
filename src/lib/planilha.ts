import type { CellValue, Workbook, Worksheet } from "exceljs";
import { supabase } from "./supabase";
import { carregarProdutosComSaldo } from "./produtos";
import { rotuloUnidade } from "./formatar";

/* ---------- Visual (o mesmo da planilha original do ateliê) ---------- */

const COR = {
  terracota: "FFB5532F",
  creme: "FFF6EBDD",
  cremeClaro: "FFFBF5EC",
  oliva: "FF6B7F4B",
  marrom: "FF4A2E1F",
  areia: "FFE8D5B5",
  dourado: "FFC9A66B",
  branco: "FFFFFFFF",
  verdeTexto: "FF3F6B2A",
  vermelhoTexto: "FFA23A1B",
};

const FUNDO_SITUACAO: Record<string, string> = {
  Disponível: "FFDCE5C8",
  "Estoque baixo": "FFF5DFA6",
  Esgotado: "FFEBC0B3",
};

const REAIS = '"R$ "#,##0.00';

const LINHA_CABECALHO = 8;
const PRIMEIRA_LINHA = LINHA_CABECALHO + 1;

type Coluna = {
  titulo: string;
  largura: number;
  formato?: string;
  alinhar?: "left" | "center" | "right";
  /** Coluna calculada: fundo cor de areia e letra em negrito. */
  calculada?: boolean;
};

type Cartao = { rotulo: string; valor: CellValue; formato: string };

type Destaque = { fundo?: string; texto?: string; negrito?: boolean };

type Folha = {
  nome: string;
  corAba: string;
  subtitulo: string;
  colunas: Coluna[];
  linhas: CellValue[][];
  cartoes: Cartao[];
  /** Linha de total no fim da tabela (um valor por coluna; null deixa a célula vazia). */
  totais?: CellValue[];
  /** Deixa uma célula de texto colorida (ex.: situação do estoque). */
  destaque?: (valor: CellValue, coluna: number) => Destaque | undefined;
  geradaEm: string;
};

function letra(numeroColuna: number) {
  return String.fromCharCode(64 + numeroColuna);
}

function montarFolha(wb: Workbook, f: Folha) {
  const nCol = f.colunas.length;
  const ultimaColuna = nCol + 1; // a coluna A é só margem
  const ultimaLinhaDados = LINHA_CABECALHO + f.linhas.length;
  const linhaTotais = f.totais ? ultimaLinhaDados + 1 : null;
  const linhaRodape = (linhaTotais ?? ultimaLinhaDados) + 2;

  const ws: Worksheet = wb.addWorksheet(f.nome, {
    properties: { tabColor: { argb: f.corAba } },
    views: [{ state: "frozen", ySplit: LINHA_CABECALHO, showGridLines: false }],
  });

  // Larguras
  ws.getColumn(1).width = 3;
  f.colunas.forEach((c, i) => {
    ws.getColumn(i + 2).width = c.largura;
  });
  ws.getColumn(ultimaColuna + 1).width = 3;

  // Fundo creme em tudo
  for (let r = 1; r <= linhaRodape + 1; r++) {
    for (let c = 1; c <= ultimaColuna + 1; c++) {
      ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.creme } };
    }
  }

  // Título
  ws.getRow(1).height = 10;
  ws.mergeCells(2, 2, 2, ultimaColuna);
  const titulo = ws.getCell(2, 2);
  titulo.value = "✦  Nós de Fibra  ✦";
  titulo.font = { name: "Georgia", size: 30, bold: true, color: { argb: COR.terracota } };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 46;

  ws.mergeCells(3, 2, 3, ultimaColuna);
  const sub = ws.getCell(3, 2);
  sub.value = f.subtitulo;
  sub.font = { name: "Georgia", size: 13, color: { argb: COR.marrom } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 20;

  ws.mergeCells(4, 2, 4, ultimaColuna);
  const data = ws.getCell(4, 2);
  data.value = `Planilha gerada em ${f.geradaEm}`;
  data.font = { name: "Georgia", size: 10, italic: true, color: { argb: COR.dourado } };
  data.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(4).height = 16;

  // Cartões de resumo (linhas 5 e 6), repartidos igualmente pelas colunas
  const n = f.cartoes.length;
  f.cartoes.forEach((cartao, i) => {
    const c1 = 2 + Math.floor((i * nCol) / n);
    const c2 = 2 + Math.floor(((i + 1) * nCol) / n) - 1;
    if (c2 > c1) {
      ws.mergeCells(5, c1, 5, c2);
      ws.mergeCells(6, c1, 6, c2);
    }
    const rotulo = ws.getCell(5, c1);
    rotulo.value = cartao.rotulo;
    rotulo.font = { name: "Georgia", size: 10, bold: true, color: { argb: COR.branco } };
    rotulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.oliva } };
    rotulo.alignment = { horizontal: "center", vertical: "middle" };

    const valor = ws.getCell(6, c1);
    valor.value = cartao.valor;
    valor.numFmt = cartao.formato;
    valor.font = { name: "Georgia", size: 18, bold: true, color: { argb: COR.marrom } };
    valor.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.cremeClaro } };
    valor.alignment = { horizontal: "center", vertical: "middle" };
    valor.border = { bottom: { style: "thin", color: { argb: COR.dourado } } };
  });
  ws.getRow(5).height = 20;
  ws.getRow(6).height = 34;
  ws.getRow(7).height = 12;

  // Cabeçalho da tabela
  f.colunas.forEach((c, i) => {
    const cel = ws.getCell(LINHA_CABECALHO, i + 2);
    cel.value = c.titulo;
    cel.font = { name: "Georgia", size: 11, bold: true, color: { argb: COR.branco } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.terracota } };
    cel.alignment = { horizontal: c.alinhar ?? "center", vertical: "middle", wrapText: true };
    cel.border = { bottom: { style: "medium", color: { argb: COR.marrom } } };
  });
  ws.getRow(LINHA_CABECALHO).height = 32;

  // Linhas de dados, com fundo alternado
  f.linhas.forEach((linha, i) => {
    const r = PRIMEIRA_LINHA + i;
    const faixa = i % 2 === 0 ? COR.cremeClaro : COR.creme;
    ws.getRow(r).height = 21;
    f.colunas.forEach((c, j) => {
      const cel = ws.getCell(r, j + 2);
      const valor = linha[j];
      cel.value = valor;
      if (c.formato) cel.numFmt = c.formato;
      const dest = f.destaque?.(valor, j);
      cel.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: dest?.fundo ?? (c.calculada ? COR.areia : faixa) },
      };
      cel.font = {
        name: "Calibri",
        size: 11,
        bold: dest?.negrito ?? c.calculada ?? false,
        color: { argb: dest?.texto ?? COR.marrom },
      };
      cel.alignment = { horizontal: c.alinhar ?? "center", vertical: "middle" };
      cel.border = { bottom: { style: "hair", color: { argb: COR.dourado } } };
    });
  });

  // Linha de total
  if (f.totais && linhaTotais) {
    ws.getRow(linhaTotais).height = 26;
    f.colunas.forEach((c, j) => {
      const cel = ws.getCell(linhaTotais, j + 2);
      cel.value = f.totais![j] ?? null;
      if (c.formato) cel.numFmt = c.formato;
      cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.areia } };
      cel.font = { name: "Georgia", size: 11, bold: true, color: { argb: COR.marrom } };
      cel.alignment = { horizontal: j === 0 ? "left" : c.alinhar ?? "center", vertical: "middle" };
      cel.border = { top: { style: "medium", color: { argb: COR.marrom } } };
    });
  }

  // Rodapé
  ws.mergeCells(linhaRodape, 2, linhaRodape, ultimaColuna);
  const rod = ws.getCell(linhaRodape, 2);
  rod.value = "Feito à mão, com carinho  ·  Esta planilha é uma cópia do sistema. Para mudar algo, altere no sistema e baixe de novo.";
  rod.font = { name: "Georgia", size: 10, color: { argb: COR.terracota } };
  rod.alignment = { horizontal: "center", vertical: "middle" };

  // Filtro, impressão
  if (f.linhas.length > 0) {
    ws.autoFilter = {
      from: { row: LINHA_CABECALHO, column: 2 },
      to: { row: ultimaLinhaDados, column: ultimaColuna },
    };
  }
  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${LINHA_CABECALHO}:${LINHA_CABECALHO}`,
  };
}

/* ---------- Busca dos dados ---------- */

/** O Supabase devolve no máximo 1000 linhas por vez; aqui buscamos de mil em mil até acabar. */
async function buscarTudo<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<T[]> {
  const passo = 1000;
  const todas: T[] = [];
  for (let de = 0; ; de += passo) {
    const { data, error } = await consulta(de, de + passo - 1);
    if (error) throw new Error("falha ao carregar os dados");
    todas.push(...((data ?? []) as T[]));
    if (!data || data.length < passo) break;
  }
  return todas;
}

type VendaBruta = {
  data: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  local_venda: string | null;
  produtos: { nome: string; categoria: string; tamanho: string | null } | null;
};

type LancamentoBruto = {
  data: string;
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string | null;
  valor: number;
  venda_id: string | null;
};

/** 2026-10-08 vira uma data de Excel sem mexer com fuso horário. */
function dataExcel(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function situacao(saldo: number, minimo: number) {
  if (saldo <= 0) return "Esgotado";
  if (saldo <= minimo) return "Estoque baixo";
  return "Disponível";
}

function doisDigitos(n: number) {
  return String(n).padStart(2, "0");
}

/* ---------- Função principal ---------- */

/** Monta o Excel com as abas Estoque, Vendas e Dinheiro e baixa no aparelho. */
export async function baixarPlanilha() {
  const [produtos, vendas, lancamentos, modulo] = await Promise.all([
    carregarProdutosComSaldo(),
    buscarTudo<VendaBruta>((de, ate) =>
      supabase
        .from("vendas")
        .select("data, quantidade, valor_unitario, desconto, local_venda, produtos(nome, categoria, tamanho)")
        .order("data", { ascending: false })
        .order("id")
        .range(de, ate),
    ),
    buscarTudo<LancamentoBruto>((de, ate) =>
      supabase
        .from("lancamentos")
        .select("data, tipo, categoria, descricao, valor, venda_id")
        .order("data", { ascending: false })
        .order("id")
        .range(de, ate),
    ),
    import("exceljs"),
  ]);

  const Excel = (modulo as unknown as { default?: typeof modulo }).default ?? modulo;
  const wb = new Excel.Workbook();
  wb.creator = "Nós de Fibra";
  wb.created = new Date();

  const agora = new Date();
  const geradaEm = `${doisDigitos(agora.getDate())}/${doisDigitos(agora.getMonth() + 1)}/${agora.getFullYear()} às ${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}`;

  /* --- Aba Estoque --- */
  const estoque = [...produtos].sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria, "pt-BR") ||
      a.nome.localeCompare(b.nome, "pt-BR") ||
      (a.tamanho ?? "").localeCompare(b.tamanho ?? "", "pt-BR", { numeric: true }),
  );
  const ultE = Math.max(PRIMEIRA_LINHA, LINHA_CABECALHO + estoque.length);
  const totalPecas = estoque.reduce((s, p) => s + p.saldo, 0);
  const totalValorEstoque = estoque.reduce((s, p) => s + p.saldo * p.preco_venda, 0);

  montarFolha(wb, {
    nome: "Estoque",
    corAba: COR.terracota,
    subtitulo: "Ponto de Cultura  ·  Controle de Estoque do Ateliê",
    geradaEm,
    colunas: [
      { titulo: "Tipo", largura: 20, alinhar: "left" },
      { titulo: "Peça", largura: 52, alinhar: "left" },
      { titulo: "Tamanho", largura: 14 },
      { titulo: "Und", largura: 9 },
      { titulo: "Estoque", largura: 11, formato: "0" },
      { titulo: "Custo unitário", largura: 16, formato: REAIS },
      { titulo: "Preço unitário", largura: 16, formato: REAIS },
      { titulo: "Valor em estoque", largura: 18, formato: REAIS, calculada: true },
      { titulo: "Situação", largura: 16 },
    ],
    linhas: estoque.map((p, i) => {
      const r = PRIMEIRA_LINHA + i;
      return [
        p.categoria,
        p.nome,
        p.tamanho ?? "",
        rotuloUnidade(p.unidade, 1),
        p.saldo,
        p.custo_unit,
        p.preco_venda,
        { formula: `F${r}*H${r}`, result: p.saldo * p.preco_venda },
        situacao(p.saldo, p.estoque_minimo),
      ];
    }),
    cartoes: [
      { rotulo: "Produtos cadastrados", valor: estoque.length > 0 ? { formula: `COUNTA(C${PRIMEIRA_LINHA}:C${ultE})`, result: estoque.length } : 0, formato: "0" },
      { rotulo: "Peças em estoque", valor: estoque.length > 0 ? { formula: `SUM(F${PRIMEIRA_LINHA}:F${ultE})`, result: totalPecas } : 0, formato: "0" },
      { rotulo: "Valor em estoque (R$)", valor: estoque.length > 0 ? { formula: `SUM(I${PRIMEIRA_LINHA}:I${ultE})`, result: totalValorEstoque } : 0, formato: REAIS },
    ],
    totais:
      estoque.length > 0
        ? [
            "Total",
            null,
            null,
            null,
            { formula: `SUM(F${PRIMEIRA_LINHA}:F${ultE})`, result: totalPecas },
            null,
            null,
            { formula: `SUM(I${PRIMEIRA_LINHA}:I${ultE})`, result: totalValorEstoque },
            null,
          ]
        : undefined,
    destaque: (valor, coluna) => {
      if (coluna !== 8 || typeof valor !== "string") return undefined;
      const fundo = FUNDO_SITUACAO[valor];
      return fundo ? { fundo, negrito: true } : undefined;
    },
  });

  /* --- Aba Vendas --- */
  const ultV = Math.max(PRIMEIRA_LINHA, LINHA_CABECALHO + vendas.length);
  const somaVendido = vendas.reduce((s, v) => s + v.quantidade * v.valor_unitario - v.desconto, 0);
  const somaPecas = vendas.reduce((s, v) => s + v.quantidade, 0);

  montarFolha(wb, {
    nome: "Vendas",
    corAba: COR.oliva,
    subtitulo: "Ponto de Cultura  ·  Todas as vendas registradas",
    geradaEm,
    colunas: [
      { titulo: "Data", largura: 14, formato: "dd/mm/yyyy" },
      { titulo: "Tipo", largura: 20, alinhar: "left" },
      { titulo: "Peça", largura: 50, alinhar: "left" },
      { titulo: "Tamanho", largura: 14 },
      { titulo: "Qtde", largura: 10, formato: "0" },
      { titulo: "Valor unitário", largura: 16, formato: REAIS },
      { titulo: "Desconto", largura: 14, formato: REAIS },
      { titulo: "Total da venda", largura: 17, formato: REAIS, calculada: true },
      { titulo: "Local", largura: 20, alinhar: "left" },
    ],
    linhas: vendas.map((v, i) => {
      const r = PRIMEIRA_LINHA + i;
      return [
        dataExcel(v.data),
        v.produtos?.categoria ?? "",
        v.produtos?.nome ?? "(peça removida)",
        v.produtos?.tamanho ?? "",
        v.quantidade,
        v.valor_unitario,
        v.desconto,
        { formula: `F${r}*G${r}-H${r}`, result: v.quantidade * v.valor_unitario - v.desconto },
        v.local_venda ?? "",
      ];
    }),
    cartoes: [
      { rotulo: "Vendas feitas", valor: vendas.length > 0 ? { formula: `COUNTA(B${PRIMEIRA_LINHA}:B${ultV})`, result: vendas.length } : 0, formato: "0" },
      { rotulo: "Peças vendidas", valor: vendas.length > 0 ? { formula: `SUM(F${PRIMEIRA_LINHA}:F${ultV})`, result: somaPecas } : 0, formato: "0" },
      { rotulo: "Total vendido (R$)", valor: vendas.length > 0 ? { formula: `SUM(I${PRIMEIRA_LINHA}:I${ultV})`, result: somaVendido } : 0, formato: REAIS },
    ],
    totais:
      vendas.length > 0
        ? [
            "Total",
            null,
            null,
            null,
            { formula: `SUM(F${PRIMEIRA_LINHA}:F${ultV})`, result: somaPecas },
            null,
            null,
            { formula: `SUM(I${PRIMEIRA_LINHA}:I${ultV})`, result: somaVendido },
            null,
          ]
        : undefined,
  });

  /* --- Aba Dinheiro --- */
  const ultD = Math.max(PRIMEIRA_LINHA, LINHA_CABECALHO + lancamentos.length);
  const entrou = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const saiu = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const faixaC = `C${PRIMEIRA_LINHA}:C${ultD}`;
  const faixaF = `F${PRIMEIRA_LINHA}:F${ultD}`;
  const temD = lancamentos.length > 0;

  montarFolha(wb, {
    nome: "Dinheiro",
    corAba: COR.dourado,
    subtitulo: "Ponto de Cultura  ·  O que entrou e o que saiu",
    geradaEm,
    colunas: [
      { titulo: "Data", largura: 14, formato: "dd/mm/yyyy" },
      { titulo: "Movimento", largura: 14 },
      { titulo: "Categoria", largura: 18, alinhar: "left" },
      { titulo: "Descrição", largura: 52, alinhar: "left" },
      { titulo: "Valor", largura: 16, formato: REAIS },
      { titulo: "Origem", largura: 14 },
    ],
    linhas: lancamentos.map((l) => [
      dataExcel(l.data),
      l.tipo === "entrada" ? "Entrou" : "Saiu",
      l.categoria,
      l.descricao ?? "",
      l.valor,
      l.venda_id ? "Venda" : "Anotado",
    ]),
    cartoes: [
      { rotulo: "Entrou (R$)", valor: temD ? { formula: `SUMIF(${faixaC},"Entrou",${faixaF})`, result: entrou } : 0, formato: REAIS },
      { rotulo: "Saiu (R$)", valor: temD ? { formula: `SUMIF(${faixaC},"Saiu",${faixaF})`, result: saiu } : 0, formato: REAIS },
      {
        rotulo: "Sobrou (R$)",
        valor: temD
          ? { formula: `SUMIF(${faixaC},"Entrou",${faixaF})-SUMIF(${faixaC},"Saiu",${faixaF})`, result: entrou - saiu }
          : 0,
        formato: REAIS,
      },
    ],
    destaque: (valor, coluna) => {
      if (coluna !== 1) return undefined;
      if (valor === "Entrou") return { texto: COR.verdeTexto, negrito: true };
      if (valor === "Saiu") return { texto: COR.vermelhoTexto, negrito: true };
      return undefined;
    },
  });

  /* --- Baixar o arquivo --- */
  const buffer = await wb.xlsx.writeBuffer();
  const arquivo = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const nome = `Nos_de_Fibra_${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}.xlsx`;
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
