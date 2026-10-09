-- Nós de Fibra: tabelas iniciais
-- Rode este arquivo uma vez, no SQL Editor do Supabase.

create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  tamanho text,
  unidade text not null default 'unid',
  preco_venda numeric(10,2) not null default 0,
  custo_unit numeric(10,2),
  estoque_minimo integer not null default 2,
  foto_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Cada entrada, saída ou ajuste de estoque. O saldo é calculado a partir daqui.
-- 'entrada' e 'saida' usam quantidade positiva; 'ajuste' pode ser positivo ou negativo.
create table movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste')),
  quantidade integer not null check (quantidade <> 0),
  data date not null default current_date,
  origem text,
  criado_em timestamptz not null default now()
);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id),
  quantidade integer not null check (quantidade > 0),
  valor_unitario numeric(10,2) not null,
  desconto numeric(10,2) not null default 0,
  valor_total numeric(10,2) generated always as (quantidade * valor_unitario - desconto) stored,
  data date not null default current_date,
  local_venda text,
  criado_em timestamptz not null default now()
);

create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  categoria text not null,
  descricao text,
  valor numeric(10,2) not null check (valor > 0),
  data date not null default current_date,
  venda_id uuid references vendas(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index on movimentos_estoque (produto_id);
create index on vendas (data);
create index on lancamentos (data);

-- Saldo atual de cada produto
create view saldo_estoque with (security_invoker = true) as
select
  p.id as produto_id,
  coalesce(sum(case m.tipo when 'saida' then -m.quantidade else m.quantidade end), 0)::int as saldo
from produtos p
left join movimentos_estoque m on m.produto_id = p.id
group by p.id;

-- Segurança: só quem tem login (as pessoas criadas pelo administrador) acessa os dados
alter table produtos enable row level security;
alter table movimentos_estoque enable row level security;
alter table vendas enable row level security;
alter table lancamentos enable row level security;

create policy "equipe acessa tudo" on produtos for all to authenticated using (true) with check (true);
create policy "equipe acessa tudo" on movimentos_estoque for all to authenticated using (true) with check (true);
create policy "equipe acessa tudo" on vendas for all to authenticated using (true) with check (true);
create policy "equipe acessa tudo" on lancamentos for all to authenticated using (true) with check (true);
