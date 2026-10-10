import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { carregarProdutosComSaldo } from "../lib/produtos";
import { formatarMoeda, rotuloUnidade } from "../lib/formatar";
import {
  comparacao,
  dataPorExtenso,
  diaSemanaCurto,
  intervaloDoPeriodo,
  mesCurto,
  mesPorExtenso,
  moverPeriodo,
  paraISO,
  semVendasAnterior,
  tituloDoPeriodo,
  type Periodo,
} from "../lib/periodos";
import CabecalhoPagina from "../components/CabecalhoPagina";
import { BarrasHorizontais, GraficoBarras, type Ponto } from "../components/Graficos";
import type { ProdutoComSaldo } from "../types";

type DadosProduto = { nome: string; categoria: string; tamanho: string | null };

type Venda = {
  quantidade: number;
  valor_total: number;
  data: string;
  criado_em: string;
  produtos: DadosProduto | DadosProduto[] | null;
};

type Linha = { tipo: "entrada" | "saida"; valor: number };

const PERIODOS: { chave: Periodo; rotulo: string }[] = [
  { chave: "dia", rotulo: "Dia" },
  { chave: "semana", rotulo: "Semana" },
  { chave: "mes", rotulo: "Mês" },
  { chave: "ano", rotulo: "Ano" },
];

function dadosDoProduto(v: Venda): DadosProduto | null {
  return Array.isArray(v.produtos) ? (v.produtos[0] ?? null) : v.produtos;
}

function nomeCompleto(p: DadosProduto | null) {
  return p ? [p.nome, p.tamanho].filter(Boolean).join(" ") : "Peça removida";
}

function soma(vendas: Venda[]) {
  return vendas.reduce((s, v) => s + v.valor_total, 0);
}

/** Junta as vendas em uma coluna por dia (semana e mês) ou por mês (ano). */
function montarPontos(periodo: Periodo, inicio: Date, vendas: Venda[]): Ponto[] {
  if (periodo === "dia") return [];

  const porChave = new Map<string, { valor: number; pecas: number }>();
  const tamanhoChave = periodo === "ano" ? 7 : 10; // AAAA-MM ou AAAA-MM-DD
  for (const v of vendas) {
    const chave = v.data.slice(0, tamanhoChave);
    const atual = porChave.get(chave) ?? { valor: 0, pecas: 0 };
    porChave.set(chave, { valor: atual.valor + v.valor_total, pecas: atual.pecas + v.quantidade });
  }

  if (periodo === "ano") {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(inicio.getFullYear(), i, 1);
      const dados = porChave.get(`${inicio.getFullYear()}-${String(i + 1).padStart(2, "0")}`);
      return { rotulo: mesCurto(d), valor: dados?.valor ?? 0, pecas: dados?.pecas ?? 0, detalhe: mesPorExtenso(d) };
    });
  }

  const dias = periodo === "semana" ? 7 : new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const dados = porChave.get(paraISO(d));
    return {
      rotulo: periodo === "semana" ? diaSemanaCurto(d) : String(d.getDate()),
      sub: periodo === "semana" ? String(d.getDate()) : undefined,
      valor: dados?.valor ?? 0,
      pecas: dados?.pecas ?? 0,
      detalhe: dataPorExtenso(d),
    };
  });
}

export default function Resumo() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [ancora, setAncora] = useState(() => new Date());
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoComSaldo[]>([]);
  const [escolhido, setEscolhido] = useState<number | null>(null);

  const ancoraMs = ancora.getTime();
  const { inicio, fim } = useMemo(() => intervaloDoPeriodo(periodo, new Date(ancoraMs)), [periodo, ancoraMs]);
  const inicioISO = paraISO(inicio);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro(false);
      const anterior = intervaloDoPeriodo(periodo, moverPeriodo(periodo, new Date(ancoraMs), -1));

      const [v, l] = await Promise.all([
        supabase
          .from("vendas")
          .select("quantidade, valor_total, data, criado_em, produtos(nome, categoria, tamanho)")
          .gte("data", paraISO(anterior.inicio))
          .lt("data", paraISO(fim)),
        supabase.from("lancamentos").select("tipo, valor").gte("data", inicioISO).lt("data", paraISO(fim)),
      ]);
      if (!ativo) return;

      if (v.error || l.error) {
        setErro(true);
      } else {
        setVendas((v.data ?? []) as unknown as Venda[]);
        setLinhas((l.data ?? []) as Linha[]);
      }
      setEscolhido(null);
      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [periodo, ancoraMs, inicioISO, fim]);

  useEffect(() => {
    let ativo = true;
    carregarProdutosComSaldo()
      .then((lista) => {
        if (ativo) setProdutos(lista);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const proximoBloqueado = intervaloDoPeriodo(periodo, moverPeriodo(periodo, new Date(ancoraMs), 1)).inicio > new Date();
  const noPeriodoAtual = intervaloDoPeriodo(periodo, new Date()).inicio.getTime() === inicio.getTime();

  const dados = useMemo(() => {
    const doPeriodo = vendas.filter((v) => v.data >= inicioISO);
    const doAnterior = vendas.filter((v) => v.data < inicioISO);

    const porPeca = new Map<string, number>();
    const porTipo = new Map<string, number>();
    for (const v of doPeriodo) {
      const p = dadosDoProduto(v);
      const nome = nomeCompleto(p);
      porPeca.set(nome, (porPeca.get(nome) ?? 0) + v.quantidade);
      const tipo = p?.categoria ?? "Outros";
      porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + v.valor_total);
    }

    const maisVendidas = Array.from(porPeca.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rotulo, valor]) => ({ rotulo, valor, texto: `${valor} vendida${valor === 1 ? "" : "s"}` }));

    const tipos = Array.from(porTipo.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([rotulo, valor]) => ({ rotulo, valor, texto: formatarMoeda(valor) }));

    const entrou = linhas.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
    const saiu = linhas.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);

    return {
      doPeriodo: [...doPeriodo].sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
      quantidadeVendas: doPeriodo.length,
      totalVendido: soma(doPeriodo),
      totalAnterior: soma(doAnterior),
      pecas: doPeriodo.reduce((s, v) => s + v.quantidade, 0),
      pontos: montarPontos(periodo, inicio, doPeriodo),
      maisVendidas,
      tipos,
      saiu,
      sobrou: entrou - saiu,
    };
  }, [vendas, linhas, inicioISO, periodo, inicio]);

  const melhor = useMemo(() => {
    let indice = -1;
    dados.pontos.forEach((p, i) => {
      if (p.valor > 0 && (indice < 0 || p.valor > dados.pontos[indice].valor)) indice = i;
    });
    return indice >= 0 ? indice : null;
  }, [dados.pontos]);

  const indiceMostrado = escolhido ?? melhor;
  const pontoMostrado = indiceMostrado !== null ? dados.pontos[indiceMostrado] : null;

  const variacao =
    dados.totalAnterior > 0 ? ((dados.totalVendido - dados.totalAnterior) / dados.totalAnterior) * 100 : null;

  const acabando = useMemo(
    () =>
      produtos
        .filter((p) => p.saldo <= p.estoque_minimo)
        .sort((a, b) => a.saldo - b.saldo)
        .slice(0, 8),
    [produtos],
  );

  const tituloGrafico = periodo === "ano" ? "Vendas por mês" : "Vendas por dia";

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina icone="grafico" titulo="Resumo" texto="Como estão as vendas" cor="ouro" />

      {/* Escolha do período */}
      <div className="cartao flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Período" className="flex rounded-xl bg-areia p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.chave}
              onClick={() => setPeriodo(p.chave)}
              aria-pressed={periodo === p.chave}
              className={`flex-1 cursor-pointer rounded-lg border-0 px-5 py-2 text-lg font-bold md:flex-none ${
                periodo === p.chave ? "bg-white text-folha shadow-sm" : "bg-transparent text-tinta"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 md:justify-end">
          <button
            onClick={() => setAncora(moverPeriodo(periodo, new Date(ancoraMs), -1))}
            aria-label="Período anterior"
            className="size-11 cursor-pointer rounded-xl border border-areia-escura bg-white text-2xl font-bold"
          >
            ‹
          </button>
          <span className="min-w-0 flex-1 text-center text-lg font-extrabold md:min-w-64 md:flex-none">
            {tituloDoPeriodo(periodo, new Date(ancoraMs))}
          </span>
          <button
            onClick={() => setAncora(moverPeriodo(periodo, new Date(ancoraMs), 1))}
            disabled={proximoBloqueado}
            aria-label="Próximo período"
            className="size-11 cursor-pointer rounded-xl border border-areia-escura bg-white text-2xl font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
          {!noPeriodoAtual && (
            <button
              onClick={() => setAncora(new Date())}
              className="cursor-pointer rounded-xl border border-folha bg-white px-4 py-2 text-base font-bold text-folha"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {erro && (
        <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
          Não foi possível carregar o resumo. Confira a internet e tente de novo.
        </p>
      )}
      {carregando && <p className="m-0 text-xl font-bold">Carregando...</p>}

      {!carregando && !erro && (
        <>
          {/* Números do período */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="cartao col-span-2 p-5 lg:col-span-1">
              <div className="text-base opacity-70">Vendeu</div>
              <div className="text-3xl font-extrabold text-folha">{formatarMoeda(dados.totalVendido)}</div>
              <div className="mt-1 text-sm">
                {variacao === null ? (
                  <span className="opacity-70">
                    {dados.totalVendido > 0 ? `Sem vendas ${semVendasAnterior[periodo]}` : "Sem vendas"}
                  </span>
                ) : (
                  <span className={`font-bold ${variacao >= 0 ? "text-folha" : "text-terracota"}`}>
                    {variacao >= 0 ? "▲" : "▼"} {Math.abs(Math.round(variacao))}% em relação {comparacao[periodo]}
                  </span>
                )}
              </div>
            </div>
            <div className="cartao p-5">
              <div className="text-base opacity-70">Peças vendidas</div>
              <div className="text-3xl font-extrabold">{dados.pecas}</div>
              <div className="mt-1 text-sm opacity-70">
                {dados.quantidadeVendas} {dados.quantidadeVendas === 1 ? "venda" : "vendas"}
              </div>
            </div>
            <div className="cartao p-5">
              <div className="text-base opacity-70">Gastos</div>
              <div className="text-3xl font-extrabold text-terracota">{formatarMoeda(dados.saiu)}</div>
            </div>
            <div className="cartao col-span-2 p-5 lg:col-span-1">
              <div className="text-base opacity-70">Sobrou</div>
              <div className={`text-3xl font-extrabold ${dados.sobrou < 0 ? "text-terracota" : ""}`}>
                {formatarMoeda(dados.sobrou)}
              </div>
            </div>
          </div>

          {periodo === "dia" ? (
            <section className="cartao p-6">
              <h2 className="mb-3 mt-0 text-2xl font-extrabold">Vendas do dia</h2>
              {dados.doPeriodo.length === 0 ? (
                <p className="m-0 text-xl">Nenhuma venda neste dia.</p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {dados.doPeriodo.map((v, i) => (
                    <li
                      key={`${v.criado_em}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-areia-escura py-3 first:border-t-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-lg font-bold">{nomeCompleto(dadosDoProduto(v))}</span>
                        <span className="block text-sm opacity-70">
                          {v.quantidade} {v.quantidade === 1 ? "peça" : "peças"} · registrada às{" "}
                          {new Date(v.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                      <span className="text-lg font-extrabold text-folha">{formatarMoeda(v.valor_total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="cartao p-6">
              <h2 className="mb-1 mt-0 text-2xl font-extrabold">{tituloGrafico}</h2>
              <p className="mb-4 mt-0 min-h-7 text-lg" aria-live="polite">
                {pontoMostrado ? (
                  <>
                    <strong>{pontoMostrado.detalhe}:</strong> {formatarMoeda(pontoMostrado.valor)}
                    {pontoMostrado.pecas > 0 && ` · ${pontoMostrado.pecas} ${pontoMostrado.pecas === 1 ? "peça" : "peças"}`}
                  </>
                ) : (
                  <span className="opacity-70">Nenhuma venda neste período.</span>
                )}
              </p>
              <GraficoBarras pontos={dados.pontos} selecionado={indiceMostrado} onSelecionar={setEscolhido} />
            </section>
          )}

          {dados.quantidadeVendas > 0 && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="cartao p-6">
                <h2 className="mb-4 mt-0 text-2xl font-extrabold">Peças mais vendidas</h2>
                <BarrasHorizontais itens={dados.maisVendidas} cor="linear-gradient(to right, #BF5535, #E08A6C)" />
              </section>
              <section className="cartao p-6">
                <h2 className="mb-4 mt-0 text-2xl font-extrabold">Quanto cada tipo rendeu</h2>
                <BarrasHorizontais itens={dados.tipos} cor="linear-gradient(to right, #D69E2E, #F0CB78)" />
              </section>
            </div>
          )}
        </>
      )}

      <section className="cartao p-6">
        <h2 className="mb-4 mt-0 text-2xl font-extrabold">Peças acabando</h2>
        {acabando.length === 0 ? (
          <p className="m-0 text-xl">Nenhuma peça está acabando. Tudo certo!</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {acabando.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-areia-escura py-3 first:border-t-0"
              >
                <span className="text-lg font-bold">{[p.nome, p.tamanho].filter(Boolean).join(" · ")}</span>
                <span
                  className={`rounded-full px-4 py-1.5 text-base font-extrabold ${
                    p.saldo <= 0 ? "bg-[#F0C3B6] text-[#7A2A12]" : "bg-[#F6D98A] text-[#4A3500]"
                  }`}
                >
                  {p.saldo <= 0 ? "Esgotado" : `Resta ${p.saldo} ${rotuloUnidade(p.unidade, p.saldo)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/estoque" className="mt-4 inline-block text-lg font-bold text-folha">
          Ver o estoque
        </Link>
      </section>
    </div>
  );
}
