import { Link } from "react-router-dom";
import { Icone, type NomeIcone } from "../components/Icones";

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia!";
  if (hora < 18) return "Boa tarde!";
  return "Boa noite!";
}

const atalhos: {
  para: string;
  titulo: string;
  texto: string;
  icone: NomeIcone;
  cor: string;
}[] = [
  { para: "/vender", titulo: "Vender", texto: "Registrar uma venda nova", icone: "carrinho", cor: "bg-folha text-white" },
  { para: "/estoque", titulo: "Estoque", texto: "Ver e cadastrar as peças", icone: "caixa", cor: "bg-terracota text-white" },
  { para: "/dinheiro", titulo: "Dinheiro", texto: "O que entrou e o que saiu", icone: "moeda", cor: "bg-fibra text-white" },
  { para: "/resumo", titulo: "Resumo", texto: "Como está indo o mês", icone: "grafico", cor: "bg-ouro text-tinta" },
];

export default function Inicio() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-4xl font-bold md:text-5xl">{saudacao()}</h1>
        <p className="mb-0 mt-2 text-xl md:text-2xl">O que vamos fazer hoje?</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {atalhos.map((a) => (
          <Link
            key={a.para}
            to={a.para}
            className={`${a.cor} flex min-h-44 flex-col gap-2 rounded-3xl p-7 no-underline`}
          >
            <Icone nome={a.icone} tamanho={44} />
            <span className="font-display text-3xl font-bold">{a.titulo}</span>
            <span className="text-xl">{a.texto}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
