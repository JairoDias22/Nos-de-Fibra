import type { CellValue, Workbook, Worksheet } from "exceljs";
import { supabase } from "./supabase";
import { carregarProdutosComSaldo } from "./produtos";
import type { ProdutoComSaldo } from "../types";

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
  rod.value = "Feito à mão, com carinho  ·  Cópia gerada pelo sistema Nós de Fibra.";
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
  produto_id: string;
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

function doisDigitos(n: number) {
  return String(n).padStart(2, "0");
}

/* ---------- Aba "Lista de estoque" (cópia fiel da planilha original) ---------- */

const LISTA_PRIMEIRA = 9;
const LISTA_CABECALHO = 8;
const LINHAS_RESERVA = 13; // linhas vazias com as contas prontas, como na planilha original

function fundoSolido(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } };
}

function montarListaDeEstoque(
  wb: Workbook,
  produtos: ProdutoComSaldo[],
  vendas: VendaBruta[],
  geradaEm: string,
) {
  // Quanto cada peça já vendeu e quando saiu a última venda
  const porPeca = new Map<string, { qtd: number; ultima: string }>();
  for (const v of vendas) {
    const atual = porPeca.get(v.produto_id);
    porPeca.set(v.produto_id, {
      qtd: (atual?.qtd ?? 0) + v.quantidade,
      ultima: atual && atual.ultima > v.data ? atual.ultima : v.data,
    });
  }

  const ordenados = [...produtos].sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria, "pt-BR") ||
      a.nome.localeCompare(b.nome, "pt-BR") ||
      (a.tamanho ?? "").localeCompare(b.tamanho ?? "", "pt-BR", { numeric: true }),
  );

  // Qtde = tudo que já entrou; QTDE Vendida = tudo que já saiu em venda; Saldo = Qtde − Vendida
  const itens = ordenados.map((p) => {
    const vendida = porPeca.get(p.id)?.qtd ?? 0;
    const qtde = p.saldo + vendida;
    return {
      nome: p.nome,
      tamanho: p.tamanho,
      und: p.unidade === "par" ? (qtde === 1 ? "par" : "pares") : "und",
      qtde,
      compra: p.custo_unit === null ? null : Math.round(p.custo_unit * qtde * 100) / 100,
      preco: p.preco_venda,
      saida: porPeca.get(p.id)?.ultima ?? null,
      vendida: vendida > 0 ? vendida : null,
    };
  });

  const fim = Math.max(77, LISTA_CABECALHO + itens.length + LINHAS_RESERVA);
  const rodape = fim + 2;
  const LIMIAR = 2;

  const ws = wb.addWorksheet("Lista de estoque", {
    properties: { tabColor: { argb: COR.terracota } },
    views: [{ showGridLines: false, zoomScale: 80, zoomScaleNormal: 80 }],
  });

  [3, 59.3, 14, 11, 10, 18.3, 15, 16, 14, 12, 16, 13, 16, 3].forEach((l, i) => {
    ws.getColumn(i + 1).width = l;
  });

  // Fundo creme em tudo
  for (let r = 1; r <= rodape; r++) {
    for (let c = 1; c <= 14; c++) ws.getCell(r, c).fill = fundoSolido(COR.creme);
  }

  // Quando a planilha foi gerada
  ws.mergeCells("B1:M1");
  const gerada = ws.getCell("B1");
  gerada.value = `Planilha gerada em ${geradaEm}`;
  gerada.font = { name: "Georgia", size: 9, italic: true, color: { argb: COR.dourado } };
  gerada.alignment = { horizontal: "right", vertical: "middle" };

  // Título, subtítulo e pontilhado
  ws.mergeCells("B2:M2");
  const titulo = ws.getCell("B2");
  titulo.value = "✦  Nós de Fibra  ✦";
  titulo.font = { name: "Georgia", size: 30, bold: true, color: { argb: COR.terracota } };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 45.75;

  ws.mergeCells("B3:M3");
  const sub = ws.getCell("B3");
  sub.value = "Ponto de Cultura  ·  Controle de Estoque e Vendas do Ateliê";
  sub.font = { name: "Georgia", size: 13, color: { argb: COR.marrom } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 16.5;

  ws.mergeCells("B4:M4");
  const pontos = ws.getCell("B4");
  pontos.value = "· ".repeat(50);
  pontos.font = { name: "Georgia", size: 10, color: { argb: COR.dourado } };
  pontos.alignment = { horizontal: "center" };

  // Cartões de resumo (linhas 5 e 6), com as mesmas contas da original
  const primeiraFaixa = (col: string) => `${col}${LISTA_PRIMEIRA}:${col}${fim}`;
  const qtdPecas = itens.reduce((t, i) => t + i.qtde - (i.vendida ?? 0), 0);
  const valorTudo = itens.reduce((t, i) => t + i.qtde * i.preco, 0);
  const valorVendido = itens.reduce((t, i) => t + (i.vendida ?? 0) * i.preco, 0);

  const cartoes: { de: string; ate: string; rotulo: string; valor: CellValue; formato: string }[] = [
    { de: "B", ate: "B", rotulo: "Produtos cadastrados", valor: { formula: `COUNTA(${primeiraFaixa("B")})`, result: itens.length }, formato: "0" },
    { de: "C", ate: "F", rotulo: "Peças em estoque", valor: { formula: `SUM(${primeiraFaixa("L")})`, result: qtdPecas }, formato: "0" },
    { de: "G", ate: "J", rotulo: "Valor em estoque (R$)", valor: { formula: `SUM(${primeiraFaixa("H")})-SUM(${primeiraFaixa("K")})`, result: valorTudo - valorVendido }, formato: REAIS },
    { de: "K", ate: "M", rotulo: "Total vendido (R$)", valor: { formula: `SUM(${primeiraFaixa("K")})`, result: valorVendido }, formato: REAIS },
  ];
  for (const c of cartoes) {
    if (c.de !== c.ate) {
      ws.mergeCells(`${c.de}5:${c.ate}5`);
      ws.mergeCells(`${c.de}6:${c.ate}6`);
    }
    const rot = ws.getCell(`${c.de}5`);
    rot.value = c.rotulo;
    rot.font = { name: "Georgia", size: 10, bold: true, color: { argb: COR.branco } };
    rot.fill = fundoSolido(COR.oliva);
    rot.alignment = { horizontal: "center", vertical: "middle" };
    rot.border = { top: { style: "thin", color: { argb: COR.dourado } } };

    const val = ws.getCell(`${c.de}6`);
    val.value = c.valor;
    val.numFmt = c.formato;
    val.font = { name: "Georgia", size: 18, bold: true, color: { argb: COR.marrom } };
    val.fill = fundoSolido(COR.cremeClaro);
    val.alignment = { horizontal: "center", vertical: "middle" };
    val.border = { bottom: { style: "thin", color: { argb: COR.dourado } } };
  }
  ws.getRow(5).height = 19.5;
  ws.getRow(6).height = 33.75;

  // Linha 7: dica e limite de "estoque baixo" (a célula M7 pode ser mudada)
  ws.mergeCells("B7:J7");
  const dica = ws.getCell("B7");
  dica.value = "Preencha as células claras · as células cor de areia calculam sozinhas  ✎";
  dica.font = { name: "Calibri", size: 10, italic: true, color: { argb: COR.marrom } };
  dica.alignment = { vertical: "middle" };

  ws.mergeCells("K7:L7");
  const rotLimite = ws.getCell("K7");
  rotLimite.value = "Alerta de estoque baixo (≤):";
  rotLimite.font = { name: "Calibri", size: 10, bold: true, color: { argb: COR.marrom } };
  rotLimite.alignment = { horizontal: "right", vertical: "middle" };

  const limite = ws.getCell("M7");
  limite.value = LIMIAR;
  limite.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0000FF" } };
  limite.fill = fundoSolido(COR.branco);
  limite.alignment = { horizontal: "center", vertical: "middle" };
  const fio = { style: "thin" as const, color: { argb: COR.dourado } };
  limite.border = { top: fio, bottom: fio, left: fio, right: fio };
  limite.note = 'Quando o saldo de um produto for igual ou menor que este número, a situação muda para "Estoque baixo". Pode alterar.';
  ws.getRow(7).height = 21.75;

  // Cabeçalho da tabela (linha 8)
  const titulos = ["Produto", "Tamanho", "Und", "Qtde", "Valor/compra", "Preço unitário", "Valor total", "Data Saída", "QTDE Vendida", "Valor da Venda", "Saldo em estoque", "Situação"];
  titulos.forEach((t, i) => {
    const cel = ws.getCell(LISTA_CABECALHO, i + 2);
    cel.value = t;
    cel.font = { name: "Georgia", size: 11, bold: true, color: { argb: COR.branco } };
    cel.fill = fundoSolido(COR.terracota);
    cel.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle", wrapText: true };
    cel.border = { bottom: { style: "medium", color: { argb: COR.marrom } } };
  });
  ws.getCell("F8").note = "Quanto você pagou por unidade ao comprar o produto (custo).";
  ws.getCell("G8").note = "Preço de venda de cada unidade.";
  ws.getRow(LISTA_CABECALHO).height = 31.5;

  // Linhas de produtos e linhas vazias com as contas prontas (até a linha `fim`)
  const formatos: (string | undefined)[] = [undefined, undefined, undefined, "0", REAIS, REAIS, REAIS, "mm-dd-yy", "0", REAIS, "0", undefined];
  const alinhar: ("left" | "center")[] = ["left", "center", "center", "center", "center", "center", "center", "center", "center", "center", "center", "center"];
  const calculada = [false, false, false, false, false, false, true, false, false, true, true, true];
  const negrito = [false, false, false, false, false, false, true, false, false, true, false, false];

  for (let r = LISTA_PRIMEIRA; r <= fim; r++) {
    const item = itens[r - LISTA_PRIMEIRA];
    const faixa = (r - LISTA_PRIMEIRA) % 2 === 0 ? COR.cremeClaro : COR.creme;
    ws.getRow(r).height = 21;

    const e = item?.qtde;
    const j = item?.vendida ?? null;
    const saldo = item && e !== undefined ? e - (j ?? 0) : null;
    const valores: CellValue[] = [
      item?.nome ?? null,
      item?.tamanho ?? null,
      item?.und ?? null,
      e ?? null,
      item?.compra ?? null,
      item?.preco ?? null,
      { formula: `IF(OR(E${r}="",G${r}=""),"",E${r}*G${r})`, result: item ? item.qtde * item.preco : "" },
      item?.saida ? dataExcel(item.saida) : null,
      j,
      { formula: `IF(OR(J${r}="",G${r}=""),"",J${r}*G${r})`, result: item && j !== null ? j * item.preco : "" },
      { formula: `IF(E${r}="","",E${r}-N(J${r}))`, result: saldo ?? "" },
      {
        formula: `IF(OR(B${r}="",E${r}=""),"",IF(L${r}<=0,"Esgotado",IF(L${r}<=$M$7,"Estoque baixo","Disponível")))`,
        result: item && saldo !== null ? (saldo <= 0 ? "Esgotado" : saldo <= LIMIAR ? "Estoque baixo" : "Disponível") : "",
      },
    ];

    valores.forEach((v, i) => {
      const cel = ws.getCell(r, i + 2);
      cel.value = v;
      const f = formatos[i];
      if (f) cel.numFmt = f;
      cel.fill = fundoSolido(calculada[i] ? COR.areia : faixa);
      cel.font = { name: "Calibri", size: 11, bold: negrito[i], color: { argb: COR.marrom } };
      cel.alignment = { horizontal: alinhar[i], vertical: "middle" };
      cel.border = { bottom: { style: "hair", color: { argb: COR.dourado } } };
    });

    // Regras de preenchimento (as mesmas da planilha original)
    ws.getCell(r, 4).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"und,par,pares,kit"'],
      showErrorMessage: true,
      error: "Escolha uma unidade da lista.",
    };
    ws.getCell(r, 5).dataValidation = {
      type: "whole",
      operator: "greaterThanOrEqual",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Quantidade",
      error: "Digite um número inteiro (0 ou mais).",
    };
    ws.getCell(r, 6).dataValidation = {
      type: "decimal",
      operator: "greaterThanOrEqual",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Valor de compra",
      error: "Digite apenas o valor, ex.: 25 ou 25,50.",
    };
    ws.getCell(r, 7).dataValidation = {
      type: "decimal",
      operator: "greaterThanOrEqual",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Preço",
      error: "Digite apenas o valor, ex.: 25 ou 25,50.",
    };
    ws.getCell(r, 9).dataValidation = {
      type: "date",
      operator: "greaterThan",
      allowBlank: true,
      formulae: [new Date(Date.UTC(2000, 0, 1))],
      showErrorMessage: true,
      errorTitle: "Data",
      error: "Digite uma data, ex.: 15/10/2026.",
    };
    ws.getCell(r, 10).dataValidation = {
      type: "custom",
      allowBlank: true,
      formulae: [`AND(ISNUMBER(J${r}),J${r}>=0,J${r}<=E${r})`],
      showErrorMessage: true,
      errorTitle: "QTDE Vendida",
      error: "A quantidade vendida não pode ser maior que a QTDE em estoque.",
    };
  }

  // Cores da coluna Situação (Disponível, Estoque baixo, Esgotado)
  ws.addConditionalFormatting({
    ref: `M${LISTA_PRIMEIRA}:M${fim}`,
    rules: [
      {
        type: "expression",
        priority: 2,
        formulae: [`$M${LISTA_PRIMEIRA}="Disponível"`],
        style: { font: { bold: true, color: { argb: "FF3E5A1F" } }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFDCE5C8" } } },
      },
      {
        type: "expression",
        priority: 3,
        formulae: [`$M${LISTA_PRIMEIRA}="Estoque baixo"`],
        style: { font: { bold: true, color: { argb: "FF7A5300" } }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFF5DFA6" } } },
      },
      {
        type: "expression",
        priority: 4,
        formulae: [`$M${LISTA_PRIMEIRA}="Esgotado"`],
        style: { font: { bold: true, color: { argb: "FF8A2B12" } }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFEBC0B3" } } },
      },
    ],
  });

  // Rodapé
  ws.mergeCells(`B${rodape}:M${rodape}`);
  const rod = ws.getCell(`B${rodape}`);
  rod.value = "Feito à mão, com carinho  ·  Para novos produtos, preencha a próxima linha vazia: as contas aparecem sozinhas.";
  rod.font = { name: "Georgia", size: 10, italic: true, color: { argb: COR.terracota } };
  rod.alignment = { horizontal: "center" };

  // Filtro e impressão, como na original
  ws.autoFilter = { from: { row: LISTA_CABECALHO, column: 2 }, to: { row: fim, column: 13 } };
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${LISTA_CABECALHO}:${LISTA_CABECALHO}`,
    printArea: `A1:N${rodape}`,
  };
}

/* ---------- Função principal ---------- */

/** Monta o Excel com as abas Estoque, Vendas e Dinheiro e baixa no aparelho. */
export async function baixarPlanilha() {
  const [produtos, vendas, lancamentos, modulo] = await Promise.all([
    carregarProdutosComSaldo(),
    buscarTudo<VendaBruta>((de, ate) =>
      supabase
        .from("vendas")
        .select("produto_id, data, quantidade, valor_unitario, desconto, local_venda, produtos(nome, categoria, tamanho)")
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

  /* --- Aba "Lista de estoque": igual à planilha original do ateliê --- */
  montarListaDeEstoque(wb, produtos, vendas, geradaEm);

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
