import { useEffect, useState } from 'react';
import { yen } from '../i18n';
import { ORDER_EMAIL, SHOP_NAME, TAX_RATE } from '../config';

const FORM_KEY = 'ws-order-form';

function loadForm() {
  try {
    return JSON.parse(localStorage.getItem(FORM_KEY)) ?? {};
  } catch {
    return {};
  }
}

export default function CartDrawer({ open, items, t, market, onClose, onQty, onRemove }) {
  const [form, setForm] = useState(loadForm);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch { /* 保存できなくても動作に影響なし */ }
  }, [form]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = market === 'overseas' ? 0 : Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const field = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  const orderText = () => {
    const lines = [
      `${SHOP_NAME} ${t.orderSubject.replace(/[【】[\]]/g, '').trim()}`,
      `(${market === 'overseas' ? t.overseas : t.domestic})`,
      '',
      ...items.map((i) => `・${i.title}\n  ${t.options[i.option]} × ${i.qty}  ${yen(i.price * i.qty)}`),
      '',
      `${t.subtotal}: ${yen(subtotal)}`,
      ...(market === 'overseas' ? [] : [`${t.tax}: ${yen(tax)}`, `${t.total}: ${yen(total)}`]),
      t.shippingNote,
      '',
      `■ ${t.orderForm}`,
      `${t.company}: ${form.company ?? ''}`,
      `${t.person}: ${form.person ?? ''}`,
      `${t.contact}: ${form.contact ?? ''}`,
      `${t.delivery}: ${form.delivery ?? ''}`,
      `${t.note}: ${form.note ?? ''}`,
    ];
    return lines.join('\n');
  };

  const mailHref = () =>
    `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(`${t.orderSubject}${form.company || ''}`)}&body=${encodeURIComponent(orderText())}`;
  const lineHref = () => `https://line.me/R/share?text=${encodeURIComponent(orderText())}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* クリップボード非対応 */ }
  };

  const empty = items.length === 0;

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-ink/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label={t.cart}
      >
        <header className="flex items-center justify-between border-b border-cream-line px-5 py-4">
          <h2 className="font-serif text-2xl font-semibold">{t.cart}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-cream-deep">×</button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {empty ? (
            <p className="py-16 text-center text-sm text-ink-mute">{t.cartEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.id} className="rounded-2xl bg-white p-4 ring-1 ring-cream-line">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-serif text-lg font-semibold leading-snug">{i.title}</div>
                      <div className="text-xs text-ink-mute">{t.options[i.option]} · {yen(i.price)}</div>
                    </div>
                    <button type="button" onClick={() => onRemove(i.id)} className="shrink-0 text-xs text-ink-mute underline hover:text-rust">{t.remove}</button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded-full ring-1 ring-cream-line">
                      <button type="button" onClick={() => onQty(i.id, i.qty - 1)} className="h-8 w-9 text-lg" aria-label="-">−</button>
                      <span className="w-8 text-center text-sm">{i.qty}</span>
                      <button type="button" onClick={() => onQty(i.id, i.qty + 1)} className="h-8 w-9 text-lg" aria-label="+">+</button>
                    </div>
                    <div className="font-semibold">{yen(i.price * i.qty)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!empty && (
            <>
              <dl className="mt-5 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">{t.subtotal}</dt><dd>{yen(subtotal)}</dd></div>
                {market !== 'overseas' && (
                  <div className="flex justify-between"><dt className="text-ink-soft">{t.tax}</dt><dd>{yen(tax)}</dd></div>
                )}
                <div className="flex justify-between border-t border-cream-line pt-2 text-lg font-semibold">
                  <dt>{market === 'overseas' ? t.totalOverseas : t.total}</dt><dd>{yen(total)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-ink-mute">{t.shippingNote}</p>

              <h3 className="mb-3 mt-6 text-sm font-medium">{t.orderForm}</h3>
              <div className="space-y-2.5">
                {['company', 'person', 'contact', 'delivery'].map((k) => (
                  <input key={k} placeholder={t[k]} {...field(k)} className="w-full rounded-xl border border-cream-line bg-white px-3 py-2.5 text-sm placeholder:text-ink-mute" />
                ))}
                <textarea placeholder={t.note} rows={3} {...field('note')} className="w-full rounded-xl border border-cream-line bg-white px-3 py-2.5 text-sm placeholder:text-ink-mute" />
              </div>
            </>
          )}
        </div>

        {!empty && (
          <footer className="space-y-2 border-t border-cream-line bg-cream px-5 py-4">
            <a href={mailHref()} className="block rounded-full bg-ink py-3 text-center text-sm font-medium text-white hover:bg-sea-deep">{t.sendMail}</a>
            <div className="flex gap-2">
              <a href={lineHref()} target="_blank" rel="noreferrer" className="flex-1 rounded-full bg-[#06C755] py-2.5 text-center text-sm font-medium text-white hover:opacity-90">{t.sendLine}</a>
              <button type="button" onClick={copy} className="flex-1 rounded-full bg-white py-2.5 text-sm ring-1 ring-cream-line hover:bg-cream-deep">{copied ? `✓ ${t.copied}` : t.copy}</button>
            </div>
            <p className="pt-1 text-[11px] leading-relaxed text-ink-mute">{t.orderNote}</p>
          </footer>
        )}
      </aside>
    </div>
  );
}
