import { useState } from 'react';
import { deleteBean, saveBean, uploadImage } from '../lib/db';
import { RANK_ORDER } from './Badges';
import { makeT } from '../i18n';

const MAX_IMAGES = 4;
const LABEL_IDS = ['champion', 'lastChance', 'directTrade', 'yearRound', 'newArrival', 'newCrop'];
const labelName = makeT('ja').labels;

const EMPTY = {
  country: '', country_ja: '', is_blend: false, rank: '', labels: [], name: '', subtitle: '',
  process: '', producer: '', region: '', altitude: '', variety: '', components: [], crop: '',
  roast: '', flavor: '', story: '', stock: '', sold_out: false, info_card: false,
  price_1kg: null, price_sh400: null, image_urls: [], catch_ja: '', catch_en: '',
  description_ja: '', description_en: '', sample_available: false, featured: false, hidden: false,
};

const slug = (s) => s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Field({ label, children, wide }) {
  return (
    <label className={`block text-xs text-ink-soft ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export default function AdminEditor({ row, rows, onClose, onSaved, onDeleted }) {
  const isNew = !row;
  const [draft, setDraft] = useState(() => ({
    ...EMPTY,
    sort_order: (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10,
    ...row,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const text = (k) => ({ value: draft[k] ?? '', onChange: (e) => set(k, e.target.value) });
  const price = (k) => ({
    value: draft[k] ?? '',
    onChange: (e) => set(k, e.target.value === '' ? null : Number(e.target.value.replace(/[^\d]/g, ''))),
  });

  // 既存の産地から選べるようにする
  const countries = [...new Map(rows.map((r) => [r.country, r.country_ja])).entries()];

  const onFiles = async (files) => {
    setBusy(true);
    setError('');
    try {
      const id = draft.id || slug(draft.name) || 'bean';
      const urls = [];
      for (const f of [...files].slice(0, MAX_IMAGES - draft.image_urls.length)) urls.push(await uploadImage(id, f));
      set('image_urls', [...draft.image_urls, ...urls]);
    } catch (e) {
      setError(`アップロード失敗: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const move = (i, dir) => {
    const arr = [...draft.image_urls];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set('image_urls', arr);
  };

  const save = async () => {
    if (!draft.name.trim()) return setError('商品名を入力してください');
    setBusy(true);
    setError('');
    try {
      let id = draft.id;
      if (!id) {
        const base = slug(draft.name) || `bean-${Date.now()}`;
        id = base;
        for (let n = 2; rows.some((r) => r.id === id); n++) id = `${base}-${n}`;
      }
      onSaved(await saveBean({ ...draft, id }));
      onClose();
    } catch (e) {
      setError(`保存失敗: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteBean(draft.id);
      onDeleted(draft.id);
      onClose();
    } catch (e) {
      setError(`削除失敗: ${e.message}`);
      setBusy(false);
    }
  };

  const input = 'w-full rounded-xl border border-cream-line bg-white px-3 py-2 text-sm text-ink';
  const check = (k, label) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={Boolean(draft[k])} onChange={(e) => set(k, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-cream p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-rust">管理者編集</div>
            <h2 className="font-serif text-2xl font-semibold">{isNew ? '新しい豆を追加' : draft.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl">×</button>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-medium">基本情報</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="商品名 *" wide><input className={input} {...text('name')} /></Field>
          <Field label="サブタイトル（受賞歴など）" wide><input className={input} {...text('subtitle')} /></Field>
          <Field label="産地（英語）">
            <input className={input} list="ws-countries" {...text('country')} onChange={(e) => {
              const ja = countries.find(([en]) => en === e.target.value)?.[1];
              setDraft((d) => ({ ...d, country: e.target.value, country_ja: ja ?? d.country_ja }));
            }} />
            <datalist id="ws-countries">{countries.map(([en]) => <option key={en} value={en} />)}</datalist>
          </Field>
          <Field label="産地（日本語）"><input className={input} {...text('country_ja')} /></Field>
          <Field label="ランク">
            <select className={input} {...text('rank')}>
              <option value="">（なし）</option>
              {RANK_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="表示順（小さいほど上）"><input type="number" className={input} value={draft.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 0)} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {LABEL_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.labels.includes(id)}
                onChange={(e) => set('labels', e.target.checked ? [...draft.labels, id] : draft.labels.filter((l) => l !== id))}
              />
              {labelName[id]}
            </label>
          ))}
          {check('is_blend', 'オリジナルブレンド')}
        </div>

        <h3 className="mb-2 mt-6 text-sm font-medium">価格・在庫</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="1kg 卸価格（税抜・円）"><input inputMode="numeric" className={input} {...price('price_1kg')} /></Field>
          <Field label="Strong Hold 400g（税抜・円）"><input inputMode="numeric" className={input} {...price('price_sh400')} placeholder="トップロットのみ" /></Field>
          <Field label="在庫（月初時点）"><input className={input} {...text('stock')} placeholder="例: 30kg" /></Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-5">
          {check('sold_out', 'SOLD OUT')}
          {check('info_card', 'インフォカードあり')}
          {check('sample_available', 'サンプルあり')}
        </div>

        <h3 className="mb-2 mt-6 text-sm font-medium">豆の情報</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="精製方法"><input className={input} {...text('process')} /></Field>
          <Field label="焙煎度"><input className={input} {...text('roast')} /></Field>
          <Field label="生産者"><input className={input} {...text('producer')} /></Field>
          <Field label="地域"><input className={input} {...text('region')} /></Field>
          <Field label="標高"><input className={input} {...text('altitude')} /></Field>
          <Field label="品種"><input className={input} {...text('variety')} /></Field>
          <Field label="クロップ"><input className={input} {...text('crop')} /></Field>
          <Field label="フレーバー（カンマ区切り）" wide><input className={input} {...text('flavor')} /></Field>
          {draft.is_blend && (
            <Field label="ブレンド構成（1行に「産地, 精製方法」）" wide>
              <textarea
                rows={4}
                className={input}
                value={draft.components.map((c) => [c.origin, c.process].filter(Boolean).join(', ')).join('\n')}
                onChange={(e) => set('components', e.target.value.split('\n').map((l) => {
                  const [origin, ...rest] = l.split(',');
                  return { origin: origin.trim(), process: rest.join(',').trim() };
                }).filter((c) => c.origin))}
              />
            </Field>
          )}
        </div>

        <h3 className="mb-2 mt-6 text-sm font-medium">写真（最大{MAX_IMAGES}枚・1枚目がカードに表示）</h3>
        <div className="flex flex-wrap gap-3">
          {draft.image_urls.map((u, i) => (
            <div key={u} className="relative h-28 w-28 overflow-hidden rounded-xl bg-cream-deep">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/60 px-1 text-xs text-white">
                <button type="button" onClick={() => move(i, -1)} className="px-1">←</button>
                <button type="button" onClick={() => set('image_urls', draft.image_urls.filter((x) => x !== u))} className="px-1">削除</button>
                <button type="button" onClick={() => move(i, 1)} className="px-1">→</button>
              </div>
            </div>
          ))}
          {draft.image_urls.length < MAX_IMAGES && (
            <label className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-cream-line text-sm text-ink-mute hover:border-ink">
              {busy ? '…' : '+ 追加'}
              <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
            </label>
          )}
        </div>

        <h3 className="mb-2 mt-6 text-sm font-medium">紹介文</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ひとこと紹介（日本語）"><input className={input} {...text('catch_ja')} /></Field>
          <Field label="Catch copy (English)"><input className={input} {...text('catch_en')} /></Field>
          <Field label="詳しい説明（日本語）"><textarea rows={5} className={input} {...text('description_ja')} /></Field>
          <Field label="Description (English)"><textarea rows={5} className={input} {...text('description_en')} /></Field>
          {draft.is_blend && <Field label="ブレンドの紹介（シートの説明文）" wide><textarea rows={3} className={input} {...text('story')} /></Field>}
        </div>

        <div className="mt-5 flex flex-wrap gap-5">
          {check('featured', 'Pick Up に表示')}
          {check('hidden', 'カタログで非表示')}
        </div>

        {error && <p className="mt-4 text-sm text-rust">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {!isNew ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-rust">本当に削除しますか？</span>
                <button type="button" onClick={remove} disabled={busy} className="rounded-full bg-rust px-4 py-2 text-white">削除する</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 text-ink-mute">やめる</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-rust underline">この豆を削除</button>
            )
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm ring-1 ring-cream-line">キャンセル</button>
            <button type="button" onClick={save} disabled={busy} className="rounded-full bg-ink px-6 py-2.5 text-sm text-white disabled:opacity-50">保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
