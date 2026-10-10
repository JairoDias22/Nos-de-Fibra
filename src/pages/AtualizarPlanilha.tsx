import { useState } from "react";
import { Link } from "react-router-dom";
import CabecalhoPagina from "../components/CabecalhoPagina";
import { formatarMoeda } from "../lib/formatar";
import { analisarPlanilha, aplicarMudancas, type Analise } from "../lib/importarPlanilha";

function sinal(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

export default function AtualizarPlanilha() {
  const [lendo, setLendo] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [desmarcadas, setDesmarcadas] = useState<Set<string>>(new Set());
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState<{ novos: number; atualizados: number } | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setLendo(true);
    setErro(null);
    setAnalise(null);
    setResultado(null);
    setDesmarcadas(new Set());
    setNomeArquivo(arquivo.name);
    try {
      setAnalise(await analisarPlanilha(arquivo));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ler a planilha.");
    }
    setLendo(false);
  }

  function alternar(chave: string) {
    setDesmarcadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  const novasMarcadas = analise?.novas.filter((n) => !desmarcadas.has(n.chave)) ?? [];
  const alteradasMarcadas = analise?.alteradas.filter((a) => !desmarcadas.has(a.chave)) ?? [];
  const totalMarcado = novasMarcadas.length + alteradasMarcadas.length;

  async function aplicar() {
    if (!analise || aplicando || totalMarcado === 0) return;
    setAplicando(true);
    setErro(null);
    try {
      setResultado(await aplicarMudancas(novasMarcadas, alteradasMarcadas));
      setAnalise(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar o sistema.");
    }
    setAplicando(false);
  }

  const caixa = "size-6 shrink-0 cursor-pointer accent-[#2F7A4C]";

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        icone="caixa"
        titulo="Atualizar pela planilha"
        texto="Deixa o estoque do sistema igual ao da planilha"
        cor="terracota"
      />

      {resultado ? (
        <div className="cartao flex flex-col gap-4 p-6">
          <h2 className="m-0 font-display text-3xl font-bold text-folha">Pronto, o sistema foi atualizado!</h2>
          <p className="m-0 text-xl">
            {resultado.novos} peça(s) nova(s) cadastrada(s) e {resultado.atualizados} peça(s) corrigida(s).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/estoque"
              className="rounded-2xl bg-folha px-6 py-4 text-xl font-extrabold text-white no-underline"
            >
              Ver o estoque
            </Link>
            <button
              onClick={() => setResultado(null)}
              className="cursor-pointer rounded-2xl border-2 border-folha bg-transparent px-6 py-4 text-xl font-bold text-folha"
            >
              Atualizar de novo
            </button>
          </div>
        </div>
      ) : (
        <div className="cartao flex flex-col gap-4 p-6">
          <p className="m-0 text-xl">
            Escolha a planilha do estoque (arquivo .xlsx). O sistema vai mostrar o que vai mudar e só muda depois que você confirmar.
          </p>
          <label className="inline-flex cursor-pointer items-center self-start rounded-2xl bg-folha px-6 py-4 text-xl font-extrabold text-white">
            {lendo ? "Lendo a planilha..." : "Escolher a planilha"}
            <input
              type="file"
              accept=".xlsx"
              disabled={lendo || aplicando}
              className="hidden"
              onChange={(e) => {
                escolher(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {nomeArquivo && !erro && !lendo && <p className="m-0 text-lg opacity-70">Arquivo: {nomeArquivo}</p>}
        </div>
      )}

      {erro && (
        <p role="alert" className="m-0 rounded-2xl bg-[#F0C3B6] px-5 py-3 text-xl font-bold text-[#7A2A12]">
          {erro}
        </p>
      )}

      {analise && (
        <>
          <div className="cartao flex flex-col gap-2 p-6">
            <h2 className="m-0 font-display text-2xl font-bold">O que o sistema encontrou</h2>
            <p className="m-0 text-xl">
              {analise.totalLinhas} peça(s) na planilha: {analise.novas.length} nova(s), {analise.alteradas.length} com
              mudança e {analise.iguais} já igual(is).
            </p>
            <p className="m-0 rounded-2xl bg-ouro-clara px-4 py-3 text-lg">
              Atenção: o estoque do sistema vai ficar igual ao da planilha. Se você anotou vendas no sistema que não estão
              na planilha, desmarque essas peças abaixo.
            </p>
          </div>

          {analise.novas.length > 0 && (
            <div className="cartao px-6 py-2">
              <h2 className="mb-0 mt-4 font-display text-2xl font-bold text-folha">Peças novas</h2>
              <ul className="m-0 list-none p-0">
                {analise.novas.map((n) => (
                  <li key={n.chave} className="flex items-start gap-4 border-t-2 border-areia-escura py-4 first:border-t-0">
                    <input
                      type="checkbox"
                      className={caixa}
                      checked={!desmarcadas.has(n.chave)}
                      onChange={() => alternar(n.chave)}
                      aria-label={`Cadastrar ${n.item.nome}`}
                    />
                    <div className="min-w-0">
                      <div className="text-xl font-bold">
                        {n.item.nome}
                        {n.item.tamanho ? ` · ${n.item.tamanho}` : ""}
                      </div>
                      <div className="text-base opacity-75">
                        Tipo: {n.categoria}
                        {n.categoriaNova ? " (tipo novo)" : ""} · {formatarMoeda(n.item.preco ?? 0)} · {n.item.saldo} em estoque
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analise.alteradas.length > 0 && (
            <div className="cartao px-6 py-2">
              <h2 className="mb-0 mt-4 font-display text-2xl font-bold text-terracota">Peças com mudança</h2>
              <ul className="m-0 list-none p-0">
                {analise.alteradas.map((a) => (
                  <li key={a.chave} className="flex items-start gap-4 border-t-2 border-areia-escura py-4 first:border-t-0">
                    <input
                      type="checkbox"
                      className={caixa}
                      checked={!desmarcadas.has(a.chave)}
                      onChange={() => alternar(a.chave)}
                      aria-label={`Atualizar ${a.item.nome}`}
                    />
                    <div className="min-w-0">
                      <div className="text-xl font-bold">
                        {a.produto.nome}
                        {a.produto.tamanho ? ` · ${a.produto.tamanho}` : ""}
                      </div>
                      <div className="flex flex-col text-base opacity-80">
                        {a.delta !== 0 && (
                          <span>
                            Estoque: {a.produto.saldo} → {a.item.saldo} ({sinal(a.delta)})
                          </span>
                        )}
                        {a.precoNovo !== null && (
                          <span>
                            Preço: {formatarMoeda(a.produto.preco_venda)} → {formatarMoeda(a.precoNovo)}
                          </span>
                        )}
                        {a.reativar && <span>Estava fora da lista e volta para a lista</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analise.problemas.length > 0 && (
            <div className="cartao flex flex-col gap-2 p-6">
              <h2 className="m-0 font-display text-2xl font-bold text-[#7A2A12]">Não deu para usar</h2>
              <ul className="m-0 pl-6 text-lg">
                {analise.problemas.map((p, i) => (
                  <li key={i}>
                    Linha {p.linha} ({p.nome}): {p.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analise.soNoSistema.length > 0 && (
            <details className="cartao p-6">
              <summary className="cursor-pointer text-xl font-bold">
                {analise.soNoSistema.length} peça(s) estão no sistema mas não estão na planilha (não vou mexer nelas)
              </summary>
              <ul className="mb-0 mt-3 pl-6 text-lg">
                {analise.soNoSistema.map((nome) => (
                  <li key={nome}>{nome}</li>
                ))}
              </ul>
            </details>
          )}

          {analise.novas.length === 0 && analise.alteradas.length === 0 ? (
            <p className="m-0 cartao p-6 text-xl font-bold">O sistema já está igual à planilha. Não tem nada para mudar.</p>
          ) : (
            <button
              onClick={aplicar}
              disabled={aplicando || totalMarcado === 0}
              className="cursor-pointer rounded-2xl border-0 bg-ouro px-6 py-5 text-2xl font-extrabold text-tinta disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aplicando ? "Atualizando..." : `Atualizar o sistema (${totalMarcado})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
