import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatarData, formatarMoeda, hojeISO, intervaloDoMes, lerValor } from "../lib/formatar";
import SeletorMes from "../components/SeletorMes";
import CabecalhoPagina from "../components/CabecalhoPagina";
import type { Lancamento } from "../types";

type Tipo = "entrada" | "saida";

const CATEGORIAS: Record<Tipo, string[]> = {
  entrada: ["Doação", "Oficina", "Encomenda", "Outros"],
  saida: ["Material", "Transporte", "Embalagem", "Divulgação", "Outros"],
};

const campo =
  "w-full rounded-2xl border-2 border-transparent bg-areia px-5 py-4 text-xl outline-none focus:border-folha";

export default function Dinheiro() {
  const hoje = new Date();
  const [ref, setRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [versao, setVersao] = useState(0);

  const [novo, setNovo] = useState<Tipo | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [apagando, setApagando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroCarga(false);
      const { inicio, fim } = intervaloDoMes(ref.ano, ref.mes);
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
    setEditando(null);
    setNovo(tipo);
    setCategoria("");
    setValor("");
    setDescricao("");
    setData(hojeISO());
    setErro(null);
  }

  function abrirEdicao(l: Lancamento) {
    setEditando(l.id);
    setNovo(l.tipo);
    setCategoria(l.categoria);
    setValor(String(l.valor).replace(".", ","));
    setDescricao(l.descricao ?? "");
    setData(l.data);
    setErro(null);
    setApagando(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fecharFormulario() {
    setNovo(null);
    setEditando(null);
  }

  // Se o lançamento tem uma categoria que não está na lista, ela continua aparecendo para escolher.
  const categoriasDoFormulario = novo
    ? !categoria || CATEGORIAS[novo].includes(categoria)
      ? CATEGORIAS[novo]
      : [...CATEGORIAS[novo], categoria]
    : [];

  const valorNumero = lerValor(valor);
  const formularioOk = Boolean(categoria) && Number.isFinite(valorNumero) && valorNumero > 0 && Boolean(data);

  async function salvar() {
    if (!novo || !formularioOk || salvando) return;
    setSalvando(true);
    setErro(null);

    const dados = {
      categoria,
      descricao: descricao.trim() || null,
      valor: valorNumero,
      data,
    };
    const { error } = editando
      ? await supabase.from("lancamentos").update(dados).eq("id", editando)
      : await supabase.from("lancamentos").insert({ tipo: novo, ...dados });

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
    setEditando(null);
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
      <CabecalhoPagina icone="moeda" titulo="Dinheiro" texto="O que entrou e o que saiu" cor="fibra" />

      <SeletorMes ano={ref.ano} mes={ref.mes} onMudar={mudarMes} />

      {/* Totais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="cartao px-6 py-5">
          <div className="text-lg">Entrou</div>
          <div className="font-display text-3xl font-bold text-folha">{formatarMoeda(totais.entrou)}</div>
        </div>
        <div className="cartao px-6 py-5">
          <div className="text-lg">Saiu</div>
          <div className="font-display text-3xl font-bold text-terracota">{formatarMoeda(totais.saiu)}</div>
        </div>
        <div className="cartao px-6 py-5">
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
        <div className="flex flex-col gap-4 cartao p-6">
          <h2 className="m-0 font-display text-3xl font-bold">
            {editando ? "Corrigir lançamento" : novo === "entrada" ? "Entrou dinheiro" : "Saiu dinheiro"}
          </h2>

          <div>
            <div className="mb-2 text-xl font-bold">Para quê?</div>
            <div className="flex flex-wrap gap-2">
              {categoriasDoFormulario.map((c) => (
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
            onClick={fecharFormulario}
            className="cursor-pointer rounded-2xl border-2 border-folha bg-transparent px-6 py-3 text-xl font-bold text-folha"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Lista do mês */}
      <div className="cartao px-6 py-2">
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
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEdicao(l)}
                        className="cursor-pointer rounded-lg border-2 border-areia-escura bg-transparent px-3 py-1 text-base font-bold text-tinta"
                      >
                        Corrigir
                      </button>
                      <button
                        onClick={() => setApagando(l.id)}
                        className="cursor-pointer rounded-lg border-2 border-areia-escura bg-transparent px-3 py-1 text-base font-bold text-tinta"
                      >
                        Apagar
                      </button>
                    </span>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
