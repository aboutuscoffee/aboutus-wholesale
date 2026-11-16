import Encoding from 'encoding-japanese';
import { SHIPPER, YAMATO } from '../config';

// ヤマト運輸 B2クラウド「外部データから発行」標準レイアウト（先頭42列）
const HEADER = [
  'お客様管理番号', '送り状種類', 'クール区分', '伝票番号', '出荷予定日', 'お届け予定日', '配達時間帯',
  'お届け先コード', 'お届け先電話番号', 'お届け先電話番号枝番', 'お届け先郵便番号', 'お届け先住所',
  'お届け先アパートマンション名', 'お届け先会社・部門１', 'お届け先会社・部門２', 'お届け先名', 'お届け先名(ｶﾅ)', '敬称',
  'ご依頼主コード', 'ご依頼主電話番号', 'ご依頼主電話番号枝番', 'ご依頼主郵便番号', 'ご依頼主住所',
  'ご依頼主アパートマンション', 'ご依頼主名', 'ご依頼主名(ｶﾅ)', '品名コード１', '品名１', '品名コード２', '品名２',
  '荷扱い１', '荷扱い２', '記事', 'ｺﾚｸﾄ代金引換額（税込)', '内消費税額等', '止置き', '営業所コード', '発行枚数',
  '個数口表示フラグ', '請求先顧客コード', '請求先分類コード', '運賃管理番号',
];

// B2 の文字数制限は「全角換算」。半角は0.5文字として数える
const width = (ch) => (/[\x20-\x7e｡-ﾟ]/.test(ch) ? 1 : 2);
function cut(text, maxZenkaku) {
  const max = maxZenkaku * 2;
  let out = '';
  let w = 0;
  for (const ch of String(text ?? '').replace(/\s+/g, ' ').trim()) {
    if (w + width(ch) > max) break;
    out += ch;
    w += width(ch);
  }
  return out;
}

// 住所が長いときは、はみ出した分を「アパートマンション名」欄へ回す（住所32・建物16文字まで）
function splitAddress(address, apartment = '') {
  const a = String(address ?? '').replace(/\s+/g, ' ').trim();
  const head = cut(a, 32);
  const rest = a.slice(head.length).trim();
  return [head, cut([rest, apartment].filter(Boolean).join(' '), 16)];
}

const ymd = (d) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

// 注文1件 = 送り状1行。boxes は注文ごとの個数（発行枚数）
export function buildYamatoRows(orders, { shipDate, boxes = {} }) {
  const [shipperAddr, shipperApt] = splitAddress(SHIPPER.address, SHIPPER.apartment);
  return orders.map((o) => {
    const s = o.shipping ?? {};
    const [addr, apt] = splitAddress(s.address);
    const row = Object.fromEntries(HEADER.map((h) => [h, '']));
    Object.assign(row, {
      'お客様管理番号': String(o.order_no),
      '送り状種類': YAMATO.invoiceType,
      'クール区分': YAMATO.coolType,
      '出荷予定日': ymd(shipDate),
      'お届け先電話番号': cut(s.phone, 7.5),
      'お届け先郵便番号': cut(s.postal_code, 4),
      'お届け先住所': addr,
      'お届け先アパートマンション名': apt,
      'お届け先会社・部門１': cut(s.shipping_name || s.shop_name, 25),
      'お届け先名': cut(s.contact_name || s.shipping_name || s.shop_name, 16),
      '敬称': '様',
      'ご依頼主電話番号': cut(SHIPPER.phone, 7.5),
      'ご依頼主郵便番号': cut(SHIPPER.postal, 4),
      'ご依頼主住所': shipperAddr,
      'ご依頼主アパートマンション': shipperApt,
      'ご依頼主名': cut(SHIPPER.name, 16),
      '品名１': cut(YAMATO.itemName, 25),
      // 希望納期は基本使わないが、入っている注文だけ記事欄に載せる
      '記事': o.desired_date ? cut(`希望納期 ${o.desired_date}`, 22) : '',
      '発行枚数': String(Math.max(1, Number(boxes[o.id]) || 1)),
    });
    return HEADER.map((h) => row[h]);
  });
}

const esc = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// Shift_JIS の CSV をダウンロードさせる（B2クラウドは Shift_JIS で取り込む）
export function downloadYamatoCsv(orders, options, filename) {
  const lines = [HEADER, ...buildYamatoRows(orders, options)].map((r) => r.map(esc).join(','));
  const text = `${lines.join('\r\n')}\r\n`;
  const sjis = Encoding.convert(Encoding.stringToCode(text), { to: 'SJIS', from: 'UNICODE' });
  const blob = new Blob([new Uint8Array(sjis)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const shipperReady = () => Boolean(SHIPPER.phone && SHIPPER.postal && SHIPPER.address);
