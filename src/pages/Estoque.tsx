import { useEffect, useMemo, useState } from "react";
import { carregarProdutosComSaldo } from "../lib/produtos";
import { formatarMoeda, normalizar, rotuloUnidade } from "../lib/formatar";
import type { ProdutoComSaldo } from "../types";

function situacao(p: ProdutoComSaldo) {
  if (p.saldo <= 0) return { rotulo: "Esgotado", cor: "bg-[#F0C3B6] text-[#7A2A12]" };
  if (p.saldo <= p.estoque_minimo) return { rotulo: "Estoque baixo", cor: "bg-[#F6D98A] text-[#4A3500]" };
  return { rotulo: "Disponível", cor: "bg-[#CFE5CF] text-[#1F4A2A]" };
}

export default function Estoque() {
  const [produtos, setProdutos] = useState<ProdutoComSaldo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const lista = await carregarProdutosComSaldo();
        if (ativo) setProdutos(lista);
      } catch {
        if (ativo) setErro("Não foi possível carregar o estoque. Confira a internet e tente de novo.");
      }
      if (ativo) setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const resumo = useMemo(
    () => ({
      produtos: produtos.length,
      pecas: produtos.reduce((soma, p) => soma + p.saldo, 0),
      valor: produtos.reduce((soma, p) => soma + p.saldo * p.preco_venda, 0),
    }),
    [produtos],
  );

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return produtos;
    return produtos.filter((p) =>
      normalizar(`${p.nome} ${p.categoria} ${p.tamanho ?? ""}`).includes(termo),
    );
  }, [produtos, busca]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 font-display text-4xl font-bold md:text-5xl">Estoque</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Produtos cadastrados", String(resumo.produtos)],
          ["Peças em estoque", String(resumo.pecas)],
          ["Valor em estoque", formatarMoeda(resumo.valor)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-3xl bg-white px-6 py-5">
            <div className="text-lg">{rotulo}</div>
            <div className="font-display text-3xl font-bold text-folha">{valor}</div>
          </div>
        ))}
      </div>

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar peça pelo nome..."
        aria-label="Buscar peça pelo nome"
        className="w-full rounded-2xl border-2 border-transparent bg-white px-5 py-4 text-xl outline-none focus:border-folha"
      />

      <div className="rounded-3xl bg-white px-6 py-2">
        {carregando && <p className="text-xl font-bold">Carregando...</p>}
        {erro && <p role="alert" className="text-xl font-bold text-[#7A2A12]">{erro}</p>}
        {!carregando && !erro && filtrados.length === 0 && (
          <p className="text-xl font-bold">Nenhuma peça encontrada.</p>
        )}
        <ul className="m-0 list-none p-0">
          {filtrados.map((p) => {
            const s = situacao(p);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-areia-escura py-4 first:border-t-0"
              >
                <div className="min-w-0">
                  <div className="text-xl font-bold">{p.nome}</div>
                  <div className="text-base opacity-75">
                    {[p.tamanho, formatarMoeda(p.preco_venda)].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold">
                    {p.saldo} {rotuloUnidade(p.unidade, p.saldo)}
                  </span>
                  <span className={`rounded-full px-4 py-1.5 text-base font-extrabold ${s.cor}`}>
                    {s.rotulo}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
