import { formatarMoeda } from "../lib/formatar";

/** Colunas, uma por dia do mês. `valores[0]` é o dia 1. */
export function BarrasPorDia({ valores }: { valores: number[] }) {
  const maximo = Math.max(...valores, 0);
  const melhorDia = maximo > 0 ? valores.indexOf(maximo) + 1 : null;
  const marcas = new Set([1, 5, 10, 15, 20, 25, valores.length]);

  return (
    <div>
      {melhorDia && (
        <p className="mb-3 mt-0 text-lg">
          Melhor dia: <strong>dia {melhorDia}</strong>, com {formatarMoeda(maximo)}
        </p>
      )}
      <div role="img" aria-label="Vendas por dia do mês" className="flex h-48 items-end gap-0.5 sm:gap-1">
        {valores.map((v, i) => (
          <div
            key={i}
            title={`Dia ${i + 1}: ${formatarMoeda(v)}`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div
              className={v > 0 ? "rounded-t bg-folha" : "bg-areia-escura"}
              style={{ height: v > 0 ? `${Math.max((v / maximo) * 100, 4)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5 sm:gap-1">
        {valores.map((_, i) => (
          <div key={i} className="flex min-w-0 flex-1 justify-center">
            <span className="whitespace-nowrap text-xs sm:text-sm">{marcas.has(i + 1) ? i + 1 : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Item = { rotulo: string; valor: number; texto: string };

/** Uma barra comprida por item, a maior ocupando a largura toda. */
export function BarrasHorizontais({ itens, cor = "bg-folha" }: { itens: Item[]; cor?: string }) {
  const maximo = Math.max(...itens.map((i) => i.valor), 0);

  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-lg font-bold">{i.rotulo}</span>
            <span className="shrink-0 text-lg">{i.texto}</span>
          </div>
          <div className="h-4 rounded-full bg-areia-escura">
            <div
              className={`h-4 rounded-full ${cor}`}
              style={{ width: `${maximo > 0 ? Math.max((i.valor / maximo) * 100, 3) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
