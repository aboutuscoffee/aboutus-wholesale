import BeanVisual from './BeanVisual';
import { RankBadge, LabelBadges } from './Badges';
import StrongHoldOption from './StrongHoldOption';
import { yen } from '../i18n';

// 一覧性重視の1行表示。PCでは表形式、スマホでは2段の詰めた行になる
export const ROW_GRID = 'lg:grid lg:grid-cols-[52px_minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,2fr)_72px_104px_92px] lg:items-center lg:gap-4';

export function BeanRowHeader({ t }) {
  return (
    <div className={`hidden px-4 pb-2 text-[11px] uppercase tracking-wider text-ink-mute ${ROW_GRID}`}>
      <span />
      <span>Name</span>
      <span>{t.region}</span>
      <span>{t.process} / {t.roast}</span>
      <span>{t.flavor}</span>
      <span className="text-right">{t.stock}</span>
      <span className="text-right">{t.wholesale1kg}</span>
      <span />
    </div>
  );
}

export default function BeanRow({ bean, media, t, onOpen, onQuickAdd, onAddSh400, admin, onEdit }) {
  const soldOut = bean.stock.soldOut;
  const price = bean.wholesale;
  const origin = bean.isBlend ? 'Original Blend' : bean.country;
  const place = bean.isBlend ? bean.components.map((c) => c.origin).join(' / ') : bean.region;

  return (
    <div
      className={`group relative rounded-2xl bg-white px-4 py-3 ring-1 ring-cream-line/70 transition hover:ring-ink/40 ${ROW_GRID} ${soldOut ? 'opacity-60' : ''} ${media?.hidden ? 'outline-dashed outline-2 outline-rust' : ''}`}
    >
      <div className="flex gap-3 lg:contents">
        <button type="button" onClick={onOpen} className="shrink-0" aria-label={bean.title}>
          <BeanVisual bean={bean} media={media} plain className="h-[52px] w-[52px]" rounded="rounded-xl" />
        </button>

        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <RankBadge rank={bean.rank} />
            <LabelBadges bean={bean} media={media} t={t} soldOut={soldOut} />
          </div>
          <div className="mt-1 line-clamp-2 font-serif text-lg font-semibold leading-tight text-ink group-hover:text-sea-deep">{bean.title}</div>
          <div className="truncate text-xs text-ink-mute lg:hidden">
            {[origin, bean.process, bean.roast].filter(Boolean).join(' · ')}
          </div>
          {bean.subtitle && <div className="hidden truncate text-[11px] text-ink-mute lg:block">{bean.subtitle}</div>}
        </button>
      </div>

      <div className="hidden min-w-0 text-sm lg:block">
        <div className="truncate text-ink">{origin}</div>
        <div className="truncate text-xs text-ink-mute" title={place}>{place}</div>
      </div>

      <div className="hidden min-w-0 text-sm lg:block">
        <div className="truncate text-ink" title={bean.process}>{bean.process}</div>
        <div className="truncate text-xs text-ink-mute">{bean.roast}</div>
      </div>

      <div className="mt-2 flex max-h-[22px] min-w-0 flex-wrap gap-1 overflow-hidden lg:mt-0 lg:max-h-[44px]">
        {bean.flavorNotes.slice(0, 5).map((f) => (
          <span key={f} className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-ink-soft">{f}</span>
        ))}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 lg:contents">
        <div className={`text-xs lg:text-right lg:text-sm ${soldOut ? 'text-rust' : 'text-ink-soft'}`}>
          <span className="lg:hidden">{t.stock} </span>{soldOut ? t.soldOut : bean.stock.text || '—'}
        </div>
        <div className="ml-auto text-right lg:ml-0">
          <div className="font-serif text-xl font-semibold leading-none text-ink">{yen(price)}</div>
          <div className="mt-0.5 text-[10px] text-ink-mute">{`/kg ${t.exTax}`}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={soldOut || !price}
            onClick={onQuickAdd}
            className="whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-sea-deep disabled:cursor-not-allowed disabled:bg-cream-line disabled:text-ink-mute"
          >
            {soldOut ? t.soldOut : `+ ${t.addShort}`}
          </button>
          {admin && (
            <button type="button" onClick={onEdit} className="text-[11px] text-rust underline">編集</button>
          )}
        </div>
      </div>

      {bean.sh400 && (
        <div className="mt-2 lg:col-[2/-1] lg:mt-1">
          <StrongHoldOption bean={bean} t={t} soldOut={soldOut} onAdd={onAddSh400} size="sm" />
        </div>
      )}
    </div>
  );
}
