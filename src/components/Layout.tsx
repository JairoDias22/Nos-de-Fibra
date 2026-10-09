import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Icone, type NomeIcone } from "./Icones";

const itens: { para: string; rotulo: string; icone: NomeIcone }[] = [
  { para: "/", rotulo: "Início", icone: "casa" },
  { para: "/vender", rotulo: "Vender", icone: "carrinho" },
  { para: "/estoque", rotulo: "Estoque", icone: "caixa" },
  { para: "/dinheiro", rotulo: "Dinheiro", icone: "moeda" },
  { para: "/resumo", rotulo: "Resumo", icone: "grafico" },
];

export default function Layout() {
  const { sair } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Menu lateral (computador) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-folha text-white md:flex">
        <div className="trancado px-6 py-7">
          <div className="font-display text-3xl font-bold leading-tight">Nós de Fibra</div>
          <div className="text-base">Ponto de Cultura</div>
        </div>
        <nav className="flex flex-col gap-2 px-3.5 py-5">
          {itens.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3.5 text-xl font-bold no-underline ${
                  isActive ? "bg-ouro text-tinta" : "text-white hover:bg-white/10"
                }`
              }
            >
              <Icone nome={item.icone} tamanho={26} />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={sair}
          className="mx-3.5 mb-6 mt-auto cursor-pointer rounded-xl border-2 border-white/40 bg-transparent px-4 py-3 text-lg font-bold text-white hover:bg-white/10"
        >
          Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular) */}
        <header className="trancado flex items-center justify-between bg-folha px-5 py-3 text-white md:hidden">
          <span className="font-display text-xl font-bold">Nós de Fibra</span>
          <button
            onClick={sair}
            className="cursor-pointer rounded-lg border-2 border-white/40 bg-transparent px-3 py-1 text-base font-bold text-white"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 px-5 py-6 pb-28 md:px-11 md:py-9 md:pb-9">
          <Outlet />
        </main>
      </div>

      {/* Menu de baixo (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex bg-folha text-white md:hidden">
        {itens.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end={item.para === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-sm font-bold no-underline ${
                isActive ? "bg-ouro text-tinta" : "text-white"
              }`
            }
          >
            <Icone nome={item.icone} tamanho={26} />
            {item.rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
