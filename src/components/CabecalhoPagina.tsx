import { Icone, type NomeIcone } from "./Icones";

type Props = {
  icone: NomeIcone;
  titulo: string;
  texto?: string;
  /** Cor da faixa, igual à do botão dessa tela na página inicial. Ex.: «bg-folha text-white». */
  cor: string;
};

/** Faixa colorida no topo de cada tela, para a pessoa saber onde está só de olhar a cor. */
export default function CabecalhoPagina({ icone, titulo, texto, cor }: Props) {
  return (
    <header className={`trancado ${cor} flex items-center gap-4 rounded-3xl px-6 py-5`}>
      <Icone nome={icone} tamanho={44} />
      <div>
        <h1 className="m-0 font-display text-3xl font-bold md:text-4xl">{titulo}</h1>
        {texto && <p className="m-0 text-lg md:text-xl">{texto}</p>}
      </div>
    </header>
  );
}
