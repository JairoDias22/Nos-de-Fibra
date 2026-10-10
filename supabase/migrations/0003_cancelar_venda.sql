-- Nós de Fibra: função que cancela uma venda por inteiro.
-- Rode este arquivo uma vez, no SQL Editor do Supabase.
--
-- Em um único passo ela: apaga o lançamento da venda no caixa, devolve a peça
-- ao estoque (com uma entrada "Venda cancelada") e apaga a venda.
-- Se qualquer parte falhar, nada fica pela metade.

create or replace function cancelar_venda(p_venda_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_venda vendas%rowtype;
begin
  select * into v_venda from vendas where id = p_venda_id;
  if not found then
    raise exception 'Venda não encontrada';
  end if;

  -- O lançamento precisa sair antes: a ligação com a venda é "set null", então
  -- apagar só a venda deixaria o dinheiro anotado no caixa como se fosse manual.
  delete from lancamentos where venda_id = p_venda_id;

  insert into movimentos_estoque (produto_id, tipo, quantidade, data, origem)
  values (v_venda.produto_id, 'entrada', v_venda.quantidade, current_date, 'Venda cancelada');

  delete from vendas where id = p_venda_id;
end;
$$;

grant execute on function cancelar_venda(uuid) to authenticated;
