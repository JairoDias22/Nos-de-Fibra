import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatarData, formatarMoeda, hojeISO, lerValor } from "../lib/formatar";
import type { Lancamento } from "../types";

type Tipo = "entrada" | "saida";

const CATEGORIAS: Record<Tipo, string[]> = {
  entrada: ["Doação", "Oficina", "Encomenda", "Outros"],
  saida: ["Material", "Transporte", "Embalagem", "Divulgação", "Outros"],
};

const campo =
  "w-full rounded-2xl border-2 border-transparent bg-areia px-5 py-4 text-xl outline-none focus:border-folha";

function dois(n: number) {
  return String(n).padStart(2, "0");
}

/** Primeiro dia do mês e primeiro dia do mês seguinte, no formato AAAA-MM-DD. */
function intervalo(ano: number, mes: number) {
  const inicio = `${ano}-${dois(mes + 1)}-01`;
  const fim = mes === 11 ? `${ano + 1}-01-01` : `${ano}-${dois(mes + 2)}-01`;
  return { inicio, fim };
}

function nomeDoMes(ano: number, mes: number) {
  const texto = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(ano, mes, 1),
  );
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Dinheiro() {
  const hoje = new Date();
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [versao, setVersao] = useState(0);

  const [novo, setNovo] = useState<Tipo | null>(null);
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [apagando, setApagando] = useState<string | null>(null);

  const mesAtual = ref.ano === hoje.getFullYear() && ref.mes === hoje.getMonth();

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroCarga(false);
      const { inicio, fim } = intervalo(ref.ano, ref.mes);
      const { data: linhas, error } = await supabase
        .from("lancamentos")
        .select("id, tipo, categoria, descricao, valor, data, venda_id")
        .gte("data", inicio)
        .lt("data", fim)
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false });
      if (!ativo) return;

      if (error) setErroCarga(true);
      else setLancamentos((linhas ?? []) as Lancamento[]);
      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [ref.ano, ref.mes, versao]);

  const totais = useMemo(() => {
    const entrou = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
    const saiu = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
    return { entrou, saiu, sobrou: entrou - saiu };
  }, [lancamentos]);

  function mudarMes(delta: number) {
    setRef((r) => {
      const d = new Date(r.ano, r.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  function abrirFormulario(tipo: Tipo) {
    setNovo(tipo);
    setCategoria("");
    setValor("");
    setDescricao("");
    setData(hojeISO());
    setErro(null);
  }

  const valorNumero = lerValor(valor);
  const formularioOk = Boolean(categoria) && Number.isFinite(valorNumero) && valorNumero > 0 && Boolean(data);

  async function salvar() {
    if (!novo || !formularioOk || salvando) return;
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from("lancamentos").insert({
      tipo: novo,
      categoria,
      descricao: descricao.trim() || null,
      valor: valorNumero,
      data,
    });

    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar. Confira a internet e tente de novo.");
      return;
    }

    // Mostra o mês em que o lançamento caiu, para a pessoa ver o que acabou de anotar.
    const [ano, mes] = data.split("-").map(Number);
    setRef({ ano, mes: mes - 1 });
    setVersao((v) => v + 1);
    setNovo(null);
  }

  async function apagar(id: string) {
    const { error } = await supabase.from("lancamentos").delete().eq("id", id);
    setApagando(null);
    if (error) {
      setErroCarga(true);
      return;
    }
    setVersao((v) => v + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 font-display text-4xl font-bold md:text-5xl">Dinheiro</h1>

      {/* Mês */}
      <div className="flex items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3">
        <button
          onClick={() => mudarMes(-1)}
          className="cursor-pointer rounded-xl border-0 bg-areia-escura px-4 py-2 text-lg font-bold text-tinta"
        >
          ‹ Anterior
        </button>
        <span className="text-center font-display text-2xl font-bold">{nomeDoMes(ref.ano, ref.mes)}</span>
        <button
          onClick={() => mudarMes(1)}
          disabled={mesAtual}
          className="cursor-pointer rounded-xl border-0 bg-areia-escura px-4 py-2 text-lg font-bold text-tinta disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próximo ›
        </button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white px-6 py-5">
          <div className="text-lg">Entrou</div>
          <div className="font-display text-3xl font-bold text-folha">{formatarMoeda(totais.entrou)}</div>
        </div>
        <div className="rounded-3xl bg-white px-6 py-5">
          <div className="text-lg">Saiu</div>
          <div className="font-display text-3xl font-bold text-terracota">{formatarMoeda(totais.saiu)}</div>
        </div>
        <div className="rounded-3xl bg-white px-6 py-5">
          <div className="text-lg">Sobrou</div>
          <div
            className={`font-display text-3xl font-bold ${totais.sobrou < 0 ? "text-terracota" : "text-tinta"}`}
          >
            {formatarMoeda(totais.sobrou)}
          </div>
        </div>
      </div>

      {/* Botões ou formulário */}
      {!novo ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => abrirFormulario("entrada")}
            className="cursor-pointer rounded-2xl border-0 bg-folha px-6 py-5 text-2xl font-extrabold text-white"
          >
            + Entrou dinheiro
          </button>
          <button
            onClick={() => abrirFormulario("saida")}
            className="cursor-pointer rounded-2xl border-0 bg-terracota px-6 py-5 text-2xl font-extrabold text-white"
          >
            − Saiu dinheiro
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6">
          <h2 className="m-0 font-display text-3xl font-bold">
            {novo === "entrada" ? "Entrou dinheiro" : "Saiu dinheiro"}
          </h2>

          <div>
            <div className="mb-2 text-xl font-bold">Para quê?</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS[novo].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  className={`cursor-pointer rounded-full border-2 px-5 py-2 text-lg font-bold ${
                    categoria === c
                      ? "border-folha bg-folha text-white"
                      : "border-folha bg-transparent text-folha"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2 text-xl font-bold">
            Valor (R$)
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={campo} />
          </label>
          <label className="flex flex-col gap-2 text-xl font-bold">
            Observação (se quiser)
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: compra de fita"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-2 text-xl font-bold">
            Data
            <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} className={campo} />
          </label>

          {erro && (
            <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
              {erro}
            </p>
          )}

          <button
            onClick={salvar}
            disabled={!formularioOk || salvando}
            className="cursor-pointer rounded-2xl border-0 bg-ouro px-6 py-5 text-2xl font-extrabold text-tinta disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={() => setNovo(null)}
            className="cursor-pointer rounded-2xl border-2 border-folha bg-transparent px-6 py-3 text-xl font-bold text-folha"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Lista do mês */}
      <div className="rounded-3xl bg-white px-6 py-2">
        {carregando && <p className="text-xl font-bold">Carregando...</p>}
        {erroCarga && (
          <p role="alert" className="text-xl font-bold text-[#7A2A12]">
            Não foi possível carregar. Confira a internet e tente de novo.
          </p>
        )}
        {!carregando && !erroCarga && lancamentos.length === 0 && (
          <p className="text-xl font-bold">Nada anotado neste mês ainda.</p>
        )}
        <ul className="m-0 list-none p-0">
          {lancamentos.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-areia-escura py-4 first:border-t-0"
            >
              <div className="min-w-0">
                <div className="text-xl font-bold">{l.descricao || l.categoria}</div>
                <div className="text-base opacity-75">
                  {l.categoria} · {formatarData(l.data)}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-xl font-extrabold ${l.tipo === "entrada" ? "text-folha" : "text-terracota"}`}
                >
                  {l.tipo === "entrada" ? "+" : "−"} {formatarMoeda(l.valor)}
                </span>
                {!l.venda_id &&
                  (apagando === l.id ? (
                    <span className="flex items-center gap-2 text-base font-bold">
                      Apagar mesmo?
                      <button
                        onClick={() => apagar(l.id)}
                        className="cursor-pointer rounded-lg border-0 bg-terracota px-3 py-1 text-base font-bold text-white"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setApagando(null)}
                        className="cursor-pointer rounded-lg border-2 border-folha bg-transparent px-3 py-1 text-base font-bold text-folha"
                      >
                        Não
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setApagando(l.id)}
                      className="cursor-pointer rounded-lg border-2 border-areia-escura bg-transparent px-3 py-1 text-base font-bold text-tinta"
                    >
                      Apagar
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
