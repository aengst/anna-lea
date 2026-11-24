import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from 'lucide-react';
import { apiDelete, apiPut, apiUpload } from '../lib/api.js';

export default function MediaManager({ entityType, entityId, media = [], onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('entity_type', entityType);
      formData.append('entity_id', String(entityId));
      files.forEach((file) => formData.append('files', file));

      const data = await apiUpload('/api/admin/media/upload', formData);
      onChange([...media, ...(data.media || [])]);
    } catch (err) {
      setError(err.message || 'Kunde inte ladda upp bilder.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSetPrimary(img) {
    setError('');
    try {
      await apiPut(`/api/admin/media/${img.id}`, { is_primary: true });
      const updated = media.map((m) => ({ ...m, is_primary: m.id === img.id }));
      onChange(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMove(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    try {
      await apiPut('/api/admin/media/reorder', { ids: next.map((m) => m.id) });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCaptionBlur(img, caption) {
    if (caption === (img.caption || '')) return;
    try {
      const res = await apiPut(`/api/admin/media/${img.id}`, { caption });
      onChange(media.map((m) => (m.id === img.id ? res.media : m)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(img) {
    if (!window.confirm('Ta bort denna bild?')) return;
    setError('');
    try {
      await apiDelete(`/api/admin/media/${img.id}`);
      const remaining = media.filter((m) => m.id !== img.id);
      if (img.is_primary && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_primary: true };
      }
      onChange(remaining);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs uppercase tracking-[0.18em] text-stone-700">Bilder</h4>
          <p className="text-xs text-stone-500">
            Optimeras automatiskt till snabb WebP. Du kan välja flera bilder eller fota direkt med mobilen.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-[0.16em] cursor-pointer hover:bg-stone-800 transition-colors">
          <ImagePlus className="w-4 h-4" />
          <span>{uploading ? 'Laddar upp...' : 'Lägg till bilder'}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={handleFilesSelected}
            className="hidden"
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2">{error}</p>}

      {media.length === 0 ? (
        <div className="border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs text-stone-500">
          Inga bilder uppladdade ännu.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {media.map((img, idx) => (
            <div
              key={img.id}
              className={`border bg-white p-2.5 space-y-2.5 ${
                img.is_primary ? 'border-stone-900' : 'border-stone-200'
              }`}
            >
              <div className="aspect-[4/3] bg-stone-100 overflow-hidden relative">
                <img
                  src={img.url_thumb || img.url_large}
                  alt={img.alt_text || ''}
                  className="w-full h-full object-cover"
                />
                {img.is_primary && (
                  <span className="absolute top-2 left-2 bg-stone-900 text-white text-[10px] uppercase tracking-widest px-2 py-0.5">
                    Omslag
                  </span>
                )}
              </div>

              <input
                type="text"
                defaultValue={img.caption || ''}
                onBlur={(e) => handleCaptionBlur(img, e.target.value)}
                placeholder="Valfri bildtext..."
                className="w-full border border-stone-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-stone-600"
              />

              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    title="Flytta bakåt"
                    className="p-1.5 border border-stone-200 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === media.length - 1}
                    title="Flytta framåt"
                    className="p-1.5 border border-stone-200 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {!img.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img)}
                      title="Gör till omslagsbild"
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] border border-stone-200 hover:bg-stone-100"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Omslag</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  title="Ta bort bild"
                  className="p-1.5 text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
