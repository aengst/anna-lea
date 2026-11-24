import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiUpload } from '../lib/api.js';
import { applyThemeToDocument, FALLBACK_SETTINGS, useSite } from '../context/SiteContext.jsx';

const FONT_OPTIONS = [
  { value: 'jost', label: 'Jost (stilren, geometrisk – standard)' },
  { value: 'raleway', label: 'Raleway (luftig och lätt)' },
  { value: 'cormorant', label: 'Cormorant Garamond (konstnärlig serif)' },
  { value: 'georgia', label: 'Georgia (klassisk serif)' },
];

export default function AppearanceTab() {
  const { refreshSite } = useSite();
  const [theme, setTheme] = useState(FALLBACK_SETTINGS.theme);
  const [layout, setLayout] = useState(FALLBACK_SETTINGS.layout);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/api/admin/settings')
      .then((data) => {
        if (data.settings?.theme) setTheme({ ...FALLBACK_SETTINGS.theme, ...data.settings.theme });
        if (data.settings?.layout) setLayout({ ...FALLBACK_SETTINGS.layout, ...data.settings.layout });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveAll(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await Promise.all([
        apiPut('/api/admin/settings/theme', theme),
        apiPut('/api/admin/settings/layout', layout),
      ]);
      applyThemeToDocument(theme);
      await refreshSite();
      setNotice('Utseende och layout sparades och gäller nu direkt på hemsidan!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm('Återställa färger, typsnitt och sidindelning till standardutseendet?')) return;
    setError('');
    setNotice('');
    try {
      const res = await apiPost('/api/admin/settings/reset', { keys: ['theme', 'layout'] });
      const nextTheme = { ...res.defaults.theme, heroImageUrl: theme.heroImageUrl };
      setTheme(nextTheme);
      setLayout(res.defaults.layout);
      await apiPut('/api/admin/settings/theme', nextTheme);
      applyThemeToDocument(nextTheme);
      await refreshSite();
      setNotice('Standardutseendet är återställt.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBgUpload(fieldKey, file) {
    if (!file) return;
    setUploadingKey(fieldKey);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiUpload('/api/admin/media/site-upload', formData);
      setTheme((prev) => ({ ...prev, [fieldKey]: data.urlLarge }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingKey('');
    }
  }

  function moveSection(index, direction) {
    const sections = [...(layout.homeSections || [])];
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setLayout({ ...layout, homeSections: sections });
  }

  function toggleSection(index) {
    const sections = [...(layout.homeSections || [])];
    sections[index] = { ...sections[index], visible: !sections[index].visible };
    setLayout({ ...layout, homeSections: sections });
  }

  if (loading) return <p className="text-sm text-stone-500 py-8">Laddar inställningar...</p>;

  return (
    <form onSubmit={handleSaveAll} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl uppercase tracking-[0.16em]">Utseende &amp; Layout</h2>
          <p className="text-xs text-stone-500 mt-1">
            Ändra bakgrunder, färger, typsnitt och sidindelning helt utan programmering.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 text-xs uppercase tracking-wider text-stone-700 hover:bg-stone-100"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Återställ standard</span>
        </button>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}
      {notice && (
        <p className="text-sm text-emerald-800 bg-emerald-50 px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4" /> {notice}
        </p>
      )}

      {/* 1. Startsidans upplägg & sidindelning */}
      <section className="bg-white border border-stone-200 p-5 sm:p-7 space-y-5">
        <h3 className="text-sm uppercase tracking-[0.18em] text-stone-800">
          1. Startsida &amp; Sidindelning
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Vad ska visas på startsidan (/)?
            </label>
            <select
              value={layout.homeMode}
              onChange={(e) => setLayout({ ...layout, homeMode: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              <option value="split">Gemensam startsida (ingång till Smycken &amp; Konst)</option>
              <option value="jewelry">Öppna Smycken direkt på startsidan</option>
              <option value="art">Öppna Konst direkt på startsidan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Antal kolumner i gallerier (dator)
            </label>
            <select
              value={layout.galleryColumnsDesktop}
              onChange={(e) => setLayout({ ...layout, galleryColumnsDesktop: Number(e.target.value) })}
              className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              <option value={2}>2 kolumner (stora bilder)</option>
              <option value={3}>3 kolumner (standard)</option>
              <option value={4}>4 kolumner (kompakt översikt)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={layout.showJewelryLink !== false}
              onChange={(e) => setLayout({ ...layout, showJewelryLink: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Visa Smycken i menyn</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={layout.showArtLink !== false}
              onChange={(e) => setLayout({ ...layout, showArtLink: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Visa Konst i menyn</span>
          </label>
        </div>

        {/* Sektioner på gemensam startsida */}
        {layout.homeMode === 'split' && (
          <div className="space-y-4 pt-3 border-t border-stone-100">
            <p className="text-xs uppercase tracking-wider text-stone-600">
              Sektioner på startsidan (ändra ordning eller dölj)
            </p>
            <div className="divide-y divide-stone-200 border border-stone-200">
              {(layout.homeSections || []).map((sec, idx) => (
                <div key={sec.id} className="p-3 flex items-center justify-between gap-3 bg-stone-50/50">
                  <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sec.visible !== false}
                      onChange={() => toggleSection(idx)}
                      className="w-4 h-4"
                    />
                    <span>{sec.label || sec.id}</span>
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 1)}
                      disabled={idx === layout.homeSections.length - 1}
                      className="p-1.5 border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  Startsidans huvudrubrik
                </label>
                <input
                  type="text"
                  value={layout.homeTitle || ''}
                  onChange={(e) => setLayout({ ...layout, homeTitle: e.target.value })}
                  className="w-full border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  Underrubrik i hero
                </label>
                <input
                  type="text"
                  value={layout.homeSubtitle || ''}
                  onChange={(e) => setLayout({ ...layout, homeSubtitle: e.target.value })}
                  className="w-full border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  Kort presentation av Anna-Lea
                </label>
                <textarea
                  rows={3}
                  value={layout.homeIntro || ''}
                  onChange={(e) => setLayout({ ...layout, homeIntro: e.target.value })}
                  className="w-full border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  Smycken-kort (rubrik &amp; underrubrik)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={layout.jewelryCardTitle || ''}
                    onChange={(e) => setLayout({ ...layout, jewelryCardTitle: e.target.value })}
                    className="w-full border border-stone-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={layout.jewelryCardSubtitle || ''}
                    onChange={(e) => setLayout({ ...layout, jewelryCardSubtitle: e.target.value })}
                    className="w-full border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  Konst-kort (rubrik &amp; underrubrik)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={layout.artCardTitle || ''}
                    onChange={(e) => setLayout({ ...layout, artCardTitle: e.target.value })}
                    className="w-full border border-stone-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={layout.artCardSubtitle || ''}
                    onChange={(e) => setLayout({ ...layout, artCardSubtitle: e.target.value })}
                    className="w-full border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Bakgrundsbilder */}
      <section className="bg-white border border-stone-200 p-5 sm:p-7 space-y-5">
        <h3 className="text-sm uppercase tracking-[0.18em] text-stone-800">2. Bakgrundsbilder</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { key: 'heroImageUrl', label: 'Startsida (Hero-bakgrund)' },
            { key: 'jewelryBgUrl', label: 'Smycken (sidhuvud, valfri)' },
            { key: 'artBgUrl', label: 'Konst (sidhuvud, valfri)' },
          ].map(({ key, label }) => (
            <div key={key} className="border border-stone-200 p-3 space-y-3">
              <p className="text-xs uppercase tracking-wider text-stone-600">{label}</p>
              <div className="aspect-[16/10] bg-stone-100 overflow-hidden flex items-center justify-center">
                {theme[key] ? (
                  <img src={theme[key]} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-stone-400">Ingen bild vald</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs cursor-pointer hover:bg-stone-800">
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{uploadingKey === key ? 'Laddar...' : 'Byt bild'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={Boolean(uploadingKey)}
                    onChange={(e) => handleBgUpload(key, e.target.files?.[0])}
                  />
                </label>
                {theme[key] && (
                  <button
                    type="button"
                    onClick={() => setTheme((prev) => ({ ...prev, [key]: '' }))}
                    className="p-1.5 text-red-700 hover:bg-red-50"
                    title="Ta bort bakgrundsbild"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
            Mörkläggning över startsidans bakgrundsbild ({Math.round((theme.heroOverlayOpacity ?? 0.25) * 100)}%)
          </label>
          <input
            type="range"
            min={0}
            max={0.7}
            step={0.05}
            value={theme.heroOverlayOpacity ?? 0.25}
            onChange={(e) => setTheme({ ...theme, heroOverlayOpacity: Number(e.target.value) })}
            className="w-full max-w-sm"
          />
          <p className="text-xs text-stone-400">Öka om ljus bakgrundsbild gör texten svårläst.</p>
        </div>
      </section>

      {/* 3. Färger & typsnitt */}
      <section className="bg-white border border-stone-200 p-5 sm:p-7 space-y-5">
        <h3 className="text-sm uppercase tracking-[0.18em] text-stone-800">
          3. Färger &amp; Typsnitt
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { key: 'bgPrimary', label: 'Bakgrund' },
            { key: 'bgSecondary', label: 'Ytor / Sidfot' },
            { key: 'textPrimary', label: 'Huvudtext' },
            { key: 'textMuted', label: 'Sekundär text' },
            { key: 'accent', label: 'Accentfärg' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-stone-600">{label}</label>
              <div className="flex items-center gap-2 border border-stone-300 px-2 py-1.5">
                <input
                  type="color"
                  value={theme[key] || '#ffffff'}
                  onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                  className="w-7 h-7 border-0 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-stone-600">{theme[key]}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Typsnitt för rubriker
            </label>
            <select
              value={theme.fontHeading || 'jost'}
              onChange={(e) => setTheme({ ...theme, fontHeading: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Typsnitt för brödtext
            </label>
            <select
              value={theme.fontBody || 'jost'}
              onChange={(e) => setTheme({ ...theme, fontBody: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-7 py-3 bg-stone-900 text-white text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? 'Sparar ändringar...' : 'Spara utseende & layout'}
        </button>
      </div>
    </form>
  );
}
