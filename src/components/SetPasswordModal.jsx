import { useState } from 'react';
import { updatePassword } from '../lib/db';

// お店から送られた「パスワード再設定メール」のリンクで開いたときに、新しいパスワードを決める画面
export default function SetPasswordModal({ t, onDone }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError(t.auth.passwordShort);
    if (pw !== pw2) return setError(t.reset.mismatch);
    setBusy(true);
    try {
      await updatePassword(pw);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-xl border border-cream-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-mute';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-cream p-6">
        <h2 className="font-serif text-2xl font-semibold">{t.reset.newTitle}</h2>
        {done ? (
          <>
            <p className="mt-3 text-sm text-ink-soft">{t.reset.changed}</p>
            <button type="button" onClick={onDone} className="mt-5 w-full rounded-full bg-ink py-3 text-sm font-medium text-white">{t.close}</button>
          </>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-2.5">
            <input type="password" autoComplete="new-password" placeholder={t.auth.passwordNew} value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
            <input type="password" autoComplete="new-password" placeholder={t.reset.confirm} value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
            {error && <p className="text-sm text-rust">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white disabled:opacity-50">{busy ? '…' : t.reset.save}</button>
          </form>
        )}
      </div>
    </div>
  );
}
