import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { session, carregando, entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!carregando && session) return <Navigate to="/" replace />;

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const mensagem = await entrar(email.trim(), senha);
    setEnviando(false);
    if (mensagem) setErro(mensagem);
  }

  const campo =
    "w-full rounded-2xl border-2 border-areia-escura bg-white px-5 py-4 text-xl outline-none focus:border-folha";

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md overflow-hidden cartao shadow-sm">
        <div className="flex justify-center bg-white px-8 pb-2 pt-6">
          <img
            src="/logo-associacao.png"
            alt="Associação Cultural dos Moradores de Boa Vista"
            width={285}
            height={97}
            className="h-auto w-64 max-w-full"
          />
        </div>
        <div className="trancado bg-folha px-8 py-8 text-white">
          <div className="font-display text-4xl font-bold">Nós de Fibra</div>
          <div className="text-lg">Ponto de Cultura</div>
        </div>
        <form onSubmit={aoEnviar} className="flex flex-col gap-5 p-8">
          <h1 className="m-0 font-display text-3xl font-bold">Bem-vinda!</h1>
          <label className="flex flex-col gap-2 text-lg font-bold">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-2 text-lg font-bold">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={campo}
            />
          </label>
          {erro && (
            <p role="alert" className="m-0 rounded-2xl bg-[#F0C3B6] px-5 py-3 text-lg font-bold text-[#7A2A12]">
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="cursor-pointer rounded-2xl border-0 bg-folha px-6 py-4 text-2xl font-extrabold text-white disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
