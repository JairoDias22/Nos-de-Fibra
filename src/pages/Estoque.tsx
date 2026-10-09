import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  agruparPorModelo,
  agruparPorTipo,
  carregarProdutosComSaldo,
} from "../lib/produtos";
import { formatarMoeda, nomeSemTipo, normalizar, rotuloUnidade } from "../lib/formatar";
import { campoBranco } from "../lib/estilos";
import AcoesProduto from "../components/estoque/AcoesProduto";
import FormProduto from "../components/estoque/FormProduto";
import CabecalhoPagina from "../components/CabecalhoPagina";
import type { ProdutoComSaldo } from "../types";

function situacao(p: ProdutoComSaldo) {
  if (p.saldo <= 0) return { rotulo: "Esgotado", cor: "bg-[#F0C3B6] text-[#7A2A12]" };
  if (p.saldo <= p.estoque_minimo) return { rotulo: "Estoque baixo", cor: "bg-[#F6D98A] text-[#4A3500]" };
  return { rotulo: "Disponível", cor: "bg-[#CFE5CF] text-[#1F4A2A]" };
}

type LinhaProps = {
  p: ProdutoComSaldo;
  titulo: string;
  detalhe?: string;
  aberto: boolean;
  onToggle: () => void;
  categorias: string[];
  onFeito: (aviso: string) => void;
};

/** Uma peça na lista: toque para abrir as ações (entrou mais, corrigir, editar, tirar da lista). */
function LinhaProduto({ p, titulo, detalhe, aberto, onToggle, categorias, onFeito }: LinhaProps) {
  const s = situacao(p);
  return (
    <li className="border-t-2 border-areia-escura first:border-t-0">
      <button
        onClick={onToggle}
        aria-expanded={aberto}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 border-0 bg-transparent py-4 text-left text-tinta"
      >
        <span className="min-w-0">
          <span className="block text-xl font-bold">{titulo}</span>
          {detalhe && <span className="block text-base opacity-75">{detalhe}</span>}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xl font-bold">
            {p.saldo} {rotuloUnidade(p.unidade, p.saldo)}
          </span>
          <span className={`rounded-full px-4 py-1.5 text-base font-extrabold ${s.cor}`}>{s.rotulo}</span>
        </span>
      </button>
      {aberto && (
        <div className="pb-5">
          <AcoesProduto produto={p} categorias={categorias} onFeito={onFeito} />
        </div>
      )}
    </li>
  );
}

export default function Estoque() {
  const [params, setParams] = useSearchParams();
  const tipoEscolhido = params.get("tipo");

  const [produtos, setProdutos] = useState<ProdutoComSaldo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [versao, setVersao] = useState(0);

  const [criando, setCriando] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const lista = await carregarProdutosComSaldo();
        if (ativo) {
          setProdutos(lista);
          setErro(null);
        }
      } catch {
        if (ativo) setErro("Não foi possível carregar o estoque. Confira a internet e tente de novo.");
      }
      if (ativo) setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [versao]);

  const tipos = useMemo(() => agruparPorTipo(produtos), [produtos]);
  const categorias = useMemo(() => tipos.map((t) => t.tipo), [tipos]);
  const doTipo = useMemo(() => tipos.find((t) => t.tipo === tipoEscolhido) ?? null, [tipos, tipoEscolhido]);
  const modelos = useMemo(() => (doTipo ? agruparPorModelo(doTipo.produtos) : []), [doTipo]);

  const resumo = useMemo(
    () => ({
      produtos: produtos.length,
      pecas: produtos.reduce((soma, p) => soma + p.saldo, 0),
      valor: produtos.reduce((soma, p) => soma + p.saldo * p.preco_venda, 0),
    }),
    [produtos],
  );

  const termo = busca.trim();
  const resultados = useMemo(() => {
    const t = normalizar(termo);
    if (!t) return [];
    return produtos.filter((p) => normalizar(`${p.nome} ${p.categoria} ${p.tamanho ?? ""}`).includes(t));
  }, [produtos, termo]);

  function feito(mensagem: string) {
    setAviso(mensagem);
    setSelecionado(null);
    setCriando(false);
    setVersao((v) => v + 1);
  }

  function abrirTipo(tipo: string) {
    setAviso(null);
    setCriando(false);
    setSelecionado(null);
    setParams({ tipo });
  }

  function fecharTipo() {
    setSelecionado(null);
    setParams({});
  }

  function alternar(id: string) {
    setAviso(null);
    setCriando(false);
    setSelecionado((atual) => (atual === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        icone="caixa"
        titulo="Estoque"
        texto="Tudo o que está guardado"
        cor="bg-terracota text-white"
      />

      {aviso && (
        <div role="status" className="rounded-2xl bg-[#CFE5CF] px-5 py-4 text-xl font-bold text-[#1F4A2A]">
          {aviso}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Produtos cadastrados", String(resumo.produtos)],
          ["Peças em estoque", String(resumo.pecas)],
          ["Valor em estoque", formatarMoeda(resumo.valor)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-3xl bg-white px-6 py-5">
            <div className="text-lg">{rotulo}</div>
            <div className="font-display text-3xl font-bold text-terracota">{valor}</div>
          </div>
        ))}
      </div>

      {criando ? (
        <div className="rounded-3xl bg-white p-6">
          <h2 className="m-0 mb-4 font-display text-3xl font-bold">Nova peça</h2>
          <FormProduto categorias={categorias} onSalvo={feito} onCancelar={() => setCriando(false)} />
        </div>
      ) : (
        <button
          onClick={() => {
            setAviso(null);
            setSelecionado(null);
            setCriando(true);
          }}
          className="cursor-pointer rounded-2xl border-0 bg-terracota px-6 py-5 text-2xl font-extrabold text-white"
        >
          + Nova peça
        </button>
      )}

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Procurar uma peça pelo nome..."
        aria-label="Procurar uma peça pelo nome"
        className={campoBranco}
      />

      {carregando && <p className="m-0 text-xl font-bold">Carregando...</p>}
      {erro && (
        <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
          {erro}
        </p>
      )}

      {!carregando && !erro && termo && (
        <div className="rounded-3xl bg-white px-6 py-2">
          {resultados.length === 0 && <p className="text-xl font-bold">Nenhuma peça encontrada.</p>}
          <ul className="m-0 list-none p-0">
            {resultados.map((p) => (
              <LinhaProduto
                key={p.id}
                p={p}
                titulo={[p.nome, p.tamanho].filter(Boolean).join(" · ")}
                detalhe={`${p.categoria} · ${formatarMoeda(p.preco_venda)}`}
                aberto={selecionado === p.id}
                onToggle={() => alternar(p.id)}
                categorias={categorias}
                onFeito={feito}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Visão 1: os tipos de peça */}
      {!carregando && !erro && !termo && !doTipo && (
        <>
          <h2 className="m-0 font-display text-3xl font-bold">Escolha o tipo de peça</h2>
          {tipos.length === 0 && <p className="m-0 text-xl font-bold">Ainda não tem nenhuma peça cadastrada.</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tipos.map((t) => (
              <button
                key={t.tipo}
                onClick={() => abrirTipo(t.tipo)}
                className="flex min-h-28 cursor-pointer items-center justify-between gap-3 rounded-3xl border-l-8 border-terracota bg-white px-6 py-5 text-left text-tinta"
              >
                <span>
                  <span className="block font-display text-3xl font-bold">{t.tipo}</span>
                  <span className="block text-lg">
                    {t.pecas} {t.pecas === 1 ? "peça" : "peças"} em estoque
                  </span>
                  <span
                    className={`mt-2 inline-block rounded-full px-4 py-1 text-base font-extrabold ${
                      t.acabando > 0 ? "bg-[#F6D98A] text-[#4A3500]" : "bg-[#CFE5CF] text-[#1F4A2A]"
                    }`}
                  >
                    {t.acabando > 0 ? `${t.acabando} acabando` : "Tudo certo"}
                  </span>
                </span>
                <span aria-hidden="true" className="text-4xl text-terracota">
                  ›
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Visão 2: as peças de um tipo, agrupadas por modelo e tamanho */}
      {!carregando && !erro && !termo && doTipo && (
        <>
          <button
            onClick={fecharTipo}
            className="cursor-pointer self-start rounded-xl border-2 border-terracota bg-transparent px-4 py-2 text-lg font-bold text-terracota"
          >
            ‹ Todos os tipos
          </button>
          <h2 className="m-0 font-display text-3xl font-bold">{doTipo.tipo}</h2>
          {modelos.map((m) => (
            <section key={m.nome} className="rounded-3xl bg-white px-6 py-3">
              <h3 className="mb-0 mt-3 font-display text-2xl font-bold">{nomeSemTipo(m.nome, doTipo.tipo)}</h3>
              <ul className="m-0 list-none p-0">
                {m.itens.map((p) => (
                  <LinhaProduto
                    key={p.id}
                    p={p}
                    titulo={p.tamanho ?? "Tamanho único"}
                    detalhe={formatarMoeda(p.preco_venda)}
                    aberto={selecionado === p.id}
                    onToggle={() => alternar(p.id)}
                    categorias={categorias}
                    onFeito={feito}
                  />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
