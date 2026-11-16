import { useMemo, useState } from 'react';
import { yen } from '../i18n';
import { downloadYamatoCsv, shipperReady } from '../lib/yamatoCsv';
import { updateOrder } from '../lib/db';

// 週の区切り：月曜 0:00 〜 日曜 23:59（日曜23:59締め）
function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 注文の重さ（焙煎豆1kg=1kg、Strong Hold 400g=0.4kg）
const KG = { wholesale: 1, sh400: 0.4 };
const orderKg = (o) => o.items.reduce((s, i) => s + (KG[i.option] ?? 0) * i.qty, 0);
const kgText = (kg) => `${Math.round(kg * 10) / 10}kg`;

export default function WeeklySummary({ t, orders, customers, onOrdersChange }) {
  const now = new Date();
  // 月曜に開いたときは、締め切ったばかりの先週を表示
  const [start, setStart] = useState(() => {
    const s = weekStart(now);
    return now.getDay() === 1 ? addDays(s, -7) : s;
  });
  const end = addDays(start, 7); // 次の月曜 0:00（＝日曜23:59まで）
  const closed = now >= end;

  const weekOrders = useMemo(
    () => orders
      .filter((o) => o.status !== 'cancelled')
      .filter((o) => { const d = new Date(o.created_at); return d >= start && d < end; })
      .sort((a, b) => a.order_no - b.order_no),
    [orders, start, end],
  );

  const [shipDate, setShipDate] = useState(() => toInput(now));
  const [boxes, setBoxes] = useState({});
  const [markShipped, setMarkShipped] = useState(false);
  const [msg, setMsg] = useState('');

  // 取引先ごとの「今週の注文あり／なし」
  const partners = useMemo(() => {
    const list = customers.filter((c) => c.status === 'approved' && c.role !== 'admin');
    return list
      .map((c) => ({ c, mine: weekOrders.filter((o) => o.customer_id === c.id) }))
      .sort((a, b) => (b.mine.length > 0) - (a.mine.length > 0) || a.c.shop_name.localeCompare(b.c.shop_name, 'ja'));
  }, [customers, weekOrders]);
  const orderedCount = partners.filter((p) => p.mine.length).length;

  // 豆ごとの合計（焙煎量の目安）
  const beanTotals = useMemo(() => {
    const map = new Map();
    for (const o of weekOrders) {
      for (const i of o.items) {
        const key = `${i.bean_id}::${i.option}`;
        const cur = map.get(key) ?? { name: i.name, option: i.option, qty: 0, cardNeed: 0, cardNo: 0 };
        cur.qty += i.qty;
        if (i.info_card === true) cur.cardNeed += i.qty;
        if (i.info_card === false) cur.cardNo += i.qty;
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.qty * (KG[b.option] ?? 0) - a.qty * (KG[a.option] ?? 0));
  }, [weekOrders]);

  const total = weekOrders.reduce((s, o) => s + o.total, 0);
  const totalKg = weekOrders.reduce((s, o) => s + orderKg(o), 0);

  const download = async () => {
    setMsg('');
    if (!weekOrders.length) return;
    const [y, m, d] = shipDate.split('-').map(Number);
    downloadYamatoCsv(weekOrders, { shipDate: new Date(y, m - 1, d), boxes }, `yamato_${toInput(start)}_${toInput(addDays(end, -1))}.csv`);
    if (markShipped) {
      try {
        const updated = [];
        for (const o of weekOrders.filter((x) => x.status !== 'shipped')) updated.push(await updateOrder(o.id, { status: 'shipped' }));
        onOrdersChange(updated);
        setMsg(`CSVを出力し、${updated.length}件を「発送済み」にしました`);
      } catch (e) {
        setMsg(e.message);
      }
    } else {
      setMsg(`CSVを出力しました（${weekOrders.length}件）`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStart(addDays(start, -7))} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-cream-line">← 前の週</button>
        <div className="px-2 text-center">
          <div className="font-serif text-xl font-semibold">{md(start)} 〜 {md(addDays(end, -1))}</div>
          <div className={`text-xs ${closed ? 'text-ink-mute' : 'text-gold'}`}>{closed ? '締め切り済み' : `受付中（${md(addDays(end, -1))} 23:59 締め）`}</div>
        </div>
        <button type="button" onClick={() => setStart(addDays(start, 7))} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-cream-line">次の週 →</button>
        <button type="button" onClick={() => setStart(weekStart(now))} className="ml-auto rounded-full px-3 py-1.5 text-xs text-ink-mute ring-1 ring-cream-line">今週</button>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['注文', `${weekOrders.length}件`],
          ['注文した取引先', `${orderedCount} / ${partners.length}社`],
          ['合計（税込）', yen(total)],
          ['豆の量', kgText(totalKg)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-3 ring-1 ring-cream-line">
            <dt className="text-[11px] text-ink-mute">{k}</dt>
            <dd className="mt-0.5 font-serif text-xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h3 className="mb-2 text-sm font-medium">取引先ごとの注文状況</h3>
        {partners.length === 0 ? <p className="text-sm text-ink-mute">承認済みの取引先はまだいません</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {partners.map(({ c, mine }) => (
              <li key={c.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 ${mine.length ? 'bg-white ring-[#4c6b44]/40' : 'bg-cream ring-cream-line'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${mine.length ? 'bg-[#4c6b44] text-white' : 'bg-cream-deep text-ink-mute'}`}>{mine.length ? '✓' : '—'}</span>
                <span className={`min-w-0 flex-1 truncate ${mine.length ? 'font-medium' : 'text-ink-mute'}`}>{c.shop_name || c.email}</span>
                <span className="shrink-0 text-xs text-ink-mute">
                  {mine.length ? `${mine.map((o) => `#${o.order_no}`).join(' ')} · ${yen(mine.reduce((s, o) => s + o.total, 0))}` : '今週は注文なし'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {beanTotals.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium">豆ごとの合計</h3>
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-cream-line">
            <table className="w-full text-sm">
              <thead className="bg-cream text-[11px] text-ink-mute">
                <tr><th className="px-3 py-2 text-left font-normal">豆</th><th className="px-3 py-2 text-right font-normal">数量</th><th className="px-3 py-2 text-right font-normal">量</th><th className="px-3 py-2 text-right font-normal">カード 必要／不要</th></tr>
              </thead>
              <tbody>
                {beanTotals.map((b) => (
                  <tr key={`${b.name}${b.option}`} className="border-t border-cream-line/60">
                    <td className="px-3 py-2">{b.name}<span className="ml-1 text-xs text-ink-mute">{b.option === 'sh400' ? 'Strong Hold 400g' : '1kg'}</span></td>
                    <td className="px-3 py-2 text-right">{b.qty}</td>
                    <td className="px-3 py-2 text-right">{kgText(b.qty * (KG[b.option] ?? 0))}</td>
                    <td className="px-3 py-2 text-right text-xs">{b.cardNeed || b.cardNo ? `${b.cardNeed} / ${b.cardNo}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-cream-line">
        <h3 className="text-sm font-medium">ヤマト運輸（B2クラウド）送り状CSV</h3>
        <p className="mt-1 text-xs text-ink-mute">この週の注文（キャンセルを除く）を、1注文＝送り状1行で出力します。個数は注文の量を見て調整してください。</p>
        {!shipperReady() && (
          <p className="mt-2 rounded-lg bg-rust/10 px-3 py-2 text-xs text-rust">ご依頼主（発送元）の住所・電話番号が未設定です。このままだと B2クラウドの取り込みでエラーになります。</p>
        )}
        {weekOrders.length === 0 ? <p className="mt-3 text-sm text-ink-mute">この週の注文はありません</p> : (
          <>
            <ul className="mt-3 divide-y divide-cream-line/70 text-sm">
              {weekOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="w-14 font-medium">#{o.order_no}</span>
                  <span className="min-w-0 flex-1 truncate">{o.shipping?.shipping_name || o.shipping?.shop_name}</span>
                  <span className="text-xs text-ink-mute">{kgText(orderKg(o))}</span>
                  {o.desired_date && <span className="text-xs text-gold">希望納期 {o.desired_date}</span>}
                  <label className="flex items-center gap-1 text-xs">
                    個数
                    <input
                      type="number"
                      min="1"
                      value={boxes[o.id] ?? 1}
                      onChange={(e) => setBoxes((b) => ({ ...b, [o.id]: Math.max(1, Number(e.target.value) || 1) }))}
                      className="w-14 rounded-lg border border-cream-line px-2 py-1 text-right text-sm"
                    />
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                出荷予定日
                <input type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} className="rounded-lg border border-cream-line px-2 py-1 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markShipped} onChange={(e) => setMarkShipped(e.target.checked)} />
                出力した注文を「発送済み」にする
              </label>
              <button type="button" onClick={download} className="ml-auto rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-sea-deep">CSVをダウンロード（{weekOrders.length}件）</button>
            </div>
          </>
        )}
        {msg && <p className="mt-2 text-sm text-sea-deep">{msg}</p>}
      </section>
    </div>
  );
}
