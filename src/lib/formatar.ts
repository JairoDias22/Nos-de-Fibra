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
