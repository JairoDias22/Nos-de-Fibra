const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(valor: number) {
  return moeda.format(valor);
}

export function rotuloUnidade(unidade: string, quantidade: number) {
  if (unidade === "par") return quantidade === 1 ? "par" : "pares";
  return "unid.";
}

/** Tira acentos e deixa em minúsculas, para a busca achar "suplá" digitando "supla". */
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Data de hoje no formato AAAA-MM-DD, usando o dia do computador (não o do servidor). */
export function hojeISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Aceita "25", "25,50" ou "25.50" e devolve um número (ou NaN). */
export function lerValor(texto: string) {
  return Number(texto.trim().replace(",", "."));
}

/** Transforma 2026-10-08 em 08/10/2026 sem mexer com fuso horário. */
export function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function dois(n: number) {
  return String(n).padStart(2, "0");
}

/** Primeiro dia do mês e primeiro dia do mês seguinte (AAAA-MM-DD). O mês vai de 0 a 11. */
export function intervaloDoMes(ano: number, mes: number) {
  const inicio = `${ano}-${dois(mes + 1)}-01`;
  const fim = mes === 11 ? `${ano + 1}-01-01` : `${ano}-${dois(mes + 2)}-01`;
  return { inicio, fim };
}

/** Ex.: "Outubro de 2026". */
export function nomeDoMes(ano: number, mes: number) {
  const texto = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(ano, mes, 1),
  );
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
