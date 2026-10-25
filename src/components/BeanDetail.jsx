import { useEffect, useState } from 'react';
import BeanVisual from './BeanVisual';
import { RankBadge, LabelBadges } from './Badges';
import { optionsFor, yen } from '../i18n';

function Spec({ label, value }) {
  if (!value) return null;
  return (
    <div className="border-b border-cream-line/70 py-2.5">
      <dt className="text-[11px] uppercase tracking-wider text-ink-mute">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

export default function BeanDetail({ bean, media, t, lang, onClose, onAdd }) {
  const all = optionsFor(bean);
  const [option, setOption] = useState(all[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [added, setAdded] = useState(false);
  const soldOut = bean.stock.soldOut;
  const images = media?.image_urls ?? [];
  const description = lang === 'en' ? media?.description_en || media?.description_ja : media?.description_ja || media?.description_en;
  const catchCopy = lang === 'en' ? media?.catch_en || media?.catch_ja : media?.catch_ja || media?.catch_en;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const selected = all.find((o) => o.id === option);
  const handleAdd = () => {
    if (!selected) return;
    onAdd(bean, selected.id, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-cream sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={bean.title}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-ink shadow hover:bg-white"
        >
          ×
        </button>

        <div className="grid gap-0 md:grid-cols-2">
          <div className="p-4 md:p-6">
            {images.length > 0 ? (
              <div>
                <div className="aspect-square overflow-hidden rounded-2xl bg-cream-deep">
                  <img src={images[photo]} alt={bean.title} className="h-full w-full object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2">
                    {images.map((u, i) => (
                      <button key={u} type="button" onClick={() => setPhoto(i)} className={`h-16 w-16 overflow-hidden rounded-xl ring-2 ${i === photo ? 'ring-ink' : 'ring-transparent'}`}>
                        <img src={u} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <BeanVisual bean={bean} media={media} className="aspect-square w-full" />
            )}

            {bean.flavorNotes.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-mute">{t.flavor}</div>
                <div className="flex flex-wrap gap-2">
                  {bean.flavorNotes.map((f) => (
                    <span key={f} className="rounded-full bg-white px-3 py-1.5 text-sm text-ink ring-1 ring-cream-line">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 pt-0 md:p-8 md:pl-2">
            <div className="flex flex-wrap items-center gap-2 pr-12">
              <RankBadge rank={bean.rank} />
              <LabelBadges bean={bean} media={media} t={t} soldOut={soldOut} />
            </div>
            <p className="mt-3 text-xs tracking-wider text-ink-mute">
              {bean.isBlend ? 'ORIGINAL BLEND' : `${bean.country.toUpperCase()} · ${bean.countryJa}`}
            </p>
            <h2 className="mt-1 font-serif text-3xl font-semibold leading-tight text-ink md:text-4xl">{bean.title}</h2>
            {bean.subtitle && <p className="mt-1 text-sm text-ink-mute">{bean.subtitle}</p>}
            {catchCopy && <p className="mt-4 text-base leading-relaxed text-ink">{catchCopy}</p>}
            {description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{description}</p>}
            {bean.story && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{bean.story}</p>}

            <dl className="mt-5 grid grid-cols-2 gap-x-6">
              <Spec label={t.producer} value={bean.producer} />
              <Spec label={t.region} value={bean.region} />
              <Spec label={t.process} value={bean.process} />
              <Spec label={t.variety} value={bean.variety} />
              <Spec label={t.altitude} value={bean.altitude && (/m$/i.test(bean.altitude) ? bean.altitude : `${bean.altitude}m`)} />
              <Spec label={t.roast} value={bean.roast} />
              <Spec label={t.crop} value={bean.crop} />
              <Spec label={`${t.stock}（${t.stockNote}）`} value={soldOut ? t.soldOut : bean.stock.text} />
            </dl>

            {bean.components.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-mute">{t.blendOf}</div>
                <ul className="space-y-1 text-sm text-ink">
                  {bean.components.map((c, i) => (
                    <li key={i}>· {c.origin}{c.process && <span className="text-ink-mute"> — {c.process}</span>}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-cream-line">
              <div className="border-b border-cream-line px-4 py-3 text-sm font-medium">{t.priceTable}</div>
              <table className="w-full text-sm">
                <tbody>
                  {all.map((o) => (
                    <tr key={o.id} className="border-b border-cream-line/60 last:border-0">
                      <td className="px-4 py-2.5 text-ink">{t.options[o.id]}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{yen(o.price)}</td>
                      <td className="w-20 px-4 py-2.5 text-right text-xs text-ink-mute">{t.exTax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sticky bottom-0 -mx-5 mt-6 border-t border-cream-line bg-cream/95 px-5 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-[11px] text-ink-mute">{t.option}</span>
                  <select
                    value={option}
                    onChange={(e) => setOption(e.target.value)}
                    disabled={soldOut}
                    className="w-full rounded-xl border border-cream-line bg-white px-3 py-2.5 text-sm"
                  >
                    {all.map((o) => <option key={o.id} value={o.id}>{t.options[o.id]} — {yen(o.price)}</option>)}
                  </select>
                </label>
                <label className="w-20">
                  <span className="mb-1 block text-[11px] text-ink-mute">{t.qty}</span>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    disabled={soldOut}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-xl border border-cream-line bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={soldOut || !selected}
                  className="w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-sea-deep disabled:bg-cream-line disabled:text-ink-mute sm:w-auto"
                >
                  {soldOut ? t.soldOut : added ? `✓ ${t.added}` : `${t.addToCart}${selected ? ` · ${yen(selected.price * qty)}` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
