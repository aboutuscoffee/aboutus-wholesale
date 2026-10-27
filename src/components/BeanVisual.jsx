// 写真が未登録の豆用のビジュアル（ブランドの波紋パターン＋産地名）
const TONES = ['#5a8fa8', '#6f8f7a', '#a8813f', '#8a6f8f', '#b0583f', '#4f7590'];

function toneFor(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export default function BeanVisual({ bean, media, className = '', rounded = 'rounded-2xl', plain = false }) {
  const url = media?.image_urls?.[0];
  if (url) {
    return (
      <div className={`overflow-hidden bg-cream-deep ${rounded} ${className}`}>
        <img src={url} alt={bean.title} loading="lazy" className="h-full w-full object-cover object-[center_40%]" />
      </div>
    );
  }
  const tone = bean.isBlend ? '#292524' : toneFor(bean.country);
  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{ backgroundColor: tone }}
    >
      <div
        className="absolute inset-0 opacity-40 mix-blend-luminosity"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}hero-pattern.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {!plain && <div className="absolute inset-0 flex flex-col items-start justify-end p-4 text-white">
        <span className="font-serif text-2xl leading-none tracking-wide drop-shadow-sm">
          {bean.isBlend ? 'Blend' : bean.country}
        </span>
        <span className="mt-1 text-[11px] tracking-[0.2em] opacity-80">
          {bean.isBlend ? 'ORIGINAL' : bean.countryJa}
        </span>
      </div>}
    </div>
  );
}
