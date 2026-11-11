-- 店頭の豆（Beans Profile の beans）と紐付けて、店頭の豆カード（インフォカード）画像を卸カタログに表示する
alter table ws_beans add column if not exists store_bean_id text;
