import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { carregarProdutosComSaldo } from "../lib/produtos";
import { formatarMoeda, intervaloDoMes, rotuloUnidade } from "../lib/formatar";
import SeletorMes from "../components/SeletorMes";
import CabecalhoPagina from "../components/CabecalhoPagina";
import { BarrasHorizontais, BarrasPorDia } from "../components/Graficos";
import type { ProdutoComSaldo } from "../types";

type DadosProduto = { nome: string; categoria: string; tamanho: string | null };

type Venda = {
  quantidade: number;
  valor_total: number;
  data: string;
  produtos: DadosProduto | DadosProduto[] | null;
};

type Linha = { tipo: "entrada" | "saida"; valor: number };

function dadosDoProduto(v: Venda): DadosProduto | null {
  return Array.isArray(v.produtos) ? (v.produtos[0] ?? null) : v.produtos;
}

function soma(vendas: Venda[]) {
  return vendas.reduce((s, v) => s + v.valor_total, 0);
}

const cartao = "rounded-3xl bg-white px-6 py-6";

export default function Resumo() {
  const hoje = new Date();
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoComSaldo[]>([]);

  const { inicio } = intervaloDoMes(ref.ano, ref.mes);
  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate();

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro(false);
      const mesAtual = intervaloDoMes(ref.ano, ref.mes);
      const anterior = ref.mes === 0 ? intervaloDoMes(ref.ano - 1, 11) : intervaloDoMes(ref.ano, ref.mes - 1);

      const [v, l] = await Promise.all([
        supabase
          .from("vendas")
          .select("quantidade, valor_total, data, produtos(nome, categoria, tamanho)")
          .gte("data", anterior.inicio)
          .lt("data", mesAtual.fim),
        supabase
          .from("lancamentos")
          .select("tipo, valor")
          .gte("data", mesAtual.inicio)
          .lt("data", mesAtual.fim),
      ]);
      if (!ativo) return;

      if (v.error || l.error) {
        setErro(true);
      } else {
        setVendas((v.data ?? []) as unknown as Venda[]);
        setLinhas((l.data ?? []) as Linha[]);
      }
      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [ref.ano, ref.mes]);

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

  function mudarMes(delta: number) {
    setRef((r) => {
      const d = new Date(r.ano, r.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  const dados = useMemo(() => {
    const doMes = vendas.filter((v) => v.data >= inicio);
    const doMesPassado = vendas.filter((v) => v.data < inicio);

    const porDia = Array.from({ length: diasNoMes }, () => 0);
    const porPeca = new Map<string, { quantidade: number; unidade: string }>();
    const porTipo = new Map<string, number>();

    for (const v of doMes) {
      const dia = Number(v.data.slice(8, 10));
      if (dia >= 1 && dia <= diasNoMes) porDia[dia - 1] += v.valor_total;

      const p = dadosDoProduto(v);
      const nome = p ? [p.nome, p.tamanho].filter(Boolean).join(" ") : "Peça removida";
      const atual = porPeca.get(nome) ?? { quantidade: 0, unidade: "unid" };
      porPeca.set(nome, { quantidade: atual.quantidade + v.quantidade, unidade: atual.unidade });

      const tipo = p?.categoria ?? "Outros";
      porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + v.valor_total);
    }

    const maisVendidas = Array.from(porPeca.entries())
      .sort((a, b) => b[1].quantidade - a[1].quantidade)
      .slice(0, 5)
      .map(([rotulo, x]) => ({ rotulo, valor: x.quantidade, texto: `${x.quantidade} vendida${x.quantidade === 1 ? "" : "s"}` }));

    const tipos = Array.from(porTipo.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([rotulo, valor]) => ({ rotulo, valor, texto: formatarMoeda(valor) }));

    const entrou = linhas.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
    const saiu = linhas.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);

    return {
      quantidadeVendas: doMes.length,
      totalVendido: soma(doMes),
      pecas: doMes.reduce((s, v) => s + v.quantidade, 0),
      totalMesPassado: soma(doMesPassado),
      temMesPassado: doMesPassado.length > 0,
      porDia,
      maisVendidas,
      tipos,
      saiu,
      sobrou: entrou - saiu,
    };
  }, [vendas, linhas, inicio, diasNoMes]);

  const acabando = useMemo(
    () =>
      produtos
        .filter((p) => p.saldo <= p.estoque_minimo)
        .sort((a, b) => a.saldo - b.saldo)
        .slice(0, 8),
    [produtos],
  );

  const diferenca = dados.totalVendido - dados.totalMesPassado;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina icone="grafico" titulo="Resumo" texto="Como está indo o mês" cor="bg-ouro text-tinta" />

      <SeletorMes ano={ref.ano} mes={ref.mes} onMudar={mudarMes} />

      {erro && (
        <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
          Não foi possível carregar o resumo. Confira a internet e tente de novo.
        </p>
      )}
      {carregando && <p className="m-0 text-xl font-bold">Carregando...</p>}

      {!carregando && !erro && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl bg-folha px-6 py-5 text-white">
              <div className="text-lg">Vendeu no mês</div>
              <div className="font-display text-3xl font-bold">{formatarMoeda(dados.totalVendido)}</div>
            </div>
            <div className="rounded-3xl bg-white px-6 py-5">
              <div className="text-lg">Peças vendidas</div>
              <div className="font-display text-3xl font-bold text-folha">{dados.pecas}</div>
            </div>
            <div className="rounded-3xl bg-white px-6 py-5">
              <div className="text-lg">Gastos do mês</div>
              <div className="font-display text-3xl font-bold text-terracota">{formatarMoeda(dados.saiu)}</div>
            </div>
            <div className="rounded-3xl bg-white px-6 py-5">
              <div className="text-lg">Sobrou</div>
              <div
                className={`font-display text-3xl font-bold ${dados.sobrou < 0 ? "text-terracota" : "text-tinta"}`}
              >
                {formatarMoeda(dados.sobrou)}
              </div>
            </div>
          </div>

          <p className="m-0 text-xl">
            {dados.temMesPassado
              ? diferenca === 0
                ? "As vendas ficaram iguais às do mês passado."
                : `Comparando com o mês passado, vendeu ${formatarMoeda(Math.abs(diferenca))} a ${diferenca > 0 ? "mais" : "menos"}.`
              : "Não teve vendas no mês passado para comparar."}
          </p>

          {dados.quantidadeVendas === 0 ? (
            <div className={cartao}>
              <p className="m-0 text-xl font-bold">Nenhuma venda neste mês ainda.</p>
            </div>
          ) : (
            <>
              <section className={cartao}>
                <h2 className="mb-4 mt-0 font-display text-2xl font-bold">Vendas por dia</h2>
                <BarrasPorDia valores={dados.porDia} />
              </section>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className={cartao}>
                  <h2 className="mb-4 mt-0 font-display text-2xl font-bold">Peças mais vendidas</h2>
                  <BarrasHorizontais itens={dados.maisVendidas} cor="bg-terracota" />
                </section>
                <section className={cartao}>
                  <h2 className="mb-4 mt-0 font-display text-2xl font-bold">Quanto cada tipo rendeu</h2>
                  <BarrasHorizontais itens={dados.tipos} cor="bg-ouro" />
                </section>
              </div>
            </>
          )}
        </>
      )}

      <section className={cartao}>
        <h2 className="mb-4 mt-0 font-display text-2xl font-bold">Peças acabando</h2>
        {acabando.length === 0 ? (
          <p className="m-0 text-xl">Nenhuma peça está acabando. Tudo certo!</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {acabando.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-areia-escura py-3 first:border-t-0"
              >
                <span className="text-xl font-bold">
                  {[p.nome, p.tamanho].filter(Boolean).join(" · ")}
                </span>
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
        <Link to="/estoque" className="mt-4 inline-block text-xl font-bold text-folha">
          Ver o estoque
        </Link>
      </section>
    </div>
  );
}
