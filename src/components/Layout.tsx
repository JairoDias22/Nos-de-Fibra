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

/** Marca do ponto de cultura: os arcos de fibra num quadrado verde. */
function Marca({ tamanho = 40 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2F7A4C" />
      <path d="M14 46c6-18 14-26 18-26s12 8 18 26" fill="none" stroke="#E8B84A" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 46c3-9 7-14 10-14s7 5 10 14" fill="none" stroke="#F4F7F3" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function Layout() {
  const { sair } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Menu lateral (computador) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-areia-escura bg-white md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <Marca />
          <div>
            <div className="text-xl font-extrabold leading-tight">Nós de Fibra</div>
            <div className="text-sm opacity-70">Ponto de Cultura</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {itens.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-lg font-bold no-underline ${
                  isActive ? "bg-folha-clara text-folha" : "text-tinta hover:bg-areia"
                }`
              }
            >
              <Icone nome={item.icone} tamanho={24} />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={sair}
          className="mx-3 mb-6 mt-auto cursor-pointer rounded-xl border border-areia-escura bg-white px-4 py-3 text-lg font-bold text-tinta hover:bg-areia"
        >
          Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular) */}
        <header className="flex items-center justify-between border-b border-areia-escura bg-white px-5 py-3 md:hidden">
          <span className="flex items-center gap-2 text-xl font-extrabold">
            <Marca tamanho={32} />
            Nós de Fibra
          </span>
          <button
            onClick={sair}
            className="cursor-pointer rounded-lg border border-areia-escura bg-white px-3 py-1 text-base font-bold text-tinta"
          >
            Sair
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 pb-28 md:px-10 md:py-9 md:pb-9">
          <Outlet />
        </main>
      </div>

      {/* Menu de baixo (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-areia-escura bg-white md:hidden">
        {itens.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end={item.para === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 border-t-4 py-2 text-sm font-bold no-underline ${
                isActive ? "border-folha bg-folha-clara text-folha" : "border-transparent text-tinta"
              }`
            }
          >
            <Icone nome={item.icone} tamanho={24} />
            {item.rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
