import { formatarMoeda } from "../lib/formatar";

export type Ponto = {
  /** Texto curto embaixo da coluna (dia do mês, «Seg», «Jan»). */
  rotulo: string;
  /** Segunda linha opcional embaixo da coluna (número do dia, na visão da semana). */
  sub?: string;
  valor: number;
  pecas: number;
  /** Texto completo, mostrado ao tocar na coluna. Ex.: «Segunda-feira, 12 de outubro». */
  detalhe: string;
};

/** Escolhe um teto «redondo» para o gráfico e as linhas de grade (0, 25, 50, 75, 100...). */
function escala(maximo: number) {
  if (maximo <= 0) return { topo: 100, ticks: [0, 25, 50, 75, 100] };
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const fator = bruto / potencia;
  const passo = (fator <= 1 ? 1 : fator <= 2 ? 2 : fator <= 2.5 ? 2.5 : fator <= 5 ? 5 : 10) * potencia;
  const topo = Math.ceil(maximo / passo - 1e-9) * passo;
  const ticks: number[] = [];
  for (let t = 0; t <= topo + passo / 1000; t += passo) ticks.push(Math.round(t * 100) / 100);
  return { topo, ticks };
}

function rotuloEixo(valor: number) {
  if (valor >= 1000) return `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;
}

const ALTURA = "h-64 md:h-80";
const LARGURA_EIXO = "w-16";

type GraficoProps = {
  pontos: Ponto[];
  /** Coluna destacada. */
  selecionado: number | null;
  onSelecionar: (indice: number) => void;
};

/** Gráfico de colunas: uma por dia (ou por mês, na visão do ano), com grade e valor ao tocar. */
export function GraficoBarras({ pontos, selecionado, onSelecionar }: GraficoProps) {
  const maximo = Math.max(...pontos.map((p) => p.valor), 0);
  const { topo, ticks } = escala(maximo);
  const muitos = pontos.length > 12;

  return (
    <div>
      <div className="flex gap-3">
        <div className={`relative ${ALTURA} ${LARGURA_EIXO} shrink-0`} aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 translate-y-1/2 whitespace-nowrap text-xs opacity-60"
              style={{ bottom: `${(t / topo) * 100}%` }}
            >
              {rotuloEixo(t)}
            </span>
          ))}
        </div>

        <div className={`relative ${ALTURA} min-w-0 flex-1`}>
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-areia-escura"
              style={{ bottom: `${(t / topo) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5 sm:gap-1">
            {pontos.map((p, i) => {
              const ativo = i === selecionado;
              return (
                <button
                  key={i}
                  onClick={() => onSelecionar(i)}
                  onMouseEnter={() => onSelecionar(i)}
                  onFocus={() => onSelecionar(i)}
                  aria-label={`${p.detalhe}: ${formatarMoeda(p.valor)}`}
                  className="relative flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center border-0 bg-transparent p-0"
                >
                  <span
                    className="block w-full max-w-12 rounded-t-lg transition-[height] duration-500"
                    style={{
                      height: p.valor > 0 ? `${Math.max((p.valor / topo) * 100, 1.5)}%` : "3px",
                      background:
                        p.valor <= 0
                          ? "#D5DDD2"
                          : ativo
                            ? "linear-gradient(to top, #2F7A4C, #62B183)"
                            : "linear-gradient(to top, #A9D3B8, #D3EADC)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-3" aria-hidden="true">
        <div className={`${LARGURA_EIXO} shrink-0`} />
        <div className="flex min-w-0 flex-1 gap-0.5 sm:gap-1">
          {pontos.map((p, i) => {
            const mostrar = !muitos || i === 0 || (i + 1) % 5 === 0;
            return (
              <div
                key={i}
                className={`flex min-w-0 flex-1 flex-col items-center text-xs sm:text-sm ${
                  i === selecionado ? "font-extrabold" : "opacity-70"
                }`}
              >
                {mostrar && <span className="whitespace-nowrap">{p.rotulo}</span>}
                {mostrar && p.sub && <span className="whitespace-nowrap">{p.sub}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Item = { rotulo: string; valor: number; texto: string };

/** Uma barra comprida por item, a maior ocupando a largura toda. */
export function BarrasHorizontais({ itens, cor = "linear-gradient(to right, #2F7A4C, #62B183)" }: { itens: Item[]; cor?: string }) {
  const maximo = Math.max(...itens.map((i) => i.valor), 0);

  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-base font-bold">{i.rotulo}</span>
            <span className="shrink-0 text-base opacity-80">{i.texto}</span>
          </div>
          <div className="h-3 rounded-full bg-areia-escura">
            <div
              className="h-3 rounded-full"
              style={{ width: `${maximo > 0 ? Math.max((i.valor / maximo) * 100, 3) : 0}%`, background: cor }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
