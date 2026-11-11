import { useState } from 'react';
import { signIn, signUp } from '../lib/db';

const input = 'w-full rounded-xl border border-cream-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-mute';

export default function AuthModal({ t, initialTab = 'login', onClose, onLoggedIn }) {
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState({ email: '', password: '', shop_name: '', contact_name: '', phone: '', postal_code: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const field = (k) => ({ value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (tab === 'login') {
        await signIn(form.email.trim(), form.password);
        onLoggedIn?.();
        onClose();
      } else {
        if (form.password.length < 8) throw new Error(t.auth.passwordShort);
        for (const k of ['shop_name', 'contact_name', 'phone', 'postal_code', 'address']) {
          if (!form[k].trim()) throw new Error(t.auth.required);
        }
        await signUp({ ...form, email: form.email.trim() });
        setDone(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold">{tab === 'login' ? t.auth.login : t.auth.register}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-cream-deep">×</button>
        </div>

        {done ? (
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">{t.auth.registeredTitle}</p>
            <p>{t.auth.registeredBody}</p>
            <button type="button" onClick={onClose} className="mt-2 w-full rounded-full bg-ink py-3 text-sm font-medium text-white">{t.close}</button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex rounded-full bg-cream-deep p-1 text-sm">
              {['login', 'register'].map((k) => (
                <button key={k} type="button" onClick={() => { setTab(k); setError(''); }} className={`flex-1 rounded-full py-2 ${tab === k ? 'bg-white shadow-sm' : 'text-ink-mute'}`}>
                  {k === 'login' ? t.auth.login : t.auth.register}
                </button>
              ))}
            </div>

            {tab === 'register' && <p className="mt-4 text-xs leading-relaxed text-ink-mute">{t.auth.registerNote}</p>}

            <form onSubmit={submit} className="mt-4 space-y-2.5">
              <input type="email" required autoComplete="email" placeholder={t.auth.email} {...field('email')} className={input} />
              <input type="password" required autoComplete={tab === 'login' ? 'current-password' : 'new-password'} placeholder={tab === 'login' ? t.auth.password : t.auth.passwordNew} {...field('password')} className={input} />
              {tab === 'register' && (
                <>
                  <input placeholder={t.company} {...field('shop_name')} className={input} />
                  <input placeholder={t.person} {...field('contact_name')} className={input} />
                  <input type="tel" placeholder={t.auth.phone} {...field('phone')} className={input} />
                  <div className="pt-1 text-xs font-medium text-ink-soft">{t.auth.shipping}</div>
                  <input placeholder={t.auth.postal} {...field('postal_code')} className={input} />
                  <textarea rows={2} placeholder={t.auth.address} {...field('address')} className={input} />
                </>
              )}
              {error && <p className="text-sm text-rust">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:bg-sea-deep disabled:opacity-50">
                {busy ? '…' : tab === 'login' ? t.auth.login : t.auth.registerSubmit}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
