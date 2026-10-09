import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { carregarProdutosComSaldo } from "../lib/produtos";
import { formatarMoeda, hojeISO, lerValor, normalizar, rotuloUnidade } from "../lib/formatar";
import type { ProdutoComSaldo } from "../types";

const LOCAIS = ["Na loja", "Feira", "Encomenda"];

const campo =
  "w-full rounded-2xl border-2 border-transparent bg-white px-5 py-4 text-xl outline-none focus:border-folha";

export default function Vender() {
  const [produtos, setProdutos] = useState<ProdutoComSaldo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [busca, setBusca] = useState("");

  const [escolhido, setEscolhido] = useState<ProdutoComSaldo | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [preco, setPreco] = useState("");
  const [desconto, setDesconto] = useState("");
  const [data, setData] = useState(hojeISO());
  const [local, setLocal] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [vendido, setVendido] = useState<{ nome: string; total: number } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErroCarga(false);
    try {
      setProdutos(await carregarProdutosComSaldo());
    } catch {
      setErroCarga(true);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const disponiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return produtos.filter(
      (p) =>
        p.saldo > 0 &&
        (!termo || normalizar(`${p.nome} ${p.categoria} ${p.tamanho ?? ""}`).includes(termo)),
    );
  }, [produtos, busca]);

  const valorPreco = lerValor(preco);
  const valorDesconto = desconto.trim() === "" ? 0 : lerValor(desconto);
  const total = quantidade * valorPreco - valorDesconto;
  const valoresOk =
    Number.isFinite(valorPreco) && valorPreco > 0 && Number.isFinite(valorDesconto) && valorDesconto >= 0 && total > 0;

  function escolher(p: ProdutoComSaldo) {
    setEscolhido(p);
    setQuantidade(1);
    setPreco(String(p.preco_venda).replace(".", ","));
    setDesconto("");
    setLocal("");
    setData(hojeISO());
    setErro(null);
  }

  function limpar() {
    setEscolhido(null);
    setVendido(null);
    setBusca("");
    setErro(null);
  }

  async function registrar() {
    if (!escolhido || !valoresOk || salvando) return;
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.rpc("registrar_venda", {
      p_produto_id: escolhido.id,
      p_quantidade: quantidade,
      p_valor_unitario: valorPreco,
      p_desconto: valorDesconto,
      p_data: data,
      p_local: local,
    });

    setSalvando(false);
    if (error) {
      setErro(
        error.message.includes("Estoque insuficiente")
          ? "Não tem mais essa quantidade no estoque. Atualize a tela e confira."
          : "Não foi possível registrar a venda. Confira a internet e tente de novo.",
      );
      return;
    }

    setVendido({ nome: escolhido.nome, total });
    await carregar();
  }

  /* ---------- Tela de sucesso ---------- */
  if (vendido) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="m-0 font-display text-4xl font-bold md:text-5xl">Venda registrada!</h1>
        <div className="rounded-3xl bg-white p-7">
          <p className="m-0 text-2xl font-bold">{vendido.nome}</p>
          <p className="mb-0 mt-2 font-display text-4xl font-bold text-folha">
            {formatarMoeda(vendido.total)}
          </p>
          <p className="mb-0 mt-3 text-xl">O estoque e o dinheiro já foram atualizados.</p>
        </div>
        <button
          onClick={limpar}
          className="cursor-pointer rounded-2xl border-0 bg-folha px-6 py-5 text-2xl font-extrabold text-white"
        >
          Registrar outra venda
        </button>
        <Link
          to="/"
          className="rounded-2xl border-2 border-folha px-6 py-4 text-center text-xl font-bold text-folha no-underline"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  /* ---------- Passo 2: detalhes da venda ---------- */
  if (escolhido) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="m-0 font-display text-4xl font-bold md:text-5xl">Vender</h1>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-6 py-5">
          <div>
            <div className="text-2xl font-bold">{escolhido.nome}</div>
            <div className="text-lg opacity-75">
              {[escolhido.tamanho, `${escolhido.saldo} ${rotuloUnidade(escolhido.unidade, escolhido.saldo)} no estoque`]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <button
            onClick={() => setEscolhido(null)}
            className="cursor-pointer rounded-xl border-2 border-folha bg-transparent px-4 py-2 text-lg font-bold text-folha"
          >
            Trocar peça
          </button>
        </div>

        <div className="rounded-3xl bg-white px-6 py-5">
          <div className="mb-3 text-xl font-bold">Quantas?</div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              disabled={quantidade <= 1}
              aria-label="Diminuir quantidade"
              className="size-16 cursor-pointer rounded-2xl border-0 bg-areia-escura text-4xl font-extrabold disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-12 text-center font-display text-5xl font-bold">{quantidade}</span>
            <button
              onClick={() => setQuantidade((q) => Math.min(escolhido.saldo, q + 1))}
              disabled={quantidade >= escolhido.saldo}
              aria-label="Aumentar quantidade"
              className="size-16 cursor-pointer rounded-2xl border-0 bg-folha text-4xl font-extrabold text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xl font-bold">
            Preço de cada (R$)
            <input
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-2 text-xl font-bold">
            Desconto (R$, se tiver)
            <input
              inputMode="decimal"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              placeholder="0"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-2 text-xl font-bold">
            Data da venda
            <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} className={campo} />
          </label>
          <div className="flex flex-col gap-2 text-xl font-bold">
            Onde vendeu?
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Opcional"
              className={campo}
            />
            <div className="flex flex-wrap gap-2">
              {LOCAIS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocal(l)}
                  className={`cursor-pointer rounded-full border-2 px-4 py-1.5 text-base font-bold ${
                    local === l ? "border-folha bg-folha text-white" : "border-folha bg-transparent text-folha"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-folha px-6 py-5 text-white">
          <div className="text-xl">Total da venda</div>
          <div className="font-display text-5xl font-bold">
            {valoresOk ? formatarMoeda(total) : "—"}
          </div>
        </div>

        {erro && (
          <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
            {erro}
          </p>
        )}

        <button
          onClick={registrar}
          disabled={!valoresOk || salvando}
          className="cursor-pointer rounded-2xl border-0 bg-ouro px-6 py-5 text-2xl font-extrabold text-tinta disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? "Registrando..." : "Registrar venda"}
        </button>
      </div>
    );
  }

  /* ---------- Passo 1: escolher a peça ---------- */
  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 font-display text-4xl font-bold md:text-5xl">Vender</h1>
      <p className="m-0 text-xl md:text-2xl">Qual peça foi vendida?</p>

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar peça pelo nome..."
        aria-label="Buscar peça pelo nome"
        className={campo}
      />

      <div className="rounded-3xl bg-white px-6 py-2">
        {carregando && <p className="text-xl font-bold">Carregando...</p>}
        {erroCarga && (
          <p role="alert" className="text-xl font-bold text-[#7A2A12]">
            Não foi possível carregar as peças. Confira a internet e tente de novo.
          </p>
        )}
        {!carregando && !erroCarga && disponiveis.length === 0 && (
          <p className="text-xl font-bold">Nenhuma peça disponível encontrada.</p>
        )}
        <ul className="m-0 list-none p-0">
          {disponiveis.map((p) => (
            <li key={p.id} className="border-t-2 border-areia-escura first:border-t-0">
              <button
                onClick={() => escolher(p)}
                className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 border-0 bg-transparent py-4 text-left text-tinta"
              >
                <span className="min-w-0">
                  <span className="block text-xl font-bold">{p.nome}</span>
                  <span className="block text-base opacity-75">
                    {[p.tamanho, formatarMoeda(p.preco_venda)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-lg font-bold text-folha">
                  {p.saldo} {rotuloUnidade(p.unidade, p.saldo)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
