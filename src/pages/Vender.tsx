import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { agruparPorModelo, agruparPorTipo, carregarProdutosComSaldo } from "../lib/produtos";
import {
  formatarMoeda,
  hojeISO,
  lerValor,
  nomeSemTipo,
  normalizar,
  rotuloUnidade,
} from "../lib/formatar";
import CabecalhoPagina from "../components/CabecalhoPagina";
import type { ProdutoComSaldo } from "../types";

const LOCAIS = ["Na loja", "Feira", "Encomenda"];

const campo =
  "w-full rounded-2xl border-2 border-transparent bg-white px-5 py-4 text-xl outline-none focus:border-folha";

const botaoVoltar =
  "cursor-pointer self-start rounded-xl border-2 border-folha bg-transparent px-4 py-2 text-lg font-bold text-folha";

/** Mostra em que passo da venda a pessoa está: 1 Tipo, 2 Peça, 3 Venda. */
function Passos({ atual }: { atual: 1 | 2 | 3 }) {
  const nomes = ["Tipo", "Peça", "Venda"];
  return (
    <ol aria-label="Passos da venda" className="m-0 flex list-none items-center gap-2 p-0">
      {nomes.map((nome, i) => {
        const n = i + 1;
        const ativo = n === atual;
        const feito = n < atual;
        return (
          <li key={nome} aria-current={ativo ? "step" : undefined} className="flex items-center gap-2">
            <span
              className={`flex size-9 items-center justify-center rounded-full text-lg font-extrabold ${
                ativo ? "bg-ouro text-tinta" : feito ? "bg-folha text-white" : "bg-areia-escura text-tinta"
              }`}
            >
              {feito ? "✓" : n}
            </span>
            <span className={`text-lg ${ativo ? "font-extrabold" : "opacity-70"}`}>{nome}</span>
            {n < 3 && <span className="mx-1 h-0.5 w-6 bg-areia-escura" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function Vender() {
  const [params, setParams] = useSearchParams();
  const tipo = params.get("tipo");
  const pecaId = params.get("peca");

  const [produtos, setProdutos] = useState<ProdutoComSaldo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [busca, setBusca] = useState("");

  const [quantidade, setQuantidade] = useState(1);
  const [preco, setPreco] = useState("");
  const [desconto, setDesconto] = useState("");
  const [data, setData] = useState(hojeISO());
  const [local, setLocal] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [vendido, setVendido] = useState<{ nome: string; total: number } | null>(null);

  async function carregar() {
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

  const disponiveis = useMemo(() => produtos.filter((p) => p.saldo > 0), [produtos]);
  const escolhido = useMemo(() => disponiveis.find((p) => p.id === pecaId) ?? null, [disponiveis, pecaId]);
  const tipos = useMemo(() => agruparPorTipo(disponiveis), [disponiveis]);
  const doTipo = useMemo(() => tipos.find((t) => t.tipo === tipo) ?? null, [tipos, tipo]);
  const modelos = useMemo(() => (doTipo ? agruparPorModelo(doTipo.produtos) : []), [doTipo]);

  const termo = busca.trim();
  const resultados = useMemo(() => {
    const t = normalizar(termo);
    if (!t) return [];
    return disponiveis.filter((p) => normalizar(`${p.nome} ${p.categoria} ${p.tamanho ?? ""}`).includes(t));
  }, [disponiveis, termo]);

  // Ao escolher uma peça, o formulário volta ao começo com o preço dela.
  const idEscolhido = escolhido?.id;
  useEffect(() => {
    if (!escolhido) return;
    setQuantidade(1);
    setPreco(String(escolhido.preco_venda).replace(".", ","));
    setDesconto("");
    setLocal("");
    setData(hojeISO());
    setErro(null);
  }, [idEscolhido]);

  const valorPreco = lerValor(preco);
  const valorDesconto = desconto.trim() === "" ? 0 : lerValor(desconto);
  const total = quantidade * valorPreco - valorDesconto;
  const valoresOk =
    Number.isFinite(valorPreco) && valorPreco > 0 && Number.isFinite(valorDesconto) && valorDesconto >= 0 && total > 0;

  function limpar() {
    setVendido(null);
    setBusca("");
    setErro(null);
    setParams({});
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
    // Troca a página atual por uma limpa, para o botão «voltar» do celular não reabrir a venda já feita.
    setParams({}, { replace: true });
    await carregar();
  }

  const passo: 1 | 2 | 3 = escolhido ? 3 : doTipo && !termo ? 2 : 1;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina icone="carrinho" titulo="Vender" texto="Registrar uma venda nova" cor="folha" />

      {vendido ? (
        <>
          <div className="cartao p-7">
            <p className="m-0 font-display text-3xl font-bold text-folha">✓ Venda registrada!</p>
            <p className="mb-0 mt-3 text-2xl font-bold">{vendido.nome}</p>
            <p className="mb-0 mt-1 font-display text-4xl font-bold">{formatarMoeda(vendido.total)}</p>
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
        </>
      ) : (
        <>
          <Passos atual={passo} />

          {carregando && <p className="m-0 text-xl font-bold">Carregando...</p>}
          {erroCarga && (
            <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
              Não foi possível carregar as peças. Confira a internet e tente de novo.
            </p>
          )}

          {/* Passo 3: quantidade, preço e total */}
          {!carregando && !erroCarga && escolhido && (
            <>
              <button onClick={() => setParams({ tipo: escolhido.categoria })} className={botaoVoltar}>
                ‹ Trocar a peça
              </button>

              <div className="cartao px-6 py-5">
                <div className="text-2xl font-bold">{escolhido.nome}</div>
                <div className="text-lg opacity-75">
                  {[escolhido.tamanho, `${escolhido.saldo} ${rotuloUnidade(escolhido.unidade, escolhido.saldo)} no estoque`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>

              <div className="cartao px-6 py-5">
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
                  <input
                    type="date"
                    value={data}
                    max={hojeISO()}
                    onChange={(e) => setData(e.target.value)}
                    className={campo}
                  />
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

              <div className="rounded-2xl bg-folha px-6 py-5 text-white">
                <div className="text-xl">Total da venda</div>
                <div className="font-display text-5xl font-bold">{valoresOk ? formatarMoeda(total) : "—"}</div>
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
            </>
          )}

          {/* Passo 1 e busca: escolher o tipo ou procurar pelo nome */}
          {!carregando && !erroCarga && !escolhido && !(doTipo && !termo) && (
            <>
              <h2 className="m-0 font-display text-3xl font-bold">Que tipo de peça foi vendida?</h2>

              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ou procure pelo nome..."
                aria-label="Procurar a peça pelo nome"
                className={campo}
              />

              {termo ? (
                <div className="cartao px-6 py-2">
                  {resultados.length === 0 && <p className="text-xl font-bold">Nenhuma peça disponível encontrada.</p>}
                  <ul className="m-0 list-none p-0">
                    {resultados.map((p) => (
                      <li key={p.id} className="border-t-2 border-areia-escura first:border-t-0">
                        <button
                          onClick={() => {
                            setBusca("");
                            setParams({ tipo: p.categoria, peca: p.id });
                          }}
                          className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 border-0 bg-transparent py-4 text-left text-tinta"
                        >
                          <span className="min-w-0">
                            <span className="block text-xl font-bold">
                              {[p.nome, p.tamanho].filter(Boolean).join(" · ")}
                            </span>
                            <span className="block text-base opacity-75">{p.categoria}</span>
                          </span>
                          <span className="text-lg font-bold text-folha">
                            {formatarMoeda(p.preco_venda)} · tem {p.saldo}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  {tipos.length === 0 && (
                    <p className="m-0 text-xl font-bold">Não tem nenhuma peça em estoque para vender.</p>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {tipos.map((t) => (
                      <button
                        key={t.tipo}
                        onClick={() => setParams({ tipo: t.tipo })}
                        className="cartao flex min-h-28 cursor-pointer items-center justify-between gap-3 border-l-8 border-l-folha px-7 py-5 text-left text-tinta hover:border-folha">
                        <span>
                          <span className="block font-display text-3xl font-bold">{t.tipo}</span>
                          <span className="block text-lg opacity-70">{t.pecas} em estoque</span>
                        </span>
                        <span aria-hidden="true" className="text-4xl text-folha">
                          ›
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Passo 2: escolher o modelo e o tamanho dentro do tipo */}
          {!carregando && !erroCarga && !escolhido && doTipo && !termo && (
            <>
              <button onClick={() => setParams({})} className={botaoVoltar}>
                ‹ Trocar o tipo
              </button>
              <h2 className="m-0 font-display text-3xl font-bold">{doTipo.tipo}: qual peça?</h2>
              {modelos.map((m) => (
                <section key={m.nome} className="cartao px-6 py-5">
                  <h3 className="mb-3 mt-0 font-display text-2xl font-bold">{nomeSemTipo(m.nome, doTipo.tipo)}</h3>
                  <div className="flex flex-wrap gap-3">
                    {m.itens.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setParams({ tipo: p.categoria, peca: p.id })}
                        className="flex min-w-32 cursor-pointer flex-col items-start rounded-2xl border-2 border-folha bg-areia px-5 py-3 text-left text-tinta"
                      >
                        <span className="text-2xl font-extrabold">{p.tamanho ?? "Única"}</span>
                        <span className="text-lg font-bold text-folha">{formatarMoeda(p.preco_venda)}</span>
                        <span className="text-base opacity-75">tem {p.saldo}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
