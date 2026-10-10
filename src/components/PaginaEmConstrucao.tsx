type Props = { titulo: string; descricao: string };

export default function PaginaEmConstrucao({ titulo, descricao }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 font-display text-4xl font-bold md:text-5xl">{titulo}</h1>
      <div className="cartao p-7 text-xl">
        <p className="m-0 font-bold">{descricao}</p>
        <p className="mb-0 mt-2">Esta tela será construída nos próximos passos do projeto.</p>
      </div>
    </div>
  );
}
