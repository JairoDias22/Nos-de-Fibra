import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { agruparPorModelo, agruparPorTipo, carregarProdutosComSaldo } from "../lib/produtos";
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

/* ---------- Tabela, no estilo da planilha ---------- */

type Chave = "categoria" | "nome" | "preco" | "saldo";
type Ordem = { chave: Chave; dir: 1 | -1 };

function comparar(a: ProdutoComSaldo, b: ProdutoComSaldo, ordem: Ordem) {
  let r = 0;
  if (ordem.chave === "categoria") r = a.categoria.localeCompare(b.categoria, "pt-BR");
  else if (ordem.chave === "nome") r = a.nome.localeCompare(b.nome, "pt-BR");
  else if (ordem.chave === "preco") r = a.preco_venda - b.preco_venda;
  else r = a.saldo - b.saldo;

  if (r === 0) r = a.nome.localeCompare(b.nome, "pt-BR");
  if (r === 0) r = (a.tamanho ?? "").localeCompare(b.tamanho ?? "", "pt-BR", { numeric: true });
  return r * ordem.dir;
}

const celula = "border border-areia-escura px-3 py-3";

type ThProps = {
  chave: Chave;
  ordem: Ordem;
  onOrdenar: (chave: Chave) => void;
  className?: string;
  direita?: boolean;
  children: string;
};

/** Título de coluna: clicar ordena a tabela por ela. */
function Th({ chave, ordem, onOrdenar, className = "", direita = false, children }: ThProps) {
  const ativo = ordem.chave === chave;
  return (
    <th
      scope="col"
      aria-sort={ativo ? (ordem.dir === 1 ? "ascending" : "descending") : "none"}
      className={`border border-areia-escura bg-[#EDF2EB] p-0 ${className}`}
    >
      <button
        onClick={() => onOrdenar(chave)}
        className={`flex w-full cursor-pointer items-center gap-1 border-0 bg-transparent px-3 py-3 text-base font-extrabold text-tinta ${
          direita ? "justify-end" : ""
        }`}
      >
        {children}
        <span aria-hidden="true" className="text-xs opacity-60">
          {ativo ? (ordem.dir === 1 ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

/* ---------- Lista simples, usada na visão por grupo ---------- */

type LinhaProps = {
  p: ProdutoComSaldo;
  titulo: string;
  detalhe?: string;
  aberto: boolean;
  onToggle: () => void;
  categorias: string[];
  onFeito: (aviso: string) => void;
};

function LinhaProduto({ p, titulo, detalhe, aberto, onToggle, categorias, onFeito }: LinhaProps) {
  const s = situacao(p);
  return (
    <li className="border-t border-areia-escura first:border-t-0">
      <button
        onClick={onToggle}
        aria-expanded={aberto}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 border-0 bg-transparent py-4 text-left text-tinta"
      >
        <span className="min-w-0">
          <span className="block text-xl font-bold">{titulo}</span>
          {detalhe && <span className="block text-base opacity-70">{detalhe}</span>}
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
  const porGrupo = params.get("visao") === "grupo";
  const tipoEscolhido = params.get("tipo");

  const [produtos, setProdutos] = useState<ProdutoComSaldo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [ordem, setOrdem] = useState<Ordem>({ chave: "categoria", dir: 1 });
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
  const encontrados = useMemo(() => {
    const t = normalizar(termo);
    return produtos.filter(
      (p) =>
        (!filtroTipo || p.categoria === filtroTipo) &&
        (!t || normalizar(`${p.nome} ${p.categoria} ${p.tamanho ?? ""}`).includes(t)),
    );
  }, [produtos, termo, filtroTipo]);

  const linhasTabela = useMemo(() => [...encontrados].sort((a, b) => comparar(a, b, ordem)), [encontrados, ordem]);

  function feito(mensagem: string) {
    setAviso(mensagem);
    setSelecionado(null);
    setCriando(false);
    setVersao((v) => v + 1);
  }

  function alternar(id: string) {
    setAviso(null);
    setCriando(false);
    setSelecionado((atual) => (atual === id ? null : id));
  }

  function ordenarPor(chave: Chave) {
    setOrdem((o) => (o.chave === chave ? { chave, dir: o.dir === 1 ? -1 : 1 } : { chave, dir: 1 }));
  }

  function mudarVisao(grupo: boolean) {
    setSelecionado(null);
    setParams(grupo ? { visao: "grupo" } : {});
  }

  function voltarAosTipos() {
    setSelecionado(null);
    setParams({ visao: "grupo" });
  }

  function abrirTipo(tipo: string) {
    setAviso(null);
    setCriando(false);
    setSelecionado(null);
    setParams({ visao: "grupo", tipo });
  }

  const botaoVisao = (ativa: boolean) =>
    `flex-1 cursor-pointer rounded-lg border-0 px-5 py-2 text-lg font-bold md:flex-none ${
      ativa ? "bg-white text-terracota shadow-sm" : "bg-transparent text-tinta"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina icone="caixa" titulo="Estoque" texto="Tudo o que está guardado" cor="terracota" />

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
          <div key={rotulo} className="cartao px-6 py-5">
            <div className="text-base opacity-70">{rotulo}</div>
            <div className="text-3xl font-extrabold text-terracota">{valor}</div>
          </div>
        ))}
      </div>

      {criando ? (
        <div className="cartao p-6">
          <h2 className="m-0 mb-4 text-3xl font-extrabold">Nova peça</h2>
          <FormProduto categorias={categorias} onSalvo={feito} onCancelar={() => setCriando(false)} />
        </div>
      ) : (
        <div className="cartao flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div role="group" aria-label="Forma de ver o estoque" className="flex rounded-xl bg-areia p-1">
            <button onClick={() => mudarVisao(false)} aria-pressed={!porGrupo} className={botaoVisao(!porGrupo)}>
              Tabela
            </button>
            <button onClick={() => mudarVisao(true)} aria-pressed={porGrupo} className={botaoVisao(porGrupo)}>
              Por grupo
            </button>
          </div>

          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar uma peça pelo nome..."
            aria-label="Procurar uma peça pelo nome"
            className={`${campoBranco} min-w-0 flex-1 !border-areia-escura !py-2.5`}
          />

          {!porGrupo && (
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              aria-label="Mostrar só um tipo de peça"
              className="cursor-pointer rounded-2xl border border-areia-escura bg-white px-4 py-2.5 text-lg"
            >
              <option value="">Todos os tipos</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setAviso(null);
              setSelecionado(null);
              setCriando(true);
            }}
            className="cursor-pointer rounded-xl border-0 bg-terracota px-5 py-2.5 text-lg font-extrabold text-white"
          >
            + Nova peça
          </button>
        </div>
      )}

      {carregando && <p className="m-0 text-xl font-bold">Carregando...</p>}
      {erro && (
        <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
          {erro}
        </p>
      )}

      {/* Visão em tabela, como a planilha */}
      {!carregando && !erro && !porGrupo && (
        <div className="cartao overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr>
                  <Th chave="categoria" ordem={ordem} onOrdenar={ordenarPor} className="hidden md:table-cell">
                    Tipo
                  </Th>
                  <Th chave="nome" ordem={ordem} onOrdenar={ordenarPor}>
                    Peça
                  </Th>
                  <th
                    scope="col"
                    className="hidden border border-areia-escura bg-[#EDF2EB] px-3 py-3 text-left font-extrabold md:table-cell"
                  >
                    Tamanho
                  </th>
                  <Th chave="preco" ordem={ordem} onOrdenar={ordenarPor} className="hidden md:table-cell" direita>
                    Preço
                  </Th>
                  <Th chave="saldo" ordem={ordem} onOrdenar={ordenarPor} direita>
                    Estoque
                  </Th>
                  <th scope="col" className="border border-areia-escura bg-[#EDF2EB] px-3 py-3 text-left font-extrabold">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhasTabela.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`${celula} text-lg font-bold`}>
                      Nenhuma peça encontrada.
                    </td>
                  </tr>
                )}
                {linhasTabela.map((p) => {
                  const s = situacao(p);
                  const aberto = selecionado === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr
                        onClick={() => alternar(p.id)}
                        className={`cursor-pointer hover:bg-folha-clara ${aberto ? "bg-folha-clara" : ""}`}
                      >
                        <td className={`${celula} hidden md:table-cell`}>{p.categoria}</td>
                        <td className={celula}>
                          <button
                            aria-expanded={aberto}
                            className="cursor-pointer border-0 bg-transparent p-0 text-left text-base font-bold text-tinta"
                          >
                            {p.nome}
                          </button>
                          <span className="block text-sm opacity-70 md:hidden">
                            {[p.tamanho, formatarMoeda(p.preco_venda)].filter(Boolean).join(" · ")}
                          </span>
                        </td>
                        <td className={`${celula} hidden md:table-cell`}>{p.tamanho ?? "—"}</td>
                        <td className={`${celula} hidden text-right md:table-cell`}>{formatarMoeda(p.preco_venda)}</td>
                        <td className={`${celula} text-right font-bold`}>
                          {p.saldo} {rotuloUnidade(p.unidade, p.saldo)}
                        </td>
                        <td className={celula}>
                          <span className={`inline-block rounded-full px-3 py-1 text-sm font-extrabold ${s.cor}`}>
                            {s.rotulo}
                          </span>
                        </td>
                      </tr>
                      {aberto && (
                        <tr>
                          <td colSpan={6} className="border border-areia-escura bg-areia p-4">
                            <AcoesProduto produto={p} categorias={categorias} onFeito={feito} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-areia-escura bg-[#EDF2EB] px-4 py-3 text-base font-bold">
            {linhasTabela.length} {linhasTabela.length === 1 ? "peça listada" : "peças listadas"} ·{" "}
            {linhasTabela.reduce((soma, p) => soma + p.saldo, 0)} em estoque ·{" "}
            {formatarMoeda(linhasTabela.reduce((soma, p) => soma + p.saldo * p.preco_venda, 0))}
          </div>
        </div>
      )}

      {/* Visão por grupo: busca */}
      {!carregando && !erro && porGrupo && termo && (
        <div className="cartao px-6 py-2">
          {encontrados.length === 0 && <p className="text-xl font-bold">Nenhuma peça encontrada.</p>}
          <ul className="m-0 list-none p-0">
            {encontrados.map((p) => (
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

      {/* Visão por grupo: os tipos de peça */}
      {!carregando && !erro && porGrupo && !termo && !doTipo && (
        <>
          <h2 className="m-0 text-2xl font-extrabold">Escolha o tipo de peça</h2>
          {tipos.length === 0 && <p className="m-0 text-xl font-bold">Ainda não tem nenhuma peça cadastrada.</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tipos.map((t) => (
              <button
                key={t.tipo}
                onClick={() => abrirTipo(t.tipo)}
                className="cartao flex min-h-28 cursor-pointer items-center justify-between gap-3 border-l-8 border-l-terracota px-6 py-5 text-left text-tinta hover:border-terracota"
              >
                <span>
                  <span className="block text-3xl font-extrabold">{t.tipo}</span>
                  <span className="block text-lg opacity-70">
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

      {/* Visão por grupo: as peças de um tipo, agrupadas por modelo e tamanho */}
      {!carregando && !erro && porGrupo && !termo && doTipo && (
        <>
          <button
            onClick={voltarAosTipos}
            className="cursor-pointer self-start rounded-xl border border-terracota bg-white px-4 py-2 text-lg font-bold text-terracota"
          >
            ‹ Todos os tipos
          </button>
          <h2 className="m-0 text-3xl font-extrabold">{doTipo.tipo}</h2>
          {modelos.map((m) => (
            <section key={m.nome} className="cartao px-6 py-3">
              <h3 className="mb-0 mt-3 text-2xl font-extrabold">{nomeSemTipo(m.nome, doTipo.tipo)}</h3>
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
