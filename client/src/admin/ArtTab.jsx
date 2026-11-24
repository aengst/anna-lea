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
  entry_type: 'artwork',
  parent_project_id: '',
  description: '',
  year: '',
  technique: '',
  dimensions: '',
  location: '',
  price_label: '',
  status: 'none',
  allow_inquiry: true,
  is_published: true,
};

export default function ArtTab({ onStatsChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet('/api/admin/art');
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

  const projects = items.filter((i) => i.entry_type === 'project');

  function openNew(type = 'artwork') {
    setForm({ ...EMPTY_FORM, entry_type: type });
    setEditing('new');
    setError('');
  }

  function openEdit(item) {
    setForm({
      title: item.title || '',
      slug: item.slug || '',
      entry_type: item.entry_type || 'artwork',
      parent_project_id: item.parent_project_id ? String(item.parent_project_id) : '',
      description: item.description || '',
      year: item.year || '',
      technique: item.technique || '',
      dimensions: item.dimensions || '',
      location: item.location || '',
      price_label: item.price_label || '',
      status: item.status || 'none',
      allow_inquiry: item.allow_inquiry !== false,
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
        parent_project_id: form.parent_project_id ? Number(form.parent_project_id) : null,
      };
      if (editing === 'new') {
        const res = await apiPost('/api/admin/art', payload);
        setItems((prev) => [...prev, res.item]);
        setEditing(res.item);
        onStatsChange?.();
      } else {
        const res = await apiPut(`/api/admin/art/${editing.id}`, payload);
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
      const res = await apiPut(`/api/admin/art/${item.id}`, {
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
      await apiDelete(`/api/admin/art/${item.id}`);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      if (editing?.id === item.id) setEditing(null);
      onStatsChange?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReorder(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await apiPut('/api/admin/art/reorder', { ids: next.map((i) => i.id) });
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

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl uppercase tracking-[0.16em]">
            {editing === 'new' ? 'Nytt konstverk / projekt' : `Redigera: ${editing.title}`}
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
                Typ
              </label>
              <select
                value={form.entry_type}
                onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
                className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="artwork">Enskilt konstverk</option>
                <option value="project">Projekt / Utställning / Serie</option>
              </select>
            </div>
          </div>

          {form.entry_type === 'artwork' && projects.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Tillhör projekt / serie (valfritt)
              </label>
              <select
                value={form.parent_project_id}
                onChange={(e) => setForm({ ...form, parent_project_id: e.target.value })}
                className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Fristående verk (visas direkt i galleriet)</option>
                {projects
                  .filter((p) => p.id !== editing?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <p className="text-xs text-stone-500">
            Alla fält nedan är valfria — fält du lämnar tomma döljs automatiskt på den publika sidan.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">År</label>
              <input
                type="text"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="t.ex. 2026"
                className="w-full border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Teknik / Material
              </label>
              <input
                type="text"
                value={form.technique}
                onChange={(e) => setForm({ ...form, technique: e.target.value })}
                placeholder="t.ex. Olja på duk, skulptur..."
                className="w-full border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Mått / Storlek
              </label>
              <input
                type="text"
                value={form.dimensions}
                onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                placeholder="t.ex. 80 × 100 cm"
                className="w-full border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Plats / Utställning
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="t.ex. Stockholm"
                className="w-full border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Pris (valfritt)
              </label>
              <input
                type="text"
                value={form.price_label}
                onChange={(e) => setForm({ ...form, price_label: e.target.value })}
                placeholder="t.ex. 12 000 kr"
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
                <option value="none">Visa ingen status</option>
                <option value="available">Tillgänglig</option>
                <option value="sold">Såld</option>
                <option value="exhibited">Utställd</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Beskrivning / text
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Berätta om verket eller projektet..."
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Synlig på hemsidan</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.allow_inquiry}
                onChange={(e) => setForm({ ...form, allow_inquiry: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Visa intresseförfrågan-formulär</span>
            </label>
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
              entityType="art"
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl uppercase tracking-[0.16em]">Konst</h2>
          <p className="text-xs text-stone-500 mt-1">
            Lägg upp både enskilda konstverk och hela projekt/utställningar med flera bilder.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openNew('artwork')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-[0.16em] hover:bg-stone-800"
          >
            <Plus className="w-4 h-4" />
            <span>Nytt konstverk</span>
          </button>
          <button
            type="button"
            onClick={() => openNew('project')}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-900 text-stone-900 text-xs uppercase tracking-[0.16em] hover:bg-stone-100"
          >
            <Plus className="w-4 h-4" />
            <span>Nytt projekt</span>
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-stone-500 py-8">Laddar konst...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-stone-200 p-10 text-center text-sm text-stone-500 space-y-2">
          <p>Inga konstverk eller projekt inlagda ännu.</p>
          <p className="text-xs">Klicka på &ldquo;Nytt konstverk&rdquo; eller &ldquo;Nytt projekt&rdquo; ovan för att komma igång.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-200 bg-white border border-stone-200">
          {items.map((item, idx) => {
            const cover = item.media?.[0];
            return (
              <div key={item.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
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
                      <span className="ml-2 text-[10px] uppercase tracking-wider bg-stone-100 text-stone-600 px-1.5 py-0.5">
                        {item.entry_type === 'project' ? 'Projekt' : 'Verk'}
                      </span>
                      {!item.is_published && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wider bg-stone-200 text-stone-600 px-1.5 py-0.5">
                          Dold
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500 truncate">
                      {[item.year, item.technique, `${item.media?.length || 0} bilder`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReorder(idx, -1)}
                    disabled={idx === 0}
                    className="p-2 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="p-2 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(item)}
                    className="p-2 hover:bg-stone-100 text-stone-600"
                  >
                    {item.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="p-2 hover:bg-stone-100 text-stone-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
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
}
