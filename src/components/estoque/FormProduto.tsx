import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { lerValor } from "../../lib/formatar";
import { campo } from "../../lib/estilos";
import type { Produto } from "../../types";

type Props = {
  /** Se vier preenchido, o formulário edita essa peça; senão, cadastra uma nova. */
  inicial?: Produto;
  categorias: string[];
  onSalvo: (aviso: string) => void;
  onCancelar: () => void;
};

function paraTexto(n: number | null | undefined) {
  return n == null ? "" : String(n).replace(".", ",");
}

const chip = (ativo: boolean) =>
  `cursor-pointer rounded-full border-2 px-5 py-2 text-lg font-bold ${
    ativo ? "border-folha bg-folha text-white" : "border-folha bg-transparent text-folha"
  }`;

export default function FormProduto({ inicial, categorias, onSalvo, onCancelar }: Props) {
  const editando = Boolean(inicial);

  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [categoria, setCategoria] = useState(inicial?.categoria ?? "");
  const [outra, setOutra] = useState(categorias.length === 0);
  const [tamanho, setTamanho] = useState(inicial?.tamanho ?? "");
  const [unidade, setUnidade] = useState(inicial?.unidade ?? "unid");
  const [preco, setPreco] = useState(paraTexto(inicial?.preco_venda));
  const [custo, setCusto] = useState(paraTexto(inicial?.custo_unit));
  const [minimo, setMinimo] = useState(String(inicial?.estoque_minimo ?? 2));
  const [qtd, setQtd] = useState("0");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const precoN = lerValor(preco);
  const custoN = custo.trim() === "" ? null : lerValor(custo);
  const minimoN = minimo.trim() === "" ? 0 : Number(minimo);
  const qtdN = qtd.trim() === "" ? 0 : Number(qtd);

  const ok =
    nome.trim() !== "" &&
    categoria.trim() !== "" &&
    Number.isFinite(precoN) &&
    precoN > 0 &&
    (custoN === null || (Number.isFinite(custoN) && custoN >= 0)) &&
    Number.isInteger(minimoN) &&
    minimoN >= 0 &&
    (editando || (Number.isInteger(qtdN) && qtdN >= 0));

  async function salvar() {
    if (!ok || salvando) return;
    setSalvando(true);
    setErro(null);

    const dados = {
      nome: nome.trim(),
      categoria: categoria.trim(),
      tamanho: tamanho.trim() || null,
      unidade,
      preco_venda: precoN,
      custo_unit: custoN,
      estoque_minimo: minimoN,
    };

    if (inicial) {
      const { error } = await supabase.from("produtos").update(dados).eq("id", inicial.id);
      setSalvando(false);
      if (error) {
        setErro("Não foi possível salvar. Confira a internet e tente de novo.");
        return;
      }
      onSalvo("Pronto! A peça foi atualizada.");
      return;
    }

    const { data, error } = await supabase.from("produtos").insert(dados).select("id").single();
    if (error || !data) {
      setSalvando(false);
      setErro("Não foi possível cadastrar. Confira a internet e tente de novo.");
      return;
    }

    if (qtdN > 0) {
      const mov = await supabase
        .from("movimentos_estoque")
        .insert({ produto_id: data.id, tipo: "entrada", quantidade: qtdN, origem: "Cadastro da peça" });
      if (mov.error) {
        setSalvando(false);
        onSalvo(
          "A peça foi cadastrada, mas não deu para anotar a quantidade. Toque na peça e use \"Entrou mais\".",
        );
        return;
      }
    }

    setSalvando(false);
    onSalvo("Pronto! A peça foi cadastrada.");
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-xl font-bold">
        Nome da peça
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Pirex mangue com branco"
          className={campo}
        />
      </label>

      <div>
        <div className="mb-2 text-xl font-bold">Tipo da peça</div>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => {
                setOutra(false);
                setCategoria(c);
              }}
              className={chip(!outra && categoria === c)}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => {
              setOutra(true);
              setCategoria("");
            }}
            className={chip(outra)}
          >
            Outro tipo
          </button>
        </div>
        {outra && (
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Escreva o tipo, ex.: Bolsa"
            aria-label="Novo tipo de peça"
            className={`${campo} mt-3`}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xl font-bold">
          Tamanho (se tiver)
          <input
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            placeholder="Ex.: 28cm"
            className={campo}
          />
        </label>
        <div>
          <div className="mb-2 text-xl font-bold">Vende por</div>
          <div className="flex gap-2">
            <button onClick={() => setUnidade("unid")} className={chip(unidade === "unid")}>
              Unidade
            </button>
            <button onClick={() => setUnidade("par")} className={chip(unidade === "par")}>
              Par
            </button>
          </div>
        </div>
        <label className="flex flex-col gap-2 text-xl font-bold">
          Preço de venda (R$)
          <input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col gap-2 text-xl font-bold">
          Quanto custa fazer (R$, se souber)
          <input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col gap-2 text-xl font-bold">
          Avisar que está acabando com até
          <input inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value)} className={campo} />
        </label>
        {!editando && (
          <label className="flex flex-col gap-2 text-xl font-bold">
            Quantas já tem agora
            <input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} className={campo} />
          </label>
        )}
      </div>

      {erro && (
        <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
          {erro}
        </p>
      )}

      <button
        onClick={salvar}
        disabled={!ok || salvando}
        className="cursor-pointer rounded-2xl border-0 bg-ouro px-6 py-5 text-2xl font-extrabold text-tinta disabled:cursor-not-allowed disabled:opacity-50"
      >
        {salvando ? "Salvando..." : editando ? "Salvar mudanças" : "Cadastrar peça"}
      </button>
      <button
        onClick={onCancelar}
        className="cursor-pointer rounded-2xl border-2 border-folha bg-transparent px-6 py-3 text-xl font-bold text-folha"
      >
        Cancelar
      </button>
    </div>
  );
}
