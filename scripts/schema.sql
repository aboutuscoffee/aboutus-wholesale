-- aboutus-wholesale: 卸カタログの写真・紹介文（価格・在庫はスプレッドシートが元データ）
-- Supabase SQL Editor で一度だけ実行してください

create table if not exists ws_beans (
  key text primary key,              -- スプレッドシートの商品名から生成したキー
  name text,                         -- 登録時点の商品名（参照用）
  image_urls jsonb not null default '[]'::jsonb,
  catch_ja text,                     -- ひとこと紹介
  catch_en text,
  description_ja text,               -- 詳細説明
  description_en text,
  sample_available boolean not null default false,  -- サンプル提供可
  featured boolean not null default false,          -- おすすめ表示
  hidden boolean not null default false,            -- カタログから非表示
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
