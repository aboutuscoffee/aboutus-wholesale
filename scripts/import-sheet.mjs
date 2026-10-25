// スプレッドシートの内容から ws_beans の初期データ（scripts/seed.sql）を作る
// 使い方: node scripts/import-sheet.mjs <シートID> <gid>
// 既に同じIDの豆がある場合は、写真・紹介文などアプリで登録した内容を残して、シート由来の項目だけ上書きする
import { writeFileSync } from 'node:fs';
import { fetchSheet } from './sheet-parser.mjs';

const [sheetId, gid = '0'] = process.argv.slice(2);
if (!sheetId) {
  console.error('使い方: node scripts/import-sheet.mjs <シートID> <gid>');
  process.exit(1);
}

const { beans } = await fetchSheet(sheetId, gid);

const slug = (s) =>
  s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bean';
const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;

const used = new Set();
const rows = beans.map((b, i) => {
  let id = slug(b.name);
  for (let n = 2; used.has(id); n++) id = `${slug(b.name)}-${n}`;
  used.add(id);
  return {
    id,
    sort_order: (i + 1) * 10,
    country: b.isBlend ? 'Original Blend' : b.country,
    country_ja: b.isBlend ? 'オリジナルブレンド' : b.countryJa,
    is_blend: b.isBlend,
    rank: b.rank,
    labels: b.labels,
    name: b.title,
    subtitle: b.subtitle,
    process: b.process,
    producer: b.producer,
    region: b.region,
    altitude: b.altitude,
    variety: b.variety,
    components: b.components,
    crop: b.crop,
    roast: b.roast,
    flavor: b.flavor,
    story: b.story,
    stock: b.stock.soldOut ? '' : b.stock.text,
    sold_out: b.stock.soldOut,
    info_card: b.infoCard,
    price_1kg: b.wholesale,
    price_sh400: b.sh400,
  };
});

const cols = Object.keys(rows[0]);
const jsonCols = new Set(['labels', 'components']);
const values = rows
  .map((r) => `  (${cols.map((c) => (jsonCols.has(c) ? j(r[c]) : typeof r[c] === 'boolean' || typeof r[c] === 'number' ? String(r[c]) : q(r[c]))).join(', ')})`)
  .join(',\n');
const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');

const sql = `-- スプレッドシート（表示列のみ）から作成した豆データ ${rows.length}件
-- 作成日: ${new Date().toISOString().slice(0, 10)}
insert into ws_beans (${cols.join(', ')}) values
${values}
on conflict (id) do update set ${updates}, updated_at = now();
`;

writeFileSync(new URL('./seed.sql', import.meta.url), sql);
console.log(`scripts/seed.sql に ${rows.length} 件を書き出しました`);
