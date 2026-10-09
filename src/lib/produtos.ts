import { supabase } from "./supabase";
import type { Produto, ProdutoComSaldo } from "../types";

/** Busca as peças ativas junto com o saldo atual de cada uma. */
export async function carregarProdutosComSaldo(): Promise<ProdutoComSaldo[]> {
  const [prod, sal] = await Promise.all([
    supabase.from("produtos").select("*").eq("ativo", true).order("categoria").order("nome"),
    supabase.from("saldo_estoque").select("produto_id, saldo"),
  ]);
  if (prod.error || sal.error) throw new Error("falha ao carregar o estoque");

  const saldos = new Map((sal.data ?? []).map((x) => [x.produto_id, x.saldo] as [string, number]));
  return ((prod.data ?? []) as Produto[]).map((p) => ({ ...p, saldo: saldos.get(p.id) ?? 0 }));
}

export type GrupoTipo = {
  tipo: string;
  produtos: ProdutoComSaldo[];
  /** Soma dos saldos de todas as peças do tipo. */
  pecas: number;
  /** Quantas peças do tipo estão esgotadas ou com estoque baixo. */
  acabando: number;
};

/** Separa as peças por tipo (Pirex, Suplar, Caminho de mesa...), em ordem alfabética. */
export function agruparPorTipo(produtos: ProdutoComSaldo[]): GrupoTipo[] {
  const mapa = new Map<string, ProdutoComSaldo[]>();
  for (const p of produtos) mapa.set(p.categoria, [...(mapa.get(p.categoria) ?? []), p]);

  return Array.from(mapa.entries())
    .map(([tipo, lista]) => ({
      tipo,
      produtos: lista,
      pecas: lista.reduce((soma, p) => soma + p.saldo, 0),
      acabando: lista.filter((p) => p.saldo <= p.estoque_minimo).length,
    }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo, "pt-BR"));
}

export type GrupoModelo = { nome: string; itens: ProdutoComSaldo[] };

/** Dentro de um tipo, junta os tamanhos da mesma peça (mesmo nome) e põe os tamanhos em ordem. */
export function agruparPorModelo(produtos: ProdutoComSaldo[]): GrupoModelo[] {
  const mapa = new Map<string, ProdutoComSaldo[]>();
  for (const p of produtos) mapa.set(p.nome, [...(mapa.get(p.nome) ?? []), p]);

  return Array.from(mapa.entries())
    .map(([nome, itens]) => ({
      nome,
      itens: [...itens].sort((a, b) =>
        (a.tamanho ?? "").localeCompare(b.tamanho ?? "", "pt-BR", { numeric: true }),
      ),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
