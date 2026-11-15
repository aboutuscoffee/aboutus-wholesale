-- aboutus-wholesale: 注文時にインフォメーションカードの「必要／不要」を記録する
-- Supabase SQL Editor で一度だけ実行してください（何度実行しても壊れません）
-- p_items: [{"bean_id": "...", "option": "wholesale" | "sh400", "qty": 1, "info_card": true | false}]
create or replace function ws_place_order(p_items jsonb, p_desired_date text, p_note text)
returns ws_orders
language plpgsql security definer set search_path = public as $$
declare
  c ws_customers;
  it jsonb;
  b ws_beans;
  cp ws_customer_prices;
  unit integer;
  qty integer;
  card boolean;
  lines jsonb := '[]'::jsonb;
  sub integer := 0;
  result ws_orders;
begin
  select * into c from ws_customers where id = auth.uid();
  if c.id is null or c.status <> 'approved' then
    raise exception 'アカウントが承認されていないため注文できません';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception '注文する豆がありません';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    qty := greatest(1, (it->>'qty')::integer);
    select * into b from ws_beans where id = it->>'bean_id' and not hidden;
    if b.id is null then raise exception '豆が見つかりません: %', it->>'bean_id'; end if;
    if b.sold_out then raise exception '% は SOLD OUT です', b.name; end if;
    -- インフォメーションカードがある豆は要否の選択が必須
    card := null;
    if b.info_card then
      if it->>'info_card' is null then
        raise exception '% のインフォメーションカードの「必要／不要」を選んでください', b.name;
      end if;
      card := (it->>'info_card')::boolean;
    end if;
    select * into cp from ws_customer_prices where customer_id = c.id and bean_id = b.id;
    if it->>'option' = 'sh400' then
      unit := coalesce(cp.price_sh400, b.price_sh400);
    else
      unit := coalesce(cp.price_1kg, b.price_1kg);
    end if;
    if unit is null then raise exception '% の価格が未設定です', b.name; end if;
    lines := lines || jsonb_build_object(
      'bean_id', b.id, 'name', b.name, 'option', coalesce(it->>'option', 'wholesale'),
      'qty', qty, 'unit_price', unit, 'amount', unit * qty, 'info_card', card
    );
    sub := sub + unit * qty;
  end loop;

  insert into ws_orders (customer_id, items, subtotal, tax, total, shipping, desired_date, note)
  values (
    c.id, lines, sub, floor(sub * 0.08)::integer, sub + floor(sub * 0.08)::integer,
    jsonb_build_object(
      'shop_name', c.shop_name, 'shipping_name', coalesce(nullif(c.shipping_name, ''), c.shop_name),
      'contact_name', c.contact_name, 'phone', c.phone, 'postal_code', c.postal_code, 'address', c.address,
      'billing_name', c.billing_name, 'billing_address', c.billing_address, 'email', c.email
    ),
    coalesce(p_desired_date, ''), coalesce(p_note, '')
  )
  returning * into result;
  return result;
end;
$$;
grant execute on function ws_place_order(jsonb, text, text) to authenticated;
