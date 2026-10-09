export type Produto = {
  id: string;
  nome: string;
  categoria: string;
  tamanho: string | null;
  unidade: string;
  preco_venda: number;
  custo_unit: number | null;
  estoque_minimo: number;
  foto_url: string | null;
  ativo: boolean;
};

export type ProdutoComSaldo = Produto & { saldo: number };

export type Lancamento = {
  id: string;
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  venda_id: string | null;
};
