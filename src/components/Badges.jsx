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
  directTrade: 'bg-[#e3edf1] text-sea-deep',
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

export function LabelBadges({ bean, media, t, soldOut }) {
  return (
    <>
      {soldOut && (
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white">{t.soldOut}</span>
      )}
      {bean.labels.map((id) => (
        <span key={id} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${LABEL_STYLE[id]}`}>
          {t.labels[id]}
        </span>
      ))}
      {media?.sample_available && (
        <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-ink ring-1 ring-cream-line">{t.sample}</span>
      )}
    </>
  );
}

export const RANK_ORDER = ['Compe Lot', 'Top of Top', 'Top Specialty', 'Infused Coffee', 'Specialty', 'Low Specialty', 'De Cafe'];
