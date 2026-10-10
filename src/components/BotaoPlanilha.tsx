import { useState } from "react";
import { baixarPlanilha } from "../lib/planilha";

/** Botão que gera o Excel com estoque, vendas e dinheiro e baixa no aparelho. */
export default function BotaoPlanilha() {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);

  async function aoClicar() {
    setGerando(true);
    setErro(false);
    try {
      await baixarPlanilha();
    } catch {
      setErro(true);
    }
    setGerando(false);
  }

  return (
    <div className="cartao flex flex-col gap-3 p-6">
      <div>
        <div className="text-2xl font-extrabold">Planilha</div>
        <div className="text-lg opacity-70">Baixe uma cópia do estoque, das vendas e do dinheiro em Excel.</div>
      </div>
      <button
        type="button"
        onClick={aoClicar}
        disabled={gerando}
        className="cursor-pointer self-start rounded-2xl border-0 bg-folha px-6 py-3 text-xl font-extrabold text-white disabled:opacity-60"
      >
        {gerando ? "Preparando a planilha..." : "Baixar planilha"}
      </button>
      {erro && (
        <p role="alert" className="m-0 rounded-2xl bg-[#F0C3B6] px-5 py-3 text-lg font-bold text-[#7A2A12]">
          Não consegui montar a planilha agora. Confira a internet e tente de novo.
        </p>
      )}
    </div>
  );
}
