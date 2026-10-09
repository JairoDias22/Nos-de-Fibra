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
