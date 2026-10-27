import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchBeans, toBean } from './lib/db';
import { makeT, optionsFor, yen } from './i18n';
import { ORDER_EMAIL } from './config';
import BeanCard from './components/BeanCard';
import BeanRow, { BeanRowHeader } from './components/BeanRow';
import BeanDetail from './components/BeanDetail';
import BeanVisual from './components/BeanVisual';
import CartDrawer from './components/CartDrawer';
import AdminEditor from './components/AdminEditor';
import { RANK_ORDER } from './components/Badges';

const BASE = import.meta.env.BASE_URL;
const NEW_BEAN = '__new';

function usePersisted(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v == null ? initial : JSON.parse(v);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* 保存できなくても動作に影響なし */ }
  }, [key, value]);
  return [value, setValue];
}

function useAdmin() {
  const wants = new URLSearchParams(window.location.search).has('admin');
  const [ok, setOk] = useState(() => {
    try {
      return sessionStorage.getItem('ws-admin') === '1';
    } catch {
      return false;
    }
  });
  const login = (pw) => {
    if (pw && pw === import.meta.env.VITE_ADMIN_PASSWORD) {
      try { sessionStorage.setItem('ws-admin', '1'); } catch { /* noop */ }
      setOk(true);
      return true;
    }
    return false;
  };
  return { wants, ok, login };
}

function recommendScore(bean, media) {
  const rank = RANK_ORDER.indexOf(bean.rank);
  return (media?.featured ? -100 : 0) + (rank < 0 ? 50 : rank * 5) - (bean.labels.includes('newArrival') ? 3 : 0);
}

export default function App() {
  const [lang, setLang] = usePersisted('ws-lang', 'ja');
  const [cart, setCart] = usePersisted('ws-cart', []);
  const [view, setView] = usePersisted('ws-view', 'list');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [rank, setRank] = useState('');
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('origin');
  const [openKey, setOpenKey] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');
  const admin = useAdmin();
  const t = makeT(lang);

  useEffect(() => {
    fetchBeans().then(setRows).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // media は写真・紹介文などを含むDBの行そのもの（豆IDで引く）
  const media = useMemo(() => Object.fromEntries((rows ?? []).map((r) => [r.id, r])), [rows]);
  const beans = useMemo(
    () => (rows ?? []).filter((r) => admin.ok || !r.hidden).map(toBean),
    [rows, admin.ok]
  );
  const ready = rows != null && (rows.length > 0 || admin.ok);

  // シート更新で価格が変わった場合に備え、カートの価格は常に最新シートから引き直す
  const cartItems = useMemo(() => {
    const byKey = Object.fromEntries(beans.map((b) => [b.key, b]));
    return cart
      .map((c) => {
        const bean = byKey[c.key];
        if (!bean || bean.stock.soldOut) return null;
        const opt = optionsFor(bean).find((o) => o.id === c.option);
        return opt ? { ...c, title: bean.title, price: opt.price } : null;
      })
      .filter(Boolean);
  }, [cart, beans]);

  const countries = useMemo(() => {
    const seen = new Map();
    for (const b of beans) if (!b.isBlend && !seen.has(b.country)) seen.set(b.country, b.countryJa);
    return [...seen.entries()];
  }, [beans]);

  const ranks = useMemo(() => RANK_ORDER.filter((r) => beans.some((b) => b.rank === r)), [beans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = beans.filter((b) => {
      if (country === '__blend') { if (!b.isBlend) return false; } else if (country && b.country !== country) return false;
      if (rank && b.rank !== rank) return false;
      if (inStock && b.stock.soldOut) return false;
      if (q) {
        const m = media[b.key];
        const hay = [b.name, b.country, b.countryJa, b.process, b.flavor, b.variety, b.region, b.producer, m?.catch_ja, m?.catch_en].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const price = (b) => b.wholesale ?? Infinity;
    if (sort === 'recommend') list = [...list].sort((a, b) => recommendScore(a, media[a.key]) - recommendScore(b, media[b.key]));
    if (sort === 'priceAsc') list = [...list].sort((a, b) => price(a) - price(b));
    if (sort === 'priceDesc') list = [...list].sort((a, b) => (b.wholesale ?? 0) - (a.wholesale ?? 0));
    // 売り切れは常に後ろへ
    return [...list].sort((a, b) => Number(a.stock.soldOut) - Number(b.stock.soldOut));
  }, [beans, media, query, country, rank, inStock, sort]);

  const groups = useMemo(() => {
    if (sort !== 'origin') return [{ id: 'all', items: filtered }];
    const map = new Map();
    for (const b of filtered) {
      const id = b.isBlend ? 'Original Blend' : b.country;
      if (!map.has(id)) map.set(id, { id, ja: b.isBlend ? 'オリジナルブレンド' : b.countryJa, items: [] });
      map.get(id).items.push(b);
    }
    return [...map.values()];
  }, [filtered, sort]);

  const pickups = useMemo(() => {
    const featured = beans.filter((b) => media[b.key]?.featured && !b.stock.soldOut);
    if (featured.length) return featured;
    return beans
      .filter((b) => !b.stock.soldOut && (['Compe Lot', 'Top of Top'].includes(b.rank) || b.labels.includes('newArrival')))
      .slice(0, 8);
  }, [beans, media]);

  const addToCart = useCallback((bean, option, qty = 1) => {
    setCart((c) => {
      const id = `${bean.key}::${option}`;
      const found = c.find((i) => i.id === id);
      if (found) return c.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i));
      return [...c, { id, key: bean.key, option, qty }];
    });
    setToast(`${bean.title} — ${t.added}`);
    setTimeout(() => setToast(''), 1800);
  }, [setCart, t.added]);

  const quickAdd = (bean, optionId) => {
    const opt = optionsFor(bean).find((o) => !optionId || o.id === optionId);
    if (opt) addToCart(bean, opt.id, 1);
  };

  const setQty = (id, qty) => setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty } : i))));
  const removeItem = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const openBean = beans.find((b) => b.key === openKey);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const directCount = beans.filter((b) => b.labels.includes('directTrade')).length;
  const inquiryHref = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(t.inquirySubject)}`;

  if (admin.wants && !admin.ok) return <AdminLogin onLogin={admin.login} />;

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-cream-line/70 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <img src={`${BASE}icon-192.png`} alt="" className="h-9 w-9 rounded-full" />
            <div className="hidden whitespace-nowrap leading-none min-[480px]:block">
              <div className="font-serif text-lg font-semibold tracking-[0.12em]">ABOUT US COFFEE</div>
              <div className="mt-0.5 text-[10px] tracking-[0.3em] text-ink-mute">WHOLESALE</div>
            </div>
          </a>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Segmented value={lang} onChange={setLang} options={[['ja', 'JA'], ['en', 'EN']]} />
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-sea-deep"
            >
              <CartIcon />
              <span className="hidden sm:inline">{t.cart}</span>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px]">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
        {admin.ok && (
          <div className="bg-rust px-4 py-1 text-center text-xs text-white">
            管理者モード — 各豆の「編集」から内容を変更、「＋ 豆を追加」で新規登録できます
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-ink">
        <img src={`${BASE}hero-roast.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover object-[65%_center]" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/50 to-ink/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-white sm:px-6 sm:py-24">
          <p className="text-xs tracking-[0.35em] opacity-80">{t.tagline.toUpperCase()}</p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-[1.15] sm:text-6xl">
            Wish your happiness bloom,<br />with a cup of bliss.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed opacity-90 sm:text-lg">{t.heroLead}</p>
          <p className="mt-2 max-w-xl text-sm opacity-75">{t.heroSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#lineup" className="rounded-full bg-white px-6 py-3 text-sm font-medium text-ink hover:bg-cream">{t.browse}</a>
            <a href={inquiryHref} className="rounded-full px-6 py-3 text-sm font-medium text-white ring-1 ring-white/70 hover:bg-white/10">{t.inquiry}</a>
          </div>
          {ready && (
            <dl className="mt-12 flex gap-10">
              <Stat n={beans.length} label={t.statLots} />
              <Stat n={countries.length} label={t.statOrigins} />
              <Stat n={directCount} label={t.statDirect} />
            </dl>
          )}
        </div>
      </section>

      {rows == null && !error && <p className="py-24 text-center text-sm text-ink-mute">{t.loading}</p>}
      {((rows != null && !ready) || error) && <p className="py-24 text-center text-sm text-ink-mute">{t.preparing}</p>}

      {ready && (
        <>
          {/* Pick Up */}
          {pickups.length > 0 && (
            <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
              <SectionTitle title={t.pickup} sub={t.pickupSub} />
              <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
                {pickups.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setOpenKey(b.key)}
                    className="group relative w-64 shrink-0 snap-start overflow-hidden rounded-3xl text-left sm:w-72"
                  >
                    <BeanVisual bean={b} media={media[b.key]} className="aspect-[3/4] w-full transition duration-500 group-hover:scale-[1.03]" rounded="rounded-3xl" plain />
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <div className="text-[11px] tracking-[0.2em] opacity-80">{b.rank || 'BLEND'} · {b.country.toUpperCase()}</div>
                      <div className="mt-1 font-serif text-xl font-semibold leading-snug">{b.title}</div>
                      <div className="mt-1 line-clamp-1 text-xs opacity-80">{b.flavorNotes.slice(0, 3).join(' · ')}</div>
                      <div className="mt-3 font-serif text-lg">{yen(b.wholesale)}<span className="ml-1 text-xs opacity-70">{t.perKg}</span></div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Line Up */}
          <section id="lineup" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-14 sm:px-6">
            <SectionTitle title={t.lineup} sub={t.updated} />

            <div className="z-30 -mx-4 sm:sticky sm:top-[61px] space-y-3 border-b border-cream-line/60 bg-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.search}
                    className="w-full rounded-full border border-cream-line bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-mute"
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute">⌕</span>
                </div>
                <select value={rank} onChange={(e) => setRank(e.target.value)} className="rounded-full border border-cream-line bg-white px-4 py-2.5 text-sm">
                  <option value="">Rank: {t.all}</option>
                  {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-full border border-cream-line bg-white px-4 py-2.5 text-sm">
                  <option value="origin">{t.sortOrigin}</option>
                  <option value="recommend">{t.sortRecommend}</option>
                  <option value="priceAsc">{t.sortPriceAsc}</option>
                  <option value="priceDesc">{t.sortPriceDesc}</option>
                </select>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-cream-line bg-white px-4 py-2.5 text-sm">
                  <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-ink" />
                  {t.inStock}
                </label>
              </div>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
                <Chip active={!country} onClick={() => setCountry('')}>{t.all}</Chip>
                {countries.map(([en, ja]) => (
                  <Chip key={en} active={country === en} onClick={() => setCountry(en)}>
                    {lang === 'en' ? en : ja}
                  </Chip>
                ))}
                {beans.some((b) => b.isBlend) && (
                  <Chip active={country === '__blend'} onClick={() => setCountry('__blend')}>{lang === 'en' ? 'Blend' : 'ブレンド'}</Chip>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-xs text-ink-mute">{filtered.length} {t.results}</p>
                {admin.ok && (
                  <button type="button" onClick={() => setEditKey(NEW_BEAN)} className="rounded-full bg-rust px-3 py-1 text-xs text-white">
                    + 豆を追加
                  </button>
                )}
              </div>
              <Segmented value={view} onChange={setView} options={[['list', `☰ ${t.viewList}`], ['card', `▦ ${t.viewCard}`]]} />
            </div>

            {filtered.length === 0 && <p className="py-20 text-center text-sm text-ink-mute">{t.noResults}</p>}

            {groups.map((g) => (
              <div key={g.id} className="mt-8 first:mt-4">
                {g.id !== 'all' && (
                  <h3 className="mb-3 flex items-baseline gap-3 border-b border-cream-line pb-2">
                    <span className="font-serif text-2xl font-semibold">{g.id}</span>
                    <span className="text-sm text-ink-mute">{g.ja}</span>
                    <span className="ml-auto text-xs text-ink-mute">{g.items.length}</span>
                  </h3>
                )}
                {view === 'list' ? (
                  <div className="space-y-2">
                    <BeanRowHeader t={t} />
                    {g.items.map((b) => (
                      <BeanRow
                        key={b.key}
                        bean={b}
                        media={media[b.key]}
                        t={t}
                        admin={admin.ok}
                        onOpen={() => setOpenKey(b.key)}
                        onQuickAdd={() => quickAdd(b, 'wholesale')}
                        onAddSh400={() => quickAdd(b, 'sh400')}
                        onEdit={() => setEditKey(b.key)}
                      />
                    ))}
                  </div>
                ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {g.items.map((b) => (
                    <BeanCard
                      key={b.key}
                      bean={b}
                      media={media[b.key]}
                      t={t}
                      lang={lang}
                      admin={admin.ok}
                      onOpen={() => setOpenKey(b.key)}
                      onQuickAdd={() => quickAdd(b, 'wholesale')}
                        onAddSh400={() => quickAdd(b, 'sh400')}
                      onEdit={() => setEditKey(b.key)}
                    />
                  ))}
                </div>
                )}
              </div>
            ))}
          </section>

          {/* Contact */}
          <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-white sm:px-12">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `url(${BASE}hero-pattern.png)`, backgroundSize: 'cover' }} />
              <div className="relative max-w-xl">
                <h2 className="font-serif text-3xl font-semibold">{t.contactTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed opacity-80">{t.contactBody}</p>
                <p className="mt-3 text-xs leading-relaxed opacity-60">{t.shippingNote}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={inquiryHref} className="rounded-full bg-white px-6 py-3 text-sm font-medium text-ink hover:bg-cream">{t.inquiry}</a>
                  <span className="self-center text-sm opacity-70">{ORDER_EMAIL}</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="border-t border-cream-line py-8 text-center text-xs text-ink-mute">© ABOUT US COFFEE</footer>

      {/* Floating cart (mobile) */}
      {cartCount > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white shadow-xl sm:hidden"
        >
          <CartIcon /> {t.cart} · {cartCount}
        </button>
      )}

      {toast && (
        <div className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg">{toast}</div>
      )}

      {openBean && (
        <BeanDetail
          key={openBean.key}
          bean={openBean}
          media={media[openBean.key]}
          t={t}
          lang={lang}
          onClose={() => setOpenKey(null)}
          onAdd={addToCart}
        />
      )}

      {editKey && (
        <AdminEditor
          row={editKey === NEW_BEAN ? null : media[editKey]}
          rows={rows ?? []}
          onClose={() => setEditKey(null)}
          onSaved={(saved) => setRows((prev) => {
            const exists = prev.some((r) => r.id === saved.id);
            const next = exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved];
            return next.sort((a, b) => a.sort_order - b.sort_order);
          })}
          onDeleted={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
        />
      )}

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        t={t}
        onClose={() => setCartOpen(false)}
        onQty={setQty}
        onRemove={removeItem}
      />
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-full bg-cream-deep p-0.5 text-xs">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${value === v ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${active ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-cream-line hover:ring-ink'}`}
    >
      {children}
    </button>
  );
}

function Stat({ n, label }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-serif text-4xl font-semibold">{n}</dd>
      <div className="text-xs tracking-wider opacity-75">{label}</div>
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-4xl font-semibold tracking-wide">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-mute">{sub}</p>}
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M9 7V6a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState('');
  const [ng, setNg] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={(e) => { e.preventDefault(); setNg(!onLogin(pw)); }}
        className="w-full max-w-xs space-y-3 rounded-3xl bg-white p-6 ring-1 ring-cream-line"
      >
        <h1 className="font-serif text-xl font-semibold">管理者ログイン</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="パスワード" className="w-full rounded-xl border border-cream-line px-3 py-2.5 text-sm" autoFocus />
        {ng && <p className="text-xs text-rust">パスワードが違います</p>}
        <button type="submit" className="w-full rounded-full bg-ink py-2.5 text-sm text-white">ログイン</button>
      </form>
    </div>
  );
}
