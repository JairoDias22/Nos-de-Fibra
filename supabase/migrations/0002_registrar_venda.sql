-- Nós de Fibra: função que registra uma venda por inteiro.
-- Rode este arquivo uma vez, no SQL Editor do Supabase.
--
-- Em um único passo ela: confere o saldo, grava a venda, dá baixa no estoque
-- e lança a entrada no caixa. Se qualquer parte falhar, nada fica pela metade.

create or replace function registrar_venda(
  p_produto_id uuid,
  p_quantidade integer,
  p_valor_unitario numeric,
  p_desconto numeric,
  p_data date,
  p_local text
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_saldo integer;
  v_nome text;
  v_venda_id uuid;
  v_total numeric(10,2);
begin
  select nome into v_nome from produtos where id = p_produto_id and ativo;
  if v_nome is null then
    raise exception 'Peça não encontrada';
  end if;

  select saldo into v_saldo from saldo_estoque where produto_id = p_produto_id;
  if coalesce(v_saldo, 0) < p_quantidade then
    raise exception 'Estoque insuficiente: só tem % no estoque', coalesce(v_saldo, 0);
  end if;

  insert into vendas (produto_id, quantidade, valor_unitario, desconto, data, local_venda)
  values (p_produto_id, p_quantidade, p_valor_unitario, coalesce(p_desconto, 0), p_data, nullif(trim(p_local), ''))
  returning id, valor_total into v_venda_id, v_total;

  if v_total <= 0 then
    raise exception 'O valor total da venda precisa ser maior que zero';
  end if;

  insert into movimentos_estoque (produto_id, tipo, quantidade, data, origem)
  values (p_produto_id, 'saida', p_quantidade, p_data, 'Venda');

  insert into lancamentos (tipo, categoria, descricao, valor, data, venda_id)
  values ('entrada', 'Vendas', 'Venda: ' || v_nome, v_total, p_data, v_venda_id);

  return v_venda_id;
end;
$$;

grant execute on function registrar_venda(uuid, integer, numeric, numeric, date, text) to authenticated;
