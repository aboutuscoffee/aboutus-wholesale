import { yen } from '../i18n';

// トップロット限定の「Strong Hold 400g 焙煎」オプション。価格がある豆だけ表示する
// size: 'md'（詳細画面）/ 'sm'（リストの1行）/ 'stack'（カード内・2段組み）
export default function StrongHoldOption({ bean, t, soldOut, onAdd, size = 'md' }) {
  if (!bean.sh400) return null;

  const tag = <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white">{t.shOption}</span>;
  const price = (cls) => (
    <div className="shrink-0 text-right">
      <span className={`font-serif font-semibold text-ink ${cls}`}>{yen(bean.sh400)}</span>
      <span className="ml-1 text-[10px] text-ink-mute">{t.exTax}</span>
    </div>
  );
  const button = onAdd && (
    <button
      type="button"
      onClick={onAdd}
      disabled={soldOut}
      className="shrink-0 whitespace-nowrap rounded-full border border-gold px-3 py-1 text-xs font-medium text-gold transition hover:bg-gold hover:text-white disabled:cursor-not-allowed disabled:border-cream-line disabled:text-ink-mute disabled:hover:bg-transparent"
    >
      {t.addSh}
    </button>
  );
  const box = 'rounded-xl border border-gold/60 bg-[#fbf6ec]';

  if (size === 'stack') {
    return (
      <div className={`${box} px-3 py-2`}>
        <div className="flex items-center gap-2">
          {tag}
          <span className="text-xs font-medium text-ink">{t.shName}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-3">
          {price('text-base')}
          {button}
        </div>
      </div>
    );
  }

  const small = size === 'sm';
  return (
    <div className={`flex items-center gap-3 ${box} ${small ? 'px-3 py-1.5' : 'px-4 py-3'}`}>
      {tag}
      <div className="min-w-0 flex-1">
        <div className={`truncate font-medium text-ink ${small ? 'text-xs' : 'text-sm'}`}>{t.shName}</div>
        {!small && <div className="text-[11px] text-ink-mute">{t.shNote}</div>}
      </div>
      {price(small ? 'text-base' : 'text-xl')}
      {button}
    </div>
  );
}
