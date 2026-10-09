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
