import { Icone, type NomeIcone } from "./Icones";

/** Cada tela tem sua cor, a mesma do atalho dela na página inicial. */
const cores = {
  folha: "bg-folha-clara text-folha",
  terracota: "bg-terracota-clara text-terracota",
  fibra: "bg-fibra-clara text-fibra",
  ouro: "bg-ouro-clara text-[#7A5508]",
} as const;

export type CorPagina = keyof typeof cores;

type Props = {
  icone: NomeIcone;
  titulo: string;
  texto?: string;
  cor: CorPagina;
};

/** Título da tela: ícone colorido, nome e uma frase curta. */
export default function CabecalhoPagina({ icone, titulo, texto, cor }: Props) {
  return (
    <header className="flex items-center gap-4">
      <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${cores[cor]}`}>
        <Icone nome={icone} tamanho={30} />
      </span>
      <div>
        <h1 className="m-0 text-3xl font-extrabold leading-tight md:text-4xl">{titulo}</h1>
        {texto && <p className="m-0 text-lg opacity-70">{texto}</p>}
      </div>
    </header>
  );
}
