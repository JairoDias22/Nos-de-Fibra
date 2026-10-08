import type { ReactNode } from "react";

export type NomeIcone = "casa" | "carrinho" | "caixa" | "moeda" | "grafico";

const caminhos: Record<NomeIcone, ReactNode> = {
  casa: <path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6" />,
  carrinho: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h3l2.5 11h9.5l2-8H7" />
    </>
  ),
  caixa: (
    <>
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  moeda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v1.5M12 16.5V18" />
    </>
  ),
  grafico: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
};

type Props = { nome: NomeIcone; tamanho?: number; className?: string };

export function Icone({ nome, tamanho = 28, className }: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {caminhos[nome]}
    </svg>
  );
}
