import { Link } from "react-router-dom";
import { Icone, type NomeIcone } from "../components/Icones";
import BotaoPlanilha from "../components/BotaoPlanilha";

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
  chip: string;
}[] = [
  { para: "/vender", titulo: "Vender", texto: "Registrar uma venda nova", icone: "carrinho", chip: "bg-folha-clara text-folha" },
  { para: "/estoque", titulo: "Estoque", texto: "Ver e cadastrar as peças", icone: "caixa", chip: "bg-terracota-clara text-terracota" },
  { para: "/dinheiro", titulo: "Dinheiro", texto: "O que entrou e o que saiu", icone: "moeda", chip: "bg-fibra-clara text-fibra" },
  { para: "/resumo", titulo: "Resumo", texto: "Como estão as vendas", icone: "grafico", chip: "bg-ouro-clara text-[#7A5508]" },
];

export default function Inicio() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-4xl font-extrabold md:text-5xl">{saudacao()}</h1>
        <p className="mb-0 mt-2 text-xl opacity-70 md:text-2xl">O que vamos fazer hoje?</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {atalhos.map((a) => (
          <Link
            key={a.para}
            to={a.para}
            className="cartao flex items-center gap-5 p-6 text-tinta no-underline hover:border-folha"
          >
            <span className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${a.chip}`}>
              <Icone nome={a.icone} tamanho={34} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-extrabold">{a.titulo}</span>
              <span className="block text-lg opacity-70">{a.texto}</span>
            </span>
            <span aria-hidden="true" className="text-3xl opacity-40">
              ›
            </span>
          </Link>
        ))}
      </div>

      <BotaoPlanilha />
    </div>
  );
}
