-- aboutus-wholesale: 未ログインの人にも「Strong Hold 400g 対応」かどうかだけを見せる（価格は非公開のまま）
-- Supabase SQL Editor で一度だけ実行してください（何度実行しても壊れません）
alter table ws_beans add column if not exists has_sh400 boolean generated always as (price_sh400 is not null) stored;
grant select (has_sh400) on ws_beans to anon, authenticated;

-- 確認：Strong Hold 対応の豆の数（5 と出ればOK）
select count(*) as sh400_beans from ws_beans where has_sh400;
