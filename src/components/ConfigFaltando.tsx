export default function ConfigFaltando() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center p-6">
      <div className="rounded-3xl bg-white p-8 text-lg">
        <h1 className="m-0 font-display text-3xl font-bold">Falta configurar a conexão</h1>
        <p>
          Crie na pasta do projeto um arquivo chamado <b>.env.local</b>, copiando o{" "}
          <b>.env.example</b>, e preencha o endereço e a chave do seu projeto no Supabase.
        </p>
        <p className="mb-0">Depois, pare o programa (Ctrl+C) e rode <b>npm run dev</b> de novo.</p>
      </div>
    </div>
  );
}
