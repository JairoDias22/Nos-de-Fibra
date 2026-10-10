import { nomeDoMes } from "./formatar";

export type Periodo = "dia" | "semana" | "mes" | "ano";

const pt = "pt-BR";

function dois(n: number) {
  return String(n).padStart(2, "0");
}

function maiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function somarDias(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Data do computador no formato AAAA-MM-DD, sem passar pelo fuso UTC (para não trocar o dia). */
export function paraISO(d: Date) {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** Começo (incluído) e fim (não incluído) do período que contém a data. A semana vai de segunda a domingo. */
export function intervaloDoPeriodo(periodo: Periodo, ancora: Date): { inicio: Date; fim: Date } {
  const a = new Date(ancora.getFullYear(), ancora.getMonth(), ancora.getDate());
  switch (periodo) {
    case "dia":
      return { inicio: a, fim: somarDias(a, 1) };
    case "semana": {
      const segunda = somarDias(a, -((a.getDay() + 6) % 7));
      return { inicio: segunda, fim: somarDias(segunda, 7) };
    }
    case "mes":
      return { inicio: new Date(a.getFullYear(), a.getMonth(), 1), fim: new Date(a.getFullYear(), a.getMonth() + 1, 1) };
    case "ano":
      return { inicio: new Date(a.getFullYear(), 0, 1), fim: new Date(a.getFullYear() + 1, 0, 1) };
  }
}

/** Anda para o período anterior (delta = -1) ou seguinte (delta = 1). */
export function moverPeriodo(periodo: Periodo, ancora: Date, delta: number): Date {
  switch (periodo) {
    case "dia":
      return somarDias(ancora, delta);
    case "semana":
      return somarDias(ancora, 7 * delta);
    case "mes":
      return new Date(ancora.getFullYear(), ancora.getMonth() + delta, 1);
    case "ano":
      return new Date(ancora.getFullYear() + delta, 0, 1);
  }
}

/** Texto do período para mostrar na tela. Ex.: «Outubro de 2026» ou «5 a 11 de out de 2026». */
export function tituloDoPeriodo(periodo: Periodo, ancora: Date): string {
  const { inicio, fim } = intervaloDoPeriodo(periodo, ancora);
  switch (periodo) {
    case "dia":
      return maiuscula(
        new Intl.DateTimeFormat(pt, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(inicio),
      );
    case "semana": {
      const ultimo = somarDias(fim, -1);
      const curto = new Intl.DateTimeFormat(pt, { day: "numeric", month: "short" });
      const fimTexto = curto.format(ultimo).replace(/\./g, "");
      const inicioTexto =
        inicio.getMonth() === ultimo.getMonth() ? String(inicio.getDate()) : curto.format(inicio).replace(/\./g, "");
      return `${inicioTexto} a ${fimTexto} de ${ultimo.getFullYear()}`;
    }
    case "mes":
      return nomeDoMes(inicio.getFullYear(), inicio.getMonth());
    case "ano":
      return String(inicio.getFullYear());
  }
}

export function diaSemanaCurto(d: Date) {
  return maiuscula(new Intl.DateTimeFormat(pt, { weekday: "short" }).format(d).replace(".", ""));
}

export function mesCurto(d: Date) {
  return maiuscula(new Intl.DateTimeFormat(pt, { month: "short" }).format(d).replace(".", ""));
}

/** Ex.: «Segunda-feira, 12 de outubro». */
export function dataPorExtenso(d: Date) {
  return maiuscula(new Intl.DateTimeFormat(pt, { weekday: "long", day: "numeric", month: "long" }).format(d));
}

export function mesPorExtenso(d: Date) {
  return nomeDoMes(d.getFullYear(), d.getMonth());
}

export const comparacao: Record<Periodo, string> = {
  dia: "ao dia anterior",
  semana: "à semana anterior",
  mes: "ao mês anterior",
  ano: "ao ano anterior",
};

export const semVendasAnterior: Record<Periodo, string> = {
  dia: "no dia anterior",
  semana: "na semana anterior",
  mes: "no mês anterior",
  ano: "no ano anterior",
};
