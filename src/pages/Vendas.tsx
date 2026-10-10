import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatarData, formatarMoeda, intervaloDoMes, rotuloUnidade } from "../lib/formatar";
import SeletorMes from "../components/SeletorMes";
import CabecalhoPagina from "../components/CabecalhoPagina";

type VendaLinha = {
  id: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  valor_total: number;
  data: string;
  local_venda: string | null;
  produtos: { nome: string; tamanho: string | null; unidade: string } | null;
};

export default function Vendas() {
  const hoje = new Date();
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [vendas, setVendas] = useState<VendaLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [versao, setVersao] = useState(0);

  const [cancelando, setCancelando] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroCarga(false);
      const { inicio, fim } = intervaloDoMes(ref.ano, ref.mes);
      const { data, error } = await supabase
        .from("vendas")
        .select("id, quantidade, valor_unitario, desconto, valor_total, data, local_venda, produtos(nome, tamanho, unidade)")
        .gte("data", inicio)
        .lt("data", fim)
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false });
      if (!ativo) return;

      if (error) setErroCarga(true);
      else setVendas((data ?? []) as unknown as VendaLinha[]);
      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [ref.ano, ref.mes, versao]);

  const totais = useMemo(
    () => ({
      quantidade: vendas.length,
      valor: vendas.reduce((s, v) => s + v.valor_total, 0),
    }),
    [vendas],
  );

  function mudarMes(delta: number) {
    setCancelando(null);
    setErro(null);
    setRef((r) => {
      const d = new Date(r.ano, r.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  async function cancelar(id: string) {
    if (processando) return;
    setProcessando(true);
    setErro(null);
    const { error } = await supabase.rpc("cancelar_venda", { p_venda_id: id });
    setProcessando(false);
    setCancelando(null);
    if (error) {
      setErro("Não foi possível cancelar a venda. Confira a internet e tente de novo.");
      return;
    }
    setVersao((v) => v + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina icone="carrinho" titulo="Vendas feitas" texto="Ver as vendas e desfazer uma venda errada" cor="folha" />

      <SeletorMes ano={ref.ano} mes={ref.mes} onMudar={mudarMes} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="cartao px-6 py-5">
          <div className="text-lg">Vendas no mês</div>
          <div className="font-display text-3xl font-bold">{totais.quantidade}</div>
        </div>
        <div className="cartao px-6 py-5">
          <div className="text-lg">Vendeu</div>
          <div className="font-display text-3xl font-bold text-folha">{formatarMoeda(totais.valor)}</div>
        </div>
      </div>

      {erro && (
        <p role="alert" className="m-0 rounded-2xl bg-[#F0C3B6] px-5 py-3 text-xl font-bold text-[#7A2A12]">
          {erro}
        </p>
      )}

      <div className="cartao px-6 py-2">
        {carregando && <p className="text-xl font-bold">Carregando...</p>}
        {erroCarga && (
          <p role="alert" className="text-xl font-bold text-[#7A2A12]">
            Não foi possível carregar. Confira a internet e tente de novo.
          </p>
        )}
        {!carregando && !erroCarga && vendas.length === 0 && (
          <p className="text-xl font-bold">Nenhuma venda neste mês.</p>
        )}
        <ul className="m-0 list-none p-0">
          {vendas.map((v) => {
            const unidade = v.produtos ? rotuloUnidade(v.produtos.unidade, v.quantidade) : "";
            return (
              <li key={v.id} className="flex flex-col gap-3 border-t-2 border-areia-escura py-4 first:border-t-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xl font-bold">
                      {v.produtos?.nome ?? "Peça removida"}
                      {v.produtos?.tamanho ? ` · ${v.produtos.tamanho}` : ""}
                    </div>
                    <div className="text-base opacity-75">
                      {v.quantidade} {unidade} × {formatarMoeda(v.valor_unitario)}
                      {v.desconto > 0 ? ` · desconto ${formatarMoeda(v.desconto)}` : ""}
                    </div>
                    <div className="text-base opacity-75">
                      {formatarData(v.data)}
                      {v.local_venda ? ` · ${v.local_venda}` : ""}
                    </div>
                  </div>
                  <span className="text-xl font-extrabold text-folha">{formatarMoeda(v.valor_total)}</span>
                </div>

                {cancelando === v.id ? (
                  <div className="flex flex-col gap-3 rounded-2xl bg-terracota-clara p-4">
                    <p className="m-0 text-lg font-bold">
                      Cancelar esta venda? A peça volta para o estoque e o dinheiro sai da lista do Dinheiro.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => cancelar(v.id)}
                        disabled={processando}
                        className="cursor-pointer rounded-xl border-0 bg-terracota px-5 py-3 text-lg font-bold text-white disabled:opacity-60"
                      >
                        {processando ? "Cancelando..." : "Sim, cancelar"}
                      </button>
                      <button
                        onClick={() => setCancelando(null)}
                        disabled={processando}
                        className="cursor-pointer rounded-xl border-2 border-folha bg-transparent px-5 py-3 text-lg font-bold text-folha"
                      >
                        Não
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCancelando(v.id);
                      setErro(null);
                    }}
                    className="cursor-pointer self-start rounded-lg border-2 border-areia-escura bg-transparent px-4 py-2 text-base font-bold text-tinta"
                  >
                    Cancelar venda
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Link to="/vender" className="self-start text-lg font-bold text-folha">
        ‹ Voltar para Vender
      </Link>
    </div>
  );
}
