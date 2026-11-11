import { useEffect, useState } from 'react';
import { fetchOrders, signOut, updateCustomer } from '../lib/db';
import { yen } from '../i18n';

const input = 'w-full rounded-xl border border-cream-line bg-white px-3 py-2 text-sm text-ink';

export const STATUS_STYLE = {
  received: 'bg-gold/15 text-gold',
  confirmed: 'bg-sea/15 text-sea-deep',
  shipped: 'bg-[#e8f0e3] text-[#4c6b44]',
  cancelled: 'bg-cream-deep text-ink-mute',
};

export function OrderItems({ order, t }) {
  return (
    <ul className="space-y-1 text-sm">
      {order.items.map((i, idx) => (
        <li key={idx} className="flex justify-between gap-3">
          <span className="min-w-0">
            {i.name}
            <span className="ml-1 text-xs text-ink-mute">{t.options[i.option] ?? i.option} × {i.qty}</span>
          </span>
          <span className="shrink-0">{yen(i.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AccountPanel({ t, account, onClose }) {
  const { profile, setProfile } = account;
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [draft, setDraft] = useState(profile);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (profile?.status === 'approved') fetchOrders(profile.id).then(setOrders).catch(() => setOrders([]));
    else setOrders([]);
  }, [profile]);

  const field = (k) => ({ value: draft?.[k] ?? '', onChange: (e) => setDraft((d) => ({ ...d, [k]: e.target.value })) });

  const save = async () => {
    setMsg('');
    try {
      const { shop_name, contact_name, phone, postal_code, address, shipping_name, billing_name, billing_address } = draft;
      setProfile(await updateCustomer(profile.id, { shop_name, contact_name, phone, postal_code, address, shipping_name, billing_name, billing_address }));
      setMsg(t.account.saved);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const logout = async () => {
    await signOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-cream shadow-2xl">
        <header className="flex items-center justify-between border-b border-cream-line px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs text-ink-mute">{t.account.title}</div>
            <h2 className="truncate font-serif text-2xl font-semibold">{profile?.shop_name || profile?.email}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl hover:bg-cream-deep">×</button>
        </header>

        {profile?.status !== 'approved' && (
          <div className="bg-gold/15 px-5 py-3 text-sm text-ink">{profile?.status === 'suspended' ? t.account.suspended : t.account.pending}</div>
        )}

        <div className="flex gap-1 border-b border-cream-line px-5 pt-3 text-sm">
          {['orders', 'profile'].map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2 ${tab === k ? 'border-ink font-medium' : 'border-transparent text-ink-mute'}`}>
              {t.account[k]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'orders' && (
            orders == null ? <p className="py-10 text-center text-sm text-ink-mute">{t.loading}</p>
              : orders.length === 0 ? <p className="py-10 text-center text-sm text-ink-mute">{t.account.noOrders}</p>
              : (
                <ul className="space-y-3">
                  {orders.map((o) => (
                    <li key={o.id} className="rounded-2xl bg-white p-4 ring-1 ring-cream-line">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium">#{o.order_no}<span className="ml-2 text-xs font-normal text-ink-mute">{new Date(o.created_at).toLocaleDateString('ja-JP')}</span></div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_STYLE[o.status]}`}>{t.orderStatus[o.status]}</span>
                      </div>
                      <OrderItems order={o} t={t} />
                      <div className="mt-2 flex justify-between border-t border-cream-line pt-2 text-sm font-semibold">
                        <span>{t.total}</span><span>{yen(o.total)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )
          )}

          {tab === 'profile' && draft && (
            <div className="space-y-2.5">
              <div className="text-xs text-ink-mute">{t.auth.email}: {profile.email}</div>
              <input placeholder={t.company} {...field('shop_name')} className={input} />
              <input placeholder={t.person} {...field('contact_name')} className={input} />
              <input placeholder={t.auth.phone} {...field('phone')} className={input} />
              <div className="pt-2 text-xs font-medium text-ink-soft">{t.auth.shipping}</div>
              <input placeholder={t.account.shippingName} {...field('shipping_name')} className={input} />
              <input placeholder={t.auth.postal} {...field('postal_code')} className={input} />
              <textarea rows={2} placeholder={t.auth.address} {...field('address')} className={input} />
              <div className="pt-2 text-xs font-medium text-ink-soft">{t.account.billing}</div>
              <input placeholder={t.account.billingName} {...field('billing_name')} className={input} />
              <textarea rows={2} placeholder={t.account.billingAddress} {...field('billing_address')} className={input} />
              {msg && <p className="text-sm text-sea-deep">{msg}</p>}
              <button type="button" onClick={save} className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white">{t.account.save}</button>
            </div>
          )}
        </div>

        <footer className="border-t border-cream-line px-5 py-3">
          <button type="button" onClick={logout} className="text-sm text-ink-mute underline">{t.account.logout}</button>
        </footer>
      </aside>
    </div>
  );
}
