// 価格は承認済みの取引先だけに表示する。未ログイン・承認前の人には価格の代わりにこれを出す
// （ログイン画面は App 側で 'ws:open-auth' イベントを受けて開く）
export const openAuth = () => window.dispatchEvent(new CustomEvent('ws:open-auth'));

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function LockedPrice({ t, pending, size = 'sm' }) {
  if (size === 'lg') {
    return (
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-cream-line">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-cream-deep text-ink-soft"><LockIcon /></div>
        <p className="mt-3 text-sm font-medium text-ink">{pending ? t.locked.pendingTitle : t.locked.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-mute">{pending ? t.locked.pendingBody : t.locked.body}</p>
        {!pending && (
          <button type="button" onClick={openAuth} className="mt-4 rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white hover:bg-sea-deep">
            {t.auth.loginOrRegister}
          </button>
        )}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={pending ? undefined : openAuth}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-cream-deep px-3 py-1.5 text-xs text-ink-soft hover:bg-cream-line"
    >
      <LockIcon />
      {pending ? t.locked.pendingShort : t.locked.short}
    </button>
  );
}
