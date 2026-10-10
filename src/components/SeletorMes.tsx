import { nomeDoMes } from "../lib/formatar";

type Props = {
  ano: number;
  /** De 0 (janeiro) a 11 (dezembro). */
  mes: number;
  onMudar: (delta: number) => void;
};

export default function SeletorMes({ ano, mes, onMudar }: Props) {
  const hoje = new Date();
  const mesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();

  return (
    <div className="flex items-center justify-between gap-3 cartao px-4 py-3">
      <button
        onClick={() => onMudar(-1)}
        className="cursor-pointer rounded-xl border-0 bg-areia-escura px-4 py-2 text-lg font-bold text-tinta"
      >
        ‹ Anterior
      </button>
      <span className="text-center font-display text-2xl font-bold">{nomeDoMes(ano, mes)}</span>
      <button
        onClick={() => onMudar(1)}
        disabled={mesAtual}
        className="cursor-pointer rounded-xl border-0 bg-areia-escura px-4 py-2 text-lg font-bold text-tinta disabled:cursor-not-allowed disabled:opacity-40"
      >
        Próximo ›
      </button>
    </div>
  );
}
