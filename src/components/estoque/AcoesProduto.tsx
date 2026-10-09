import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { rotuloUnidade } from "../../lib/formatar";
import { campo } from "../../lib/estilos";
import type { ProdutoComSaldo } from "../../types";
import FormProduto from "./FormProduto";

type Modo = null | "entrada" | "ajuste" | "editar" | "tirar";

type Props = {
  produto: ProdutoComSaldo;
  categorias: string[];
  onFeito: (aviso: string) => void;
};

const botaoGrande =
  "cursor-pointer rounded-2xl px-5 py-4 text-xl font-extrabold";

export default function AcoesProduto({ produto, categorias, onFeito }: Props) {
  const [modo, setModo] = useState<Modo>(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const numero = Number(texto);
  const inteiro = texto.trim() !== "" && Number.isInteger(numero);

  function abrir(m: Modo) {
    setModo(m);
    setTexto("");
    setErro(null);
  }

  async function executar(
    pedido: PromiseLike<{ error: unknown }>,
    sucesso: string,
  ) {
    setSalvando(true);
    setErro(null);
    const { error } = await pedido;
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar. Confira a internet e tente de novo.");
      return;
    }
    onFeito(sucesso);
  }

  function registrarEntrada() {
    if (!inteiro || numero <= 0 || salvando) return;
    executar(
      supabase
        .from("movimentos_estoque")
        .insert({ produto_id: produto.id, tipo: "entrada", quantidade: numero, origem: "Produção" }),
      `Pronto! Entraram ${numero} ${rotuloUnidade(produto.unidade, numero)} de "${produto.nome}" no estoque.`,
    );
  }

  function corrigirContagem() {
    const diferenca = numero - produto.saldo;
    if (!inteiro || numero < 0 || diferenca === 0 || salvando) return;
    executar(
      supabase
        .from("movimentos_estoque")
        .insert({ produto_id: produto.id, tipo: "ajuste", quantidade: diferenca, origem: "Correção de contagem" }),
      `Pronto! Agora o estoque de "${produto.nome}" mostra ${numero}.`,
    );
  }

  function tirarDaLista() {
    if (salvando) return;
    executar(
      supabase.from("produtos").update({ ativo: false }).eq("id", produto.id),
      `Pronto! "${produto.nome}" saiu da lista. As vendas antigas continuam guardadas.`,
    );
  }

  const rotulo = rotuloUnidade(produto.unidade, 2);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-areia-escura p-5">
      {modo === null && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={() => abrir("entrada")} className={`${botaoGrande} border-0 bg-folha text-white`}>
            + Entrou mais
          </button>
          <button
            onClick={() => abrir("ajuste")}
            className={`${botaoGrande} border-2 border-folha bg-transparent text-folha`}
          >
            Corrigir a contagem
          </button>
          <button
            onClick={() => abrir("editar")}
            className={`${botaoGrande} border-2 border-folha bg-transparent text-folha`}
          >
            Editar a peça
          </button>
          <button
            onClick={() => abrir("tirar")}
            className={`${botaoGrande} border-2 border-terracota bg-transparent text-terracota`}
          >
            Tirar da lista
          </button>
        </div>
      )}

      {modo === "entrada" && (
        <>
          <label className="flex flex-col gap-2 text-xl font-bold">
            Quantos {rotulo} entraram?
            <input
              inputMode="numeric"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: 3"
              className={campo}
            />
          </label>
          <button
            onClick={registrarEntrada}
            disabled={!inteiro || numero <= 0 || salvando}
            className={`${botaoGrande} border-0 bg-ouro text-tinta disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {salvando ? "Salvando..." : "Anotar entrada"}
          </button>
        </>
      )}

      {modo === "ajuste" && (
        <>
          <p className="m-0 text-xl">
            O sistema mostra <strong>{produto.saldo}</strong>. Quantos {rotulo} tem de verdade agora?
          </p>
          <input
            inputMode="numeric"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Quantidade real em estoque"
            className={campo}
          />
          {inteiro && numero >= 0 && numero === produto.saldo && (
            <p className="m-0 text-lg font-bold">Já está igual ao sistema, não precisa corrigir.</p>
          )}
          <button
            onClick={corrigirContagem}
            disabled={!inteiro || numero < 0 || numero === produto.saldo || salvando}
            className={`${botaoGrande} border-0 bg-ouro text-tinta disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {salvando ? "Salvando..." : "Corrigir"}
          </button>
        </>
      )}

      {modo === "editar" && (
        <FormProduto
          inicial={produto}
          categorias={categorias}
          onSalvo={onFeito}
          onCancelar={() => setModo(null)}
        />
      )}

      {modo === "tirar" && (
        <>
          <p className="m-0 text-xl font-bold">
            Tirar "{produto.nome}" da lista? As vendas antigas continuam guardadas.
          </p>
          <button onClick={tirarDaLista} disabled={salvando} className={`${botaoGrande} border-0 bg-terracota text-white`}>
            {salvando ? "Salvando..." : "Sim, tirar da lista"}
          </button>
        </>
      )}

      {erro && (
        <p role="alert" className="m-0 text-xl font-bold text-[#7A2A12]">
          {erro}
        </p>
      )}

      {modo !== null && modo !== "editar" && (
        <button
          onClick={() => setModo(null)}
          className="cursor-pointer rounded-2xl border-2 border-folha bg-transparent px-6 py-3 text-xl font-bold text-folha"
        >
          Voltar
        </button>
      )}
    </div>
  );
}
