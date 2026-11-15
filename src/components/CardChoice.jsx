// インフォメーションカードの「必要／不要」を選ぶボタン。value: true / false / null（未選択）
export default function CardChoice({ t, value, onChange, size = 'md' }) {
  const small = size === 'sm';
  return (
    <div className={`inline-flex rounded-full p-0.5 ${value == null ? 'bg-gold/20 ring-1 ring-gold/60' : 'bg-cream-deep'}`}>
      {[[true, t.card.need], [false, t.card.noNeed]].map(([v, label]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full ${small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} transition ${value === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
