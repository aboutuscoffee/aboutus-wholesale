-- aboutus-wholesale: 取引先アカウント・注文履歴・取引先別価格 ＋ 店頭の豆カード紐付け
-- Supabase SQL Editor で一度だけ実行してください（何度実行しても壊れません）
--
-- ・取引先は自分で登録 → お店側（管理者）が承認すると注文できる
-- ・管理者も同じログイン画面から入る（ws_customers.role = 'admin'）
-- ・豆データの書き換えは管理者だけに制限する

-- ===== 店頭の豆カード紐付け =====
alter table ws_beans add column if not exists store_bean_id text;

-- ===== 取引先（アカウントごとに1行） =====
create table if not exists ws_customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  shop_name text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  postal_code text not null default '',
  address text not null default '',          -- 配送先住所
  shipping_name text not null default '',    -- 配送先の宛名（空なら店名）
  billing_name text not null default '',     -- 請求先（空なら配送先と同じ）
  billing_address text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  role text not null default 'customer' check (role in ('customer', 'admin')),
  admin_note text not null default '',       -- お店側だけが見るメモ
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== 取引先ごとの特別価格（未設定なら通常の卸価格） =====
create table if not exists ws_customer_prices (
  customer_id uuid not null references ws_customers(id) on delete cascade,
  bean_id text not null references ws_beans(id) on delete cascade,
  price_1kg integer,
  price_sh400 integer,
  primary key (customer_id, bean_id)
);

-- ===== 注文 =====
create sequence if not exists ws_order_no_seq start 1001;
create table if not exists ws_orders (
  id uuid primary key default gen_random_uuid(),
  order_no integer not null default nextval('ws_order_no_seq') unique,
  customer_id uuid not null references ws_customers(id) on delete restrict,
  items jsonb not null,                      -- [{bean_id, name, option, qty, unit_price, amount}]
  subtotal integer not null,
  tax integer not null,
  total integer not null,
  shipping jsonb not null default '{}'::jsonb, -- 注文時点の配送先（後で登録情報が変わっても残る）
  desired_date text not null default '',
  note text not null default '',
  status text not null default 'received' check (status in ('received', 'confirmed', 'shipped', 'cancelled')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ws_orders_customer_idx on ws_orders (customer_id, created_at desc);

-- ===== 管理者かどうか =====
create or replace function ws_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ws_customers where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

-- ===== 新規登録時に取引先の行を作る（卸アプリからの登録だけ。スタッフアプリの登録には反応しない） =====
create or replace function ws_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'app', '') = 'aboutus-wholesale' then
    insert into ws_customers (id, email, shop_name, contact_name, phone, postal_code, address)
    values (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'shop_name', ''),
      coalesce(new.raw_user_meta_data->>'contact_name', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      coalesce(new.raw_user_meta_data->>'postal_code', ''),
      coalesce(new.raw_user_meta_data->>'address', '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists ws_on_auth_user_created on auth.users;
create trigger ws_on_auth_user_created after insert on auth.users
  for each row execute function ws_handle_new_user();

-- 取引先が自分で承認状態・権限・お店メモを書き換えられないようにする
create or replace function ws_guard_customer_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- SQL Editor（auth.uid() が無い）や管理者からの更新はそのまま通す
  if auth.uid() is not null and not ws_is_admin() then
    new.status := old.status;
    new.role := old.role;
    new.admin_note := old.admin_note;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists ws_guard_customer_update on ws_customers;
create trigger ws_guard_customer_update before update on ws_customers
  for each row execute function ws_guard_customer_update();

-- ===== 注文を確定する（価格はサーバー側で価格表・特別価格から計算し直す） =====
-- p_items: [{"bean_id": "...", "option": "wholesale" | "sh400", "qty": 1}]
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
    select * into cp from ws_customer_prices where customer_id = c.id and bean_id = b.id;
    if it->>'option' = 'sh400' then
      unit := coalesce(cp.price_sh400, b.price_sh400);
    else
      unit := coalesce(cp.price_1kg, b.price_1kg);
    end if;
    if unit is null then raise exception '% の価格が未設定です', b.name; end if;
    lines := lines || jsonb_build_object(
      'bean_id', b.id, 'name', b.name, 'option', coalesce(it->>'option', 'wholesale'),
      'qty', qty, 'unit_price', unit, 'amount', unit * qty
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

-- ===== アクセス権（RLS） =====
alter table ws_customers enable row level security;
alter table ws_customer_prices enable row level security;
alter table ws_orders enable row level security;

drop policy if exists "ws_customers select" on ws_customers;
create policy "ws_customers select" on ws_customers for select to authenticated using (id = auth.uid() or ws_is_admin());
drop policy if exists "ws_customers update" on ws_customers;
create policy "ws_customers update" on ws_customers for update to authenticated using (id = auth.uid() or ws_is_admin());

drop policy if exists "ws_customer_prices select" on ws_customer_prices;
create policy "ws_customer_prices select" on ws_customer_prices for select to authenticated using (customer_id = auth.uid() or ws_is_admin());
drop policy if exists "ws_customer_prices admin" on ws_customer_prices;
create policy "ws_customer_prices admin" on ws_customer_prices for all to authenticated using (ws_is_admin()) with check (ws_is_admin());

drop policy if exists "ws_orders select" on ws_orders;
create policy "ws_orders select" on ws_orders for select to authenticated using (customer_id = auth.uid() or ws_is_admin());
drop policy if exists "ws_orders admin update" on ws_orders;
create policy "ws_orders admin update" on ws_orders for update to authenticated using (ws_is_admin());
-- 注文の作成は ws_place_order 経由のみ（直接 insert は不可）

-- 豆データ：誰でも閲覧、書き換えは管理者だけ
drop policy if exists "ws_beans anon all" on ws_beans;
drop policy if exists "ws_beans read" on ws_beans;
create policy "ws_beans read" on ws_beans for select to anon, authenticated using (true);
drop policy if exists "ws_beans admin write" on ws_beans;
create policy "ws_beans admin write" on ws_beans for all to authenticated using (ws_is_admin()) with check (ws_is_admin());

-- 写真：誰でも閲覧、アップロード・削除は管理者だけ
drop policy if exists "ws-images anon write" on storage.objects;
drop policy if exists "ws-images anon update" on storage.objects;
drop policy if exists "ws-images anon delete" on storage.objects;
drop policy if exists "ws-images admin write" on storage.objects;
create policy "ws-images admin write" on storage.objects for insert to authenticated with check (bucket_id = 'ws-images' and ws_is_admin());
drop policy if exists "ws-images admin update" on storage.objects;
create policy "ws-images admin update" on storage.objects for update to authenticated using (bucket_id = 'ws-images' and ws_is_admin());
drop policy if exists "ws-images admin delete" on storage.objects;
create policy "ws-images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'ws-images' and ws_is_admin());

grant execute on function ws_place_order(jsonb, text, text) to authenticated;
grant execute on function ws_is_admin() to authenticated;
