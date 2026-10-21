import { useState } from 'react';
import { saveMedia, uploadImage } from '../lib/db';

const MAX_IMAGES = 4;

export default function AdminEditor({ bean, media, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    key: bean.key,
    name: bean.name,
    image_urls: media?.image_urls ?? [],
    catch_ja: media?.catch_ja ?? '',
    catch_en: media?.catch_en ?? '',
    description_ja: media?.description_ja ?? '',
    description_en: media?.description_en ?? '',
    sample_available: media?.sample_available ?? false,
    featured: media?.featured ?? false,
    hidden: media?.hidden ?? false,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const onFiles = async (files) => {
    setBusy(true);
    setError('');
    try {
      const room = MAX_IMAGES - draft.image_urls.length;
      const urls = [];
      for (const f of [...files].slice(0, room)) urls.push(await uploadImage(bean.key, f));
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
    setBusy(true);
    setError('');
    try {
      onSaved(await saveMedia(draft));
      onClose();
    } catch (e) {
      setError(`保存失敗: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-xl border border-cream-line bg-white px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-cream p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-rust">管理者編集</div>
            <h2 className="font-serif text-2xl font-semibold">{bean.title}</h2>
            <p className="text-xs text-ink-mute">価格・在庫・産地情報はスプレッドシートを編集してください</p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl">×</button>
        </div>

        <section className="mt-5">
          <div className="mb-2 text-sm font-medium">写真（最大{MAX_IMAGES}枚・1枚目がカードに表示）</div>
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
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">ひとこと紹介（日本語）
            <input className={input} value={draft.catch_ja} onChange={(e) => set('catch_ja', e.target.value)} />
          </label>
          <label className="text-sm">Catch copy (English)
            <input className={input} value={draft.catch_en} onChange={(e) => set('catch_en', e.target.value)} />
          </label>
          <label className="text-sm">詳しい説明（日本語）
            <textarea rows={5} className={input} value={draft.description_ja} onChange={(e) => set('description_ja', e.target.value)} />
          </label>
          <label className="text-sm">Description (English)
            <textarea rows={5} className={input} value={draft.description_en} onChange={(e) => set('description_en', e.target.value)} />
          </label>
        </section>

        <section className="mt-4 flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.featured} onChange={(e) => set('featured', e.target.checked)} />Pick Up に表示</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.sample_available} onChange={(e) => set('sample_available', e.target.checked)} />サンプルあり</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.hidden} onChange={(e) => set('hidden', e.target.checked)} />カタログで非表示</label>
        </section>

        {error && <p className="mt-4 text-sm text-rust">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm ring-1 ring-cream-line">キャンセル</button>
          <button type="button" onClick={save} disabled={busy} className="rounded-full bg-ink px-6 py-2.5 text-sm text-white disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}
