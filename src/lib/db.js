import { supabase } from './supabase';

// 写真・紹介文などアプリ側で追加登録する情報（価格・在庫はスプレッドシート）
export async function fetchMedia() {
  const { data, error } = await supabase.from('ws_beans').select('*');
  if (error) {
    console.warn('ws_beans 読み込み失敗（未作成の場合は scripts/schema.sql を実行）:', error.message);
    return {};
  }
  return Object.fromEntries((data ?? []).map((m) => [m.key, m]));
}

export async function saveMedia(media) {
  const { updated_at, ...rest } = media;
  const { data, error } = await supabase
    .from('ws_beans')
    .upsert({ ...rest, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function uploadImage(key, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const safe = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'bean';
  const path = `${safe}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('ws-images').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('ws-images').getPublicUrl(path).data.publicUrl;
}
