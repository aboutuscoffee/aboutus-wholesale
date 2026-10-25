// 卸売リスト（Googleスプレッドシート）を解析して、アプリに登録する豆データにする。
// 社外に見せるのはシート上で表示されている列（A〜I・S: 1kg Whole Sale・V: 400g By Strong Hold）だけなので、
// 取得クエリの時点でそれ以外の列（原価・1drink・小分け・海外卸・生豆・Garden様価格）は読み込まない。
const COLUMNS = 'A,B,C,D,E,F,G,H,I,S,V';

export function sheetUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&headers=0&tq=${encodeURIComponent(`select ${COLUMNS}`)}`;
}

// select 後の列インデックス
const C = {
  label: 0, card: 1, rank: 2, name: 3, process: 4, producer: 5, region: 6, altitude: 7, variety: 8,
  wholesale: 9, sh400: 10,
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const clean = (s) => (s ?? '').replace(/\s*\n\s*/g, '\n').trim();
const oneLine = (s) => clean(s).replace(/\s+/g, ' ');
const yen = (s) => {
  const n = Number(String(s ?? '').replace(/[¥,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function beanKey(name) {
  return oneLine(name).toLowerCase().replace(/[“”"']/g, '').replace(/\s+/g, ' ');
}

function splitCountry(text) {
  const t = oneLine(text);
  const m = t.match(/^(.*?)[\s　]+([^\x00-\x7F].*)$/);
  return m ? { en: m[1].trim(), ja: m[2].trim() } : { en: t, ja: t };
}

const LABELS = [
  { re: /champion/i, id: 'champion' },
  { re: /間もなく終売/, id: 'lastChance' },
  { re: /direct\s*trade/i, id: 'directTrade' },
  { re: /year-?round/i, id: 'yearRound' },
  { re: /new\s*arrival/i, id: 'newArrival' },
  { re: /new\s*crop/i, id: 'newCrop' },
];

function parseLabels(...texts) {
  const joined = texts.map(oneLine).join(' ');
  const ids = LABELS.filter((l) => l.re.test(joined)).map((l) => l.id);
  return [...new Set(ids)];
}

function parseStock(raw) {
  const s = oneLine(raw);
  if (!s) return { text: '', kg: null, soldOut: false };
  if (/sold/i.test(s)) return { text: 'Sold', kg: 0, soldOut: true };
  const n = Number(s.replace(/[^\d.]/g, ''));
  return { text: s.replace(/\s+/g, ''), kg: Number.isFinite(n) ? n : null, soldOut: false };
}

export async function fetchSheet(sheetId, gid) {
  const res = await fetch(sheetUrl(sheetId, gid), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet ${res.status}`);
  return parseSheet(await res.text());
}

export function parseSheet(text) {
  const rows = parseCsv(text);
  const beans = [];
  let note = '';
  let country = null;
  let isBlend = false;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const get = (k) => r[C[k]] ?? '';

    if (!note && /送料/.test(get('card'))) note = clean(get('card'));

    // 国見出し行：B列のみに値がある
    const others = r.filter((v, idx) => idx !== C.card && v.trim()).length;
    if (get('card').trim() && others === 0 && !/info card|インフォカード|送料/i.test(get('card'))) {
      country = splitCountry(get('card'));
      isBlend = /blend|ブレンド/i.test(get('card'));
      continue;
    }

    // 商品行：名称と精製方法がある行。次の行がクロップ・在庫・焙煎度・フレーバー・税込価格
    if (!get('name').trim() || !get('process').trim() || !country) continue;
    const sub = rows[i + 1] ?? [];
    const sget = (k) => sub[C[k]] ?? '';
    i++;

    const nameLines = clean(get('name')).split('\n');
    // 2行目が “〜” で始まる場合は商品名の続き（例: Signature Blend / “Happiness Bloom”）
    if (/^[“"]/.test(nameLines[1] ?? '')) nameLines.splice(0, 2, `${nameLines[0]} ${nameLines[1]}`);
    const price = (row, k) => yen(row[C[k]]);

    // ブレンドは「産地」列に構成国、精製も複数行
    const flavorRaw = clean(sget('producer')).replace(/^no dat[ae]$/i, '');
    let flavor = flavorRaw;
    let story = '';
    if (isBlend) {
      const lines = flavorRaw.split('\n');
      const firstJa = lines.findIndex((l) => /[^\x00-\x7F]/.test(l));
      if (firstJa >= 0) {
        flavor = lines.slice(0, firstJa).join(' ').trim();
        story = lines.slice(firstJa).join('').replace(/^。/, '').trim();
      }
    }

    const name = oneLine(nameLines[0]);
    beans.push({
      key: beanKey(get('name')),
      name: oneLine(get('name')),
      title: name,
      subtitle: nameLines.slice(1).join(' ').trim(),
      country: country.en,
      countryJa: country.ja,
      isBlend,
      rank: oneLine(get('rank')),
      infoCard: get('card').includes('○'),
      labels: parseLabels(get('label'), sget('label')),
      process: isBlend ? clean(get('process')).split('\n').join(' / ') : oneLine(get('process')),
      producer: isBlend ? '' : oneLine(get('producer')),
      components: isBlend
        ? clean(get('producer')).split('\n').map((origin, idx) => ({
            origin: origin.trim(),
            process: clean(get('process')).split('\n')[idx]?.trim() ?? '',
          })).filter((c) => c.origin)
        : [],
      region: oneLine(get('region')),
      altitude: oneLine(get('altitude')),
      variety: isBlend ? clean(get('variety')).split('\n').join(', ') : oneLine(get('variety')),
      crop: oneLine(sget('card')),
      stock: parseStock(sget('rank')),
      roast: oneLine(sget('name')),
      flavor,
      flavorNotes: flavor.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
      story,
      wholesale: price(r, 'wholesale'),
      sh400: price(r, 'sh400'),
    });
  }
  return { beans, note };
}
