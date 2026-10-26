const RANK_STYLE = {
  'Compe Lot': 'bg-ink text-gold border-ink',
  'Top of Top': 'bg-gold text-white border-gold',
  'Top Specialty': 'bg-sea text-white border-sea',
  'Infused Coffee': 'bg-white text-rust border-rust',
  Specialty: 'bg-white text-sea-deep border-sea',
  'Low Specialty': 'bg-white text-ink-soft border-cream-line',
  'De Cafe': 'bg-white text-ink-soft border-cream-line',
};

// 写真の上にも載るので背景は不透明にする
const LABEL_STYLE = {
  champion: 'bg-[#f6eedf] text-gold',
  lastChance: 'bg-rust text-white',
  yearRound: 'bg-cream text-ink-soft',
  newArrival: 'bg-[#e8f0e3] text-[#4c6b44]',
  newCrop: 'bg-[#e8f0e3] text-[#4c6b44]',
};

export function RankBadge({ rank }) {
  if (!rank) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${RANK_STYLE[rank] ?? 'bg-white text-ink-soft border-cream-line'}`}>
      {rank}
    </span>
  );
}

// 生産者と直接取引しているロット。他のラベルより目立たせる
function DirectTradeBadge({ t }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sea-deep px-3 py-1 text-[12px] font-bold uppercase leading-none tracking-wider text-white shadow-md ring-2 ring-white/60">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 12h8" />
        <path d="M13 7l5 5-5 5" />
        <path d="M11 7L6 12l5 5" />
      </svg>
      {t.labels.directTrade}
    </span>
  );
}

export function InfoCardBadge({ t }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink ring-1 ring-ink/30">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 10h6M7 14h10" />
      </svg>
      {t.infoCard}
    </span>
  );
}

export function LabelBadges({ bean, media, t, soldOut }) {
  return (
    <>
      {soldOut && (
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white">{t.soldOut}</span>
      )}
      {bean.labels.includes('directTrade') && <DirectTradeBadge t={t} />}
      {bean.labels.filter((id) => id !== 'directTrade').map((id) => (
        <span key={id} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${LABEL_STYLE[id]}`}>
          {t.labels[id]}
        </span>
      ))}
      {bean.infoCard && <InfoCardBadge t={t} />}
      {media?.sample_available && (
        <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-ink ring-1 ring-cream-line">{t.sample}</span>
      )}
    </>
  );
}

export const RANK_ORDER = ['Compe Lot', 'Top of Top', 'Top Specialty', 'Infused Coffee', 'Specialty', 'Low Specialty', 'De Cafe'];
