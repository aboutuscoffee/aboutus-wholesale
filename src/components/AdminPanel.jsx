import { useEffect, useMemo, useState } from 'react';
import { fetchCustomerPrices, fetchCustomers, fetchOrders, saveCustomerPrices, updateCustomer, updateOrder } from '../lib/db';
import { yen } from '../i18n';
import { OrderItems, STATUS_STYLE } from './AccountPanel';

const input = 'w-full rounded-xl border border-cream-line bg-white px-3 py-2 text-sm text-ink';
const ORDER_STATUSES = ['received', 'confirmed', 'shipped', 'cancelled'];
const CUSTOMER_STATUS = { pending: '承認待ち', approved: '承認済み', suspended: '停止中' };
const CUSTOMER_STYLE = { pending: 'bg-gold/15 text-gold', approved: 'bg-[#e8f0e3] text-[#4c6b44]', suspended: 'bg-cream-deep text-ink-mute' };

function OrderCard({ order, customer, t, onChange }) {
  const [open, setOpen] = useState(order.status === 'received');
  const [note, setNote] = useState(order.admin_note);
  const s = order.shipping ?? {};

  const set = async (fields) => {
    try {
      onChange(await updateOrder(order.id, fields));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <li className="rounded-2xl bg-white ring-1 ring-cream-line">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left">
        <span className="font-medium">#{order.order_no}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{s.shop_name || customer?.shop_name}</span>
        <span className="text-xs text-ink-mute">{new Date(order.created_at).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span className="font-semibold">{yen(order.total)}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_STYLE[order.status]}`}>{t.orderStatus[order.status]}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-cream-line px-4 py-3 text-sm">
          <OrderItems order={order} t={t} />
          <div className="flex justify-between text-xs text-ink-mute"><span>{t.subtotal} {yen(order.subtotal)} / {t.tax} {yen(order.tax)}</span><span className="font-semibold text-ink">{t.total} {yen(order.total)}</span></div>
          <div className="rounded-xl bg-cream p-3 text-xs leading-relaxed">
            <div className="font-medium">配送先</div>
            <div>{s.shipping_name}（{s.contact_name}）</div>
            <div>〒{s.postal_code} {s.address}</div>
            <div>{s.phone} / {s.email}</div>
            {(s.billing_name || s.billing_address) && <div className="mt-1">請求先: {s.billing_name} {s.billing_address}</div>}
            {order.desired_date && <div className="mt-1">ご希望納期: {order.desired_date}</div>}
            {order.note && <div className="mt-1 whitespace-pre-line">備考: {order.note}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((st) => (
              <button key={st} type="button" onClick={() => set({ status: st })} className={`rounded-full px-3 py-1 text-xs ring-1 ${order.status === st ? 'bg-ink text-white ring-ink' : 'ring-cream-line hover:ring-ink'}`}>
                {t.orderStatus[st]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={input} placeholder="お店用メモ（取引先には見えません）" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" onClick={() => set({ admin_note: note })} className="shrink-0 rounded-full px-4 text-xs ring-1 ring-cream-line">保存</button>
          </div>
        </div>
      )}
    </li>
  );
}

function CustomerDetail({ customer, beans, orders, t, onChange, onBack }) {
  const [draft, setDraft] = useState(customer);
  const [prices, setPrices] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchCustomerPrices(customer.id)
      .then((rows) => setPrices(Object.fromEntries(rows.map((r) => [r.bean_id, r]))))
      .catch(() => setPrices({}));
  }, [customer.id]);

  const field = (k) => ({ value: draft[k] ?? '', onChange: (e) => setDraft((d) => ({ ...d, [k]: e.target.value })) });
  const setPrice = (beanId, k, v) => setPrices((p) => ({ ...p, [beanId]: { ...p[beanId], bean_id: beanId, [k]: v === '' ? null : Number(v.replace(/[^\d]/g, '')) } }));

  const save = async (extra = {}) => {
    setMsg('');
    try {
      const { shop_name, contact_name, phone, postal_code, address, shipping_name, billing_name, billing_address, admin_note } = draft;
      const updated = await updateCustomer(customer.id, { shop_name, contact_name, phone, postal_code, address, shipping_name, billing_name, billing_address, admin_note, ...extra });
      setDraft(updated);
      onChange(updated);
      setMsg('保存しました');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const savePrices = async () => {
    setMsg('');
    try {
      const rows = Object.values(prices).filter((r) => r.price_1kg != null || r.price_sh400 != null)
        .map(({ bean_id, price_1kg, price_sh400 }) => ({ bean_id, price_1kg: price_1kg ?? null, price_sh400: price_sh400 ?? null }));
      await saveCustomerPrices(customer.id, rows);
      setMsg(`特別価格を保存しました（${rows.length}件）`);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const mine = orders.filter((o) => o.customer_id === customer.id);

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm text-ink-mute">← 取引先一覧</button>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-serif text-2xl font-semibold">{draft.shop_name || draft.email}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${CUSTOMER_STYLE[draft.status]}`}>{CUSTOMER_STATUS[draft.status]}</span>
        {draft.role === 'admin' && <span className="rounded-full bg-rust px-2.5 py-0.5 text-xs text-white">管理者</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {draft.status !== 'approved' && <button type="button" onClick={() => save({ status: 'approved' })} className="rounded-full bg-ink px-4 py-2 text-sm text-white">承認する</button>}
        {draft.status === 'approved' && draft.role !== 'admin' && <button type="button" onClick={() => save({ status: 'suspended' })} className="rounded-full px-4 py-2 text-sm ring-1 ring-cream-line">取引を停止</button>}
      </div>

      <section className="grid gap-2.5 sm:grid-cols-2">
        <div className="text-xs text-ink-mute sm:col-span-2">メール: {draft.email}　登録日: {new Date(draft.created_at).toLocaleDateString('ja-JP')}</div>
        <input className={input} placeholder="店舗名・会社名" {...field('shop_name')} />
        <input className={input} placeholder="ご担当者名" {...field('contact_name')} />
        <input className={input} placeholder="電話番号" {...field('phone')} />
        <input className={input} placeholder="配送先の宛名" {...field('shipping_name')} />
        <input className={input} placeholder="郵便番号" {...field('postal_code')} />
        <input className={input} placeholder="配送先住所" {...field('address')} />
        <input className={input} placeholder="請求先の宛名" {...field('billing_name')} />
        <input className={input} placeholder="請求先住所" {...field('billing_address')} />
        <textarea rows={2} className={`${input} sm:col-span-2`} placeholder="お店用メモ（取引先には見えません）" {...field('admin_note')} />
        <button type="button" onClick={() => save()} className="rounded-full bg-ink py-2.5 text-sm text-white sm:col-span-2">登録情報を保存</button>
      </section>
      {msg && <p className="text-sm text-sea-deep">{msg}</p>}

      <section>
        <h4 className="mb-1 text-sm font-medium">取引先別の特別価格（税抜）</h4>
        <p className="mb-2 text-xs text-ink-mute">空欄の豆は通常の卸価格になります。</p>
        {prices == null ? <p className="text-sm text-ink-mute">読み込み中…</p> : (
          <div className="max-h-80 overflow-y-auto rounded-xl bg-white ring-1 ring-cream-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-cream text-[11px] text-ink-mute">
                <tr><th className="px-3 py-2 text-left font-normal">豆</th><th className="px-2 py-2 font-normal">1kg（通常）</th><th className="px-2 py-2 font-normal">SH 400g（通常）</th></tr>
              </thead>
              <tbody>
                {beans.map((b) => (
                  <tr key={b.key} className="border-t border-cream-line/60">
                    <td className="px-3 py-1.5">{b.title}</td>
                    <td className="px-2 py-1.5">
                      <input inputMode="numeric" className="w-full rounded-lg border border-cream-line px-2 py-1 text-right text-sm" placeholder={b.wholesale ?? '—'} value={prices[b.key]?.price_1kg ?? ''} onChange={(e) => setPrice(b.key, 'price_1kg', e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5">
                      {b.sh400 ? <input inputMode="numeric" className="w-full rounded-lg border border-cream-line px-2 py-1 text-right text-sm" placeholder={b.sh400} value={prices[b.key]?.price_sh400 ?? ''} onChange={(e) => setPrice(b.key, 'price_sh400', e.target.value)} /> : <span className="block text-center text-ink-mute">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" onClick={savePrices} className="mt-2 w-full rounded-full py-2.5 text-sm ring-1 ring-ink">特別価格を保存</button>
      </section>

      <section>
        <h4 className="mb-2 text-sm font-medium">注文履歴（{mine.length}件・合計 {yen(mine.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))}）</h4>
        <ul className="space-y-2">
          {mine.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-cream-line">
              <span className="font-medium">#{o.order_no}</span>
              <span className="text-xs text-ink-mute">{new Date(o.created_at).toLocaleDateString('ja-JP')}</span>
              <span className="ml-auto">{yen(o.total)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[o.status]}`}>{t.orderStatus[o.status]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AdminPanel({ t, beans, onClose, onPendingCount }) {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchOrders(), fetchCustomers()])
      .then(([o, c]) => { setOrders(o); setCustomers(c); })
      .catch((e) => setError(e.message));
  }, []);

  const byId = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const pending = customers.filter((c) => c.status === 'pending').length;
  const newOrders = orders.filter((o) => o.status === 'received').length;
  useEffect(() => onPendingCount?.(pending + newOrders), [pending, newOrders, onPendingCount]);

  const shownOrders = orders.filter((o) => (statusFilter === 'active' ? ['received', 'confirmed'].includes(o.status) : statusFilter === 'all' || o.status === statusFilter));
  const sortedCustomers = [...customers].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/50 sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex w-full max-w-4xl flex-col overflow-hidden bg-cream sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-cream-line px-5 py-4">
          <h2 className="font-serif text-2xl font-semibold">管理</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-cream-deep">×</button>
        </header>
        <div className="flex gap-1 border-b border-cream-line px-5 pt-3 text-sm">
          {[['orders', `注文${newOrders ? `（新着 ${newOrders}）` : ''}`], ['customers', `取引先${pending ? `（承認待ち ${pending}）` : ''}`]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setTab(k); setSelected(null); }} className={`-mb-px border-b-2 px-3 py-2 ${tab === k ? 'border-ink font-medium' : 'border-transparent text-ink-mute'}`}>{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="mb-3 text-sm text-rust">{error}</p>}

          {tab === 'orders' && (
            <>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                {[['active', '対応中'], ...ORDER_STATUSES.map((s) => [s, t.orderStatus[s]]), ['all', 'すべて']].map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setStatusFilter(k)} className={`rounded-full px-3 py-1 ring-1 ${statusFilter === k ? 'bg-ink text-white ring-ink' : 'ring-cream-line'}`}>{label}</button>
                ))}
              </div>
              {shownOrders.length === 0 ? <p className="py-10 text-center text-sm text-ink-mute">該当する注文はありません</p> : (
                <ul className="space-y-2">
                  {shownOrders.map((o) => (
                    <OrderCard key={o.id} order={o} customer={byId[o.customer_id]} t={t} onChange={(u) => setOrders((list) => list.map((x) => (x.id === u.id ? u : x)))} />
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'customers' && !selected && (
            customers.length === 0 ? <p className="py-10 text-center text-sm text-ink-mute">まだ登録はありません</p> : (
              <ul className="space-y-2">
                {sortedCustomers.map((c) => {
                  const count = orders.filter((o) => o.customer_id === c.id).length;
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => setSelected(c.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-cream-line hover:ring-ink">
                        <span className="min-w-0 flex-1 truncate font-medium">{c.shop_name || '（店名未入力）'}</span>
                        <span className="text-xs text-ink-mute">{c.contact_name} / {c.email}</span>
                        <span className="text-xs text-ink-mute">注文 {count}件</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${CUSTOMER_STYLE[c.status]}`}>{CUSTOMER_STATUS[c.status]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {tab === 'customers' && selected && byId[selected] && (
            <CustomerDetail
              customer={byId[selected]}
              beans={beans}
              orders={orders}
              t={t}
              onBack={() => setSelected(null)}
              onChange={(u) => setCustomers((list) => list.map((x) => (x.id === u.id ? u : x)))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
