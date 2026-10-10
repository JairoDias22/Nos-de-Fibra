-- Nós de Fibra: função que atualiza o sistema a partir da planilha.
-- Rode este arquivo uma vez, no SQL Editor do Supabase.
--
-- Recebe uma lista de mudanças já conferidas na tela «Atualizar pela planilha»:
--   acao = 'novo'      -> cadastra a peça e, se tiver saldo, dá a entrada inicial
--   acao = 'atualizar' -> muda o preço, volta a peça para a lista e/ou ajusta o estoque
-- Tudo acontece em um único passo: se algo falhar, nada fica pela metade.

create or replace function importar_planilha(p_itens jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  item jsonb;
  v_id uuid;
  v_saldo integer;
  v_delta integer;
  v_novos integer := 0;
  v_atualizados integer := 0;
begin
  for item in select * from jsonb_array_elements(p_itens) loop
    if item->>'acao' = 'novo' then
      insert into produtos (nome, categoria, tamanho, unidade, preco_venda, custo_unit)
      values (
        trim(item->>'nome'),
        trim(item->>'categoria'),
        nullif(trim(coalesce(item->>'tamanho', '')), ''),
        coalesce(nullif(item->>'unidade', ''), 'unid'),
        coalesce((item->>'preco_venda')::numeric, 0),
        (item->>'custo_unit')::numeric
      )
      returning id into v_id;

      v_saldo := coalesce((item->>'saldo')::integer, 0);
      if v_saldo > 0 then
        insert into movimentos_estoque (produto_id, tipo, quantidade, data, origem)
        values (v_id, 'entrada', v_saldo, current_date, 'Importação da planilha');
      end if;
      v_novos := v_novos + 1;

    elsif item->>'acao' = 'atualizar' then
      v_id := (item->>'produto_id')::uuid;
      if not exists (select 1 from produtos where id = v_id) then
        raise exception 'Peça não encontrada';
      end if;

      if item->>'preco_venda' is not null then
        update produtos set preco_venda = (item->>'preco_venda')::numeric where id = v_id;
      end if;

      if coalesce((item->>'reativar')::boolean, false) then
        update produtos set ativo = true where id = v_id;
      end if;

      v_delta := coalesce((item->>'delta')::integer, 0);
      if v_delta <> 0 then
        insert into movimentos_estoque (produto_id, tipo, quantidade, data, origem)
        values (v_id, 'ajuste', v_delta, current_date, 'Importação da planilha');
      end if;
      v_atualizados := v_atualizados + 1;

    else
      raise exception 'Ação desconhecida na importação';
    end if;
  end loop;

  return jsonb_build_object('novos', v_novos, 'atualizados', v_atualizados);
end;
$$;

grant execute on function importar_planilha(jsonb) to authenticated;
