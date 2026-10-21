import BeanVisual from './BeanVisual';
import { RankBadge, LabelBadges } from './Badges';
import { mainPrice, yen } from '../i18n';

export default function BeanCard({ bean, media, t, lang, market, onOpen, onQuickAdd, admin, onEdit }) {
  const soldOut = bean.stock.soldOut;
  const price = mainPrice(bean, market);
  const catchCopy = lang === 'en' ? media?.catch_en || media?.catch_ja : media?.catch_ja || media?.catch_en;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_0_#ddd3c6] ring-1 ring-cream-line/70 transition hover:-translate-y-0.5 hover:shadow-lg ${soldOut ? 'opacity-70' : ''} ${media?.hidden ? 'outline-dashed outline-2 outline-rust' : ''}`}
    >
      <button type="button" onClick={onOpen} className="relative block text-left">
        <BeanVisual bean={bean} media={media} className="aspect-[16/9] w-full" rounded="rounded-none" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <LabelBadges bean={bean} media={media} t={t} soldOut={soldOut} />
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <RankBadge rank={bean.rank} />
          <span className="text-xs text-ink-mute">
            {bean.isBlend ? 'Original Blend' : `${bean.country} · ${bean.countryJa}`}
          </span>
        </div>

        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="font-serif text-xl font-semibold leading-snug text-ink group-hover:text-sea-deep">
            {bean.title}
          </h3>
          {bean.subtitle && <p className="mt-0.5 text-xs text-ink-mute">{bean.subtitle}</p>}
        </button>

        {catchCopy && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{catchCopy}</p>}

        <p className="mt-2 text-xs text-ink-mute">
          {[bean.process, bean.roast].filter(Boolean).join(' / ')}
        </p>

        {bean.flavorNotes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {bean.flavorNotes.slice(0, 4).map((f) => (
              <span key={f} className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-ink-soft">{f}</span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <div className="text-[11px] text-ink-mute">
              {market === 'overseas' ? t.overseas1kg : `${t.wholesale1kg}（${t.exTax}）`}
            </div>
            <div className="font-serif text-2xl font-semibold tracking-tight text-ink">{yen(price)}</div>
            <div className={`text-[11px] ${soldOut ? 'text-rust' : 'text-ink-mute'}`}>
              {t.stock} {soldOut ? t.soldOut : bean.stock.text || '—'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {admin && (
              <button type="button" onClick={onEdit} className="rounded-full border border-rust px-3 py-1 text-xs text-rust hover:bg-rust hover:text-white">
                写真・説明を編集
              </button>
            )}
            <button
              type="button"
              disabled={soldOut || !price}
              onClick={onQuickAdd}
              className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-sea-deep disabled:cursor-not-allowed disabled:bg-cream-line disabled:text-ink-mute"
            >
              {soldOut ? t.soldOut : `+ ${t.addShort}`}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
