import { supabase } from './supabase';

// 卸カタログの豆データ（ws_beans）。初期データは scripts/seed.sql（スプレッドシートの表示列から作成）
export async function fetchBeans() {
  const { data, error } = await supabase.from('ws_beans').select('*').order('sort_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveBean(row) {
  const { updated_at, ...rest } = row;
  const { data, error } = await supabase
    .from('ws_beans')
    .upsert({ ...rest, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBean(id) {
  const { error } = await supabase.from('ws_beans').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadImage(id, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('ws-images').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('ws-images').getPublicUrl(path).data.publicUrl;
}

// DBの行 → 画面で使う豆オブジェクト
export function toBean(row) {
  const flavor = row.flavor ?? '';
  return {
    key: row.id,
    name: row.name,
    title: row.name,
    subtitle: row.subtitle,
    country: row.country,
    countryJa: row.country_ja,
    isBlend: row.is_blend,
    rank: row.rank,
    infoCard: row.info_card,
    labels: row.labels ?? [],
    process: row.process,
    producer: row.producer,
    components: row.components ?? [],
    region: row.region,
    altitude: row.altitude,
    variety: row.variety,
    crop: row.crop,
    stock: { text: row.stock, soldOut: row.sold_out },
    roast: row.roast,
    flavor,
    flavorNotes: flavor.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
    story: row.story,
    wholesale: row.price_1kg,
    sh400: row.price_sh400,
  };
}
