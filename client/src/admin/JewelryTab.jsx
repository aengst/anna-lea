import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api.js';
import MediaManager from './MediaManager.jsx';

const EMPTY_FORM = {
  title: '',
  slug: '',
  category: 'smycken',
  price_label: '',
  variants: [],
  description: '',
  story: '',
  status: 'available',
  is_published: true,
};

export default function JewelryTab({ onStatsChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | item object
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet('/api/admin/jewelry');
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing('new');
    setError('');
  }

  function openEdit(item) {
    setForm({
      title: item.title || '',
      slug: item.slug || '',
      category: item.category || 'smycken',
      price_label: item.price_label || '',
      variants: Array.isArray(item.variants) ? item.variants : [],
      description: item.description || '',
      story: item.story || '',
      status: item.status || 'available',
      is_published: item.is_published !== false,
    });
    setEditing(item);
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        variants: form.variants.filter((v) => v.label.trim() || v.price.trim()),
      };
      if (editing === 'new') {
        const res = await apiPost('/api/admin/jewelry', payload);
        setItems((prev) => [...prev, res.item]);
        // Öppna direkt i redigeringsläge så man kan ladda upp bilder på en gång
        setEditing(res.item);
        onStatsChange?.();
      } else {
        const res = await apiPut(`/api/admin/jewelry/${editing.id}`, payload);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? res.item : it)));
        setEditing(res.item);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(item) {
    try {
      const res = await apiPut(`/api/admin/jewelry/${item.id}`, {
        ...item,
        is_published: !item.is_published,
      });
      setItems((prev) => prev.map((it) => (it.id === item.id ? res.item : it)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Ta bort "${item.title}" och alla tillhörande bilder?`)) return;
    try {
      await apiDelete(`/api/admin/jewelry/${item.id}`);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      if (editing?.id === item.id) setEditing(null);
      onStatsChange?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReorder(category, index, direction) {
    const group = items.filter((i) => i.category === category);
    const target = index + direction;
    if (target < 0 || target >= group.length) return;
    const nextGroup = [...group];
    [nextGroup[index], nextGroup[target]] = [nextGroup[target], nextGroup[index]];

    const others = items.filter((i) => i.category !== category);
    const merged = category === 'smycken' ? [...nextGroup, ...others] : [...others, ...nextGroup];
    setItems(merged);
    try {
      await apiPut('/api/admin/jewelry/reorder', { ids: nextGroup.map((i) => i.id) });
    } catch (err) {
      setError(err.message);
    }
  }

  function handleMediaChange(nextMedia) {
    if (!editing || editing === 'new') return;
    const updated = { ...editing, media: nextMedia };
    setEditing(updated);
    setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)));
  }

  const renderCategoryList = (category, heading) => {
    const group = items.filter((i) => i.category === category);
    return (
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.2em] text-stone-500">
          {heading} ({group.length})
        </h3>
        {group.length === 0 ? (
          <p className="text-xs text-stone-400 bg-white border border-stone-200 p-4">
            Inga smycken i denna kategori ännu.
          </p>
        ) : (
          <div className="divide-y divide-stone-200 bg-white border border-stone-200">
            {group.map((item, idx) => {
              const cover = item.media?.[0];
              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-12 bg-stone-100 shrink-0 overflow-hidden border border-stone-200">
                      {cover ? (
                        <img
                          src={cover.url_thumb || cover.url_large}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-normal text-stone-900 truncate">
                        {item.title}
                        {!item.is_published && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider bg-stone-200 text-stone-600 px-1.5 py-0.5">
                            Dold
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500 truncate">
                        {item.price_label || 'Inget pris'} · {item.media?.length || 0} bilder
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReorder(category, idx, -1)}
                      disabled={idx === 0}
                      title="Flytta upp"
                      className="p-2 hover:bg-stone-100 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(category, idx, 1)}
                      disabled={idx === group.length - 1}
                      title="Flytta ner"
                      className="p-2 hover:bg-stone-100 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(item)}
                      title={item.is_published ? 'Dölj på sidan' : 'Publicera på sidan'}
                      className="p-2 hover:bg-stone-100 text-stone-600"
                    >
                      {item.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      title="Redigera"
                      className="p-2 hover:bg-stone-100 text-stone-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Ta bort"
                      className="p-2 hover:bg-red-50 text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl uppercase tracking-[0.16em]">
            {editing === 'new' ? 'Nytt smycke' : `Redigera: ${editing.title}`}
          </h2>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-600 hover:text-stone-900"
          >
            <X className="w-4 h-4" /> Tillbaka till listan
          </button>
        </div>

        {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}

        <form onSubmit={handleSave} className="bg-white border border-stone-200 p-5 sm:p-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Titel *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Kategori
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="smycken">Smycken (kollektion)</option>
                <option value="unika_bestallningar">Unika beställningar / Vigselringar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Pristext
              </label>
              <input
                type="text"
                value={form.price_label}
                onChange={(e) => setForm({ ...form, price_label: e.target.value })}
                placeholder="t.ex. 2 300 kr eller På förfrågan"
                className="w-full border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="available">Tillgänglig</option>
                <option value="on_request">På förfrågan</option>
                <option value="sold">Såld</option>
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Synlig på hemsidan</span>
              </label>
            </div>
          </div>

          {/* Prisvarianter */}
          <div className="space-y-2 border-t border-stone-100 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-stone-600">
                Prisvarianter (valfritt, t.ex. Små / Stora eller Armband / Ring)
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, variants: [...form.variants, { label: '', price: '' }] })
                }
                className="text-xs uppercase tracking-wider text-stone-800 hover:underline"
              >
                + Lägg till variant
              </button>
            </div>
            {form.variants.map((v, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={v.label}
                  onChange={(e) => {
                    const next = [...form.variants];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setForm({ ...form, variants: next });
                  }}
                  placeholder="Utförande (t.ex. Små)"
                  className="flex-1 border border-stone-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={v.price}
                  onChange={(e) => {
                    const next = [...form.variants];
                    next[idx] = { ...next[idx], price: e.target.value };
                    setForm({ ...form, variants: next });
                  }}
                  placeholder="Pris (t.ex. 1 600 kr)"
                  className="w-36 border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: form.variants.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-2 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Beskrivning
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Material, stenar, mått..."
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Berättelse / extra text (valfritt)
            </label>
            <textarea
              rows={3}
              value={form.story}
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              placeholder="T.ex. bakgrundshistoria eller inspiration..."
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-[0.18em] hover:bg-stone-800 disabled:opacity-50"
            >
              {saving ? 'Sparar...' : editing === 'new' ? 'Skapa & fortsätt till bilder' : 'Spara ändringar'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-5 py-2.5 border border-stone-300 text-xs uppercase tracking-[0.16em] hover:bg-stone-100"
            >
              Stäng
            </button>
          </div>
        </form>

        {editing !== 'new' && (
          <div className="bg-white border border-stone-200 p-5 sm:p-7">
            <MediaManager
              entityType="jewelry"
              entityId={editing.id}
              media={editing.media || []}
              onChange={handleMediaChange}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl uppercase tracking-[0.16em]">Smycken</h2>
          <p className="text-xs text-stone-500 mt-1">
            Lägg till, redigera, dölj eller ändra visningsordning på smycken och vigselringar.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-[0.18em] hover:bg-stone-800"
        >
          <Plus className="w-4 h-4" />
          <span>Nytt smycke</span>
        </button>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-stone-500 py-8">Laddar smycken...</p>
      ) : (
        <div className="space-y-8">
          {renderCategoryList('smycken', 'Smycken (kollektion)')}
          {renderCategoryList('unika_bestallningar', 'Unika beställningar / Vigselringar')}
        </div>
      )}
    </div>
  );
}
