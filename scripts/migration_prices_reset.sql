-- aboutus-wholesale: 価格の非公開化・パスワード再設定の依頼受付・店頭の豆カード紐付け
-- Supabase SQL Editor で一度だけ実行してください（何度実行しても壊れません）

-- ===== 店頭の豆カード（Beans Profile の beans.id）と紐付け =====
update ws_beans set store_bean_id = v.store_id
from (values
  ('danche', '1756900001007'),
  ('kagunyu-aa', '1792538804336'),
  ('finca-tres-cedros', '1792538804335'),
  ('nigussie-gemeda-morke-2020-coe1st-2021-coe25', '1790045507009'),
  ('flying-pumas-lot-hamming-bird', '1792664720659'),
  ('flying-pumas-lot-jugger', '1792664720320'),
  ('aborigen-coffee-by-gato-grande-caturra', '1792664719343'),
  ('finca-la-marquesa-sidra-cm', '1784704071727'),
  ('finca-milan-geisha-nitro-washed', '1790043794526'),
  ('el-origen-farm-papayo', '1792538804334'),
  ('campo-hermoso-bh-amber-bloom', '1792538804337'),
  ('campo-hermoso-sangria-red-wine', '1792538804341'),
  ('campo-hermoso-giesha-mosto-lactic-wh', '1792538804339'),
  ('campo-hermoso-sidra-bio-thormal-shock', '1792538804342'),
  ('campo-hermoso-geisha-bio-thermal-shock', '1792538804338')
) as v(ws_id, store_id)
where ws_beans.id = v.ws_id;

-- ===== 価格を非公開にする =====
-- 価格の列（price_1kg / price_sh400）は、ログインしていない人・承認前の取引先には読めないようにする。
-- 価格は ws_get_prices() 経由でのみ取得（承認済みの取引先は特別価格を反映、管理者は通常価格）
revoke select on ws_beans from anon, authenticated;
grant select (
  id, sort_order, country, country_ja, is_blend, rank, labels, name, subtitle, process, producer,
  region, altitude, variety, components, crop, roast, flavor, story, stock, sold_out, info_card,
  image_urls, catch_ja, catch_en, description_ja, description_en, sample_available, featured, hidden,
  updated_at, store_bean_id
) on ws_beans to anon, authenticated;

create or replace function ws_get_prices()
returns table (bean_id text, price_1kg integer, price_sh400 integer, base_1kg integer, base_sh400 integer)
language plpgsql stable security definer set search_path = public as $$
declare
  c ws_customers;
begin
  select * into c from ws_customers where id = auth.uid();
  if c.id is null or c.status <> 'approved' then
    return;
  end if;
  if c.role = 'admin' then
    return query select b.id, b.price_1kg, b.price_sh400, b.price_1kg, b.price_sh400 from ws_beans b;
  else
    return query
      select b.id, coalesce(p.price_1kg, b.price_1kg), coalesce(p.price_sh400, b.price_sh400), b.price_1kg, b.price_sh400
      from ws_beans b
      left join ws_customer_prices p on p.bean_id = b.id and p.customer_id = c.id
      where not b.hidden;
  end if;
end;
$$;
grant execute on function ws_get_prices() to anon, authenticated;

-- ===== パスワード再設定の依頼（取引先が送信 → お店が本人確認して再設定メールを送る） =====
create table if not exists ws_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  shop_name text not null default '',
  message text not null default '',
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table ws_reset_requests enable row level security;
drop policy if exists "ws_reset_requests insert" on ws_reset_requests;
create policy "ws_reset_requests insert" on ws_reset_requests for insert to anon, authenticated with check (not handled);
drop policy if exists "ws_reset_requests admin" on ws_reset_requests;
create policy "ws_reset_requests admin" on ws_reset_requests for all to authenticated using (ws_is_admin()) with check (ws_is_admin());

-- 確認：紐付けた豆の数（15 と出ればOK）
select count(*) as linked from ws_beans where store_bean_id is not null;
