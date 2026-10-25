-- aboutus-wholesale: 卸カタログの豆データ（店頭の豆とは別管理）
-- Supabase SQL Editor で一度だけ実行してください。続けて seed.sql を実行すると初期データが入ります

create table if not exists ws_beans (
  id text primary key,                     -- 豆ごとのID（英数字）
  sort_order integer not null default 0,   -- 表示順（小さいほど上）
  country text not null default '',        -- 産地（英語）例: Ethiopia
  country_ja text not null default '',     -- 産地（日本語）例: エチオピア
  is_blend boolean not null default false, -- オリジナルブレンド
  rank text not null default '',           -- Top of Top / Top Specialty など
  labels jsonb not null default '[]'::jsonb, -- champion / lastChance / directTrade / yearRound / newArrival / newCrop
  name text not null,                      -- 商品名
  subtitle text not null default '',       -- 受賞歴など
  process text not null default '',        -- 精製方法
  producer text not null default '',       -- 生産者
  region text not null default '',         -- 地域
  altitude text not null default '',       -- 標高
  variety text not null default '',        -- 品種
  components jsonb not null default '[]'::jsonb, -- ブレンド構成 [{origin, process}]
  crop text not null default '',           -- クロップ
  roast text not null default '',          -- 焙煎度
  flavor text not null default '',         -- フレーバー（カンマ区切り）
  story text not null default '',          -- ブレンドの紹介文など
  stock text not null default '',          -- 在庫（月初時点）例: 30kg
  sold_out boolean not null default false,
  info_card boolean not null default false,
  price_1kg integer,                       -- 1kg 卸価格（税抜）
  price_sh400 integer,                     -- Strong Hold 400g（税抜・トップロットのみ）
  image_urls jsonb not null default '[]'::jsonb,
  catch_ja text not null default '',       -- ひとこと紹介
  catch_en text not null default '',
  description_ja text not null default '', -- 詳しい説明
  description_en text not null default '',
  sample_available boolean not null default false,
  featured boolean not null default false, -- Pick Up に表示
  hidden boolean not null default false,   -- カタログで非表示
  updated_at timestamptz not null default now()
);

alter table ws_beans enable row level security;
drop policy if exists "ws_beans anon all" on ws_beans;
create policy "ws_beans anon all" on ws_beans for all to anon using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('ws-images', 'ws-images', true)
on conflict (id) do nothing;

drop policy if exists "ws-images anon read" on storage.objects;
create policy "ws-images anon read" on storage.objects for select to anon using (bucket_id = 'ws-images');
drop policy if exists "ws-images anon write" on storage.objects;
create policy "ws-images anon write" on storage.objects for insert to anon with check (bucket_id = 'ws-images');
drop policy if exists "ws-images anon update" on storage.objects;
create policy "ws-images anon update" on storage.objects for update to anon using (bucket_id = 'ws-images');
drop policy if exists "ws-images anon delete" on storage.objects;
create policy "ws-images anon delete" on storage.objects for delete to anon using (bucket_id = 'ws-images');
