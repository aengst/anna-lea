import { useEffect, useState } from 'react';
import { Archive, CheckCircle2, Mail, Phone, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPut } from '../lib/api.js';

const TYPE_LABELS = {
  jewelry_order: 'Beställning (smycke)',
  custom_request: 'Unik beställning',
  art_inquiry: 'Konstförfrågan',
  contact: 'Allmän kontakt',
};

const STATUS_BADGE = {
  new: 'bg-amber-100 text-amber-900',
  handled: 'bg-emerald-100 text-emerald-900',
  archived: 'bg-stone-200 text-stone-700',
};

const STATUS_LABEL = {
  new: 'Ny',
  handled: 'Hanterad',
  archived: 'Arkiverad',
};

export default function InquiriesTab({ onStatsChange }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const data = await apiGet(`/api/admin/inquiries${qs}`);
      setItems(data.inquiries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function updateInquiry(id, patch) {
    try {
      const res = await apiPut(`/api/admin/inquiries/${id}`, patch);
      setItems((prev) => prev.map((it) => (it.id === id ? res.inquiry : it)));
      onStatsChange?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Ta bort denna förfrågan permanent?')) return;
    try {
      await apiDelete(`/api/admin/inquiries/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
      onStatsChange?.();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl uppercase tracking-[0.16em]">Förfrågningar &amp; Beställningar</h2>
          <p className="text-xs text-stone-500 mt-1">
            Alla beställningar och meddelanden från hemsidan samlas här.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Alla' },
            { id: 'new', label: 'Nya' },
            { id: 'handled', label: 'Hanterade' },
            { id: 'archived', label: 'Arkiverade' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 text-xs uppercase tracking-[0.14em] border transition-colors ${
                filter === tab.id
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-stone-500 py-8">Laddar förfrågningar...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-stone-200 p-10 text-center text-sm text-stone-500">
          Inga förfrågningar i denna vy ännu.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-stone-200 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] uppercase tracking-wider px-2.5 py-0.5 ${
                        STATUS_BADGE[item.status] || 'bg-stone-100'
                      }`}
                    >
                      {STATUS_LABEL[item.status] || item.status}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-stone-500">
                      {TYPE_LABELS[item.inquiry_type] || item.inquiry_type}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(item.created_at).toLocaleString('sv-SE', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-normal text-stone-900">
                    {item.customer_name}
                    {item.item_title && (
                      <span className="text-stone-500 font-light"> — {item.item_title}</span>
                    )}
                  </h3>
                  {item.variant_choice && (
                    <p className="text-xs text-stone-600">Utförande: {item.variant_choice}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.status !== 'handled' && (
                    <button
                      type="button"
                      onClick={() => updateInquiry(item.id, { status: 'handled' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Markera hanterad</span>
                    </button>
                  )}
                  {item.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => updateInquiry(item.id, { status: 'archived' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-300 hover:bg-stone-100"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Arkivera</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    title="Ta bort"
                    className="p-1.5 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 text-xs text-stone-600">
                <a
                  href={`mailto:${item.customer_email}?subject=${encodeURIComponent(
                    `Svar från Anna-Lea${item.item_title ? ` – ${item.item_title}` : ''}`
                  )}`}
                  className="inline-flex items-center gap-1.5 hover:text-stone-900 underline underline-offset-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {item.customer_email}
                </a>
                {item.customer_phone && (
                  <a
                    href={`tel:${item.customer_phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 hover:text-stone-900"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {item.customer_phone}
                  </a>
                )}
              </div>

              {item.message && (
                <p className="text-sm text-stone-800 bg-stone-50 border border-stone-100 p-3.5 whitespace-pre-line">
                  {item.message}
                </p>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-500 mb-1">
                  Egna anteckningar (syns bara i admin)
                </label>
                <input
                  type="text"
                  defaultValue={item.admin_notes || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (item.admin_notes || '')) {
                      updateInquiry(item.id, { admin_notes: e.target.value });
                    }
                  }}
                  placeholder="T.ex. Ringt kunden, bokat provning tisdag..."
                  className="w-full border border-stone-200 px-3 py-2 text-xs focus:outline-none focus:border-stone-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
