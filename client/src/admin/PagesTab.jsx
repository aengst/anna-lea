import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { apiGet, apiPut } from '../lib/api.js';
import { useSite } from '../context/SiteContext.jsx';

const KNOWN_PAGES = [
  { slug: 'min-syn-pa-smycken', defaultTitle: 'Min syn på smycken', hint: 'Visas längst ner på Smycken-sidan.' },
  { slug: 'om-konsten', defaultTitle: 'Om konsten', hint: 'Visas längst ner på Konst-sidan.' },
  { slug: 'bestallning-och-storlek', defaultTitle: 'Beställning och storlek', hint: 'Länkad från menyn och sidfoten.' },
  { slug: 'returer', defaultTitle: 'Returer', hint: 'Länkad från sidfoten.' },
  { slug: 'allmanna-villkor', defaultTitle: 'Allmänna villkor', hint: 'Länkad från sidfoten.' },
];

export default function PagesTab() {
  const { refreshSite } = useSite();
  const [pagesMap, setPagesMap] = useState({});
  const [activeSlug, setActiveSlug] = useState('min-syn-pa-smycken');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState({
    email: '',
    phone: '',
    studioTitle: 'Ateljé',
    addressLine1: '',
    addressLine2: '',
    instagramUrl: '',
    copyright: '',
  });
  const [savingPage, setSavingPage] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiGet('/api/admin/pages'), apiGet('/api/admin/settings')])
      .then(([pData, sData]) => {
        const map = {};
        for (const p of pData.pages || []) map[p.slug] = p;
        setPagesMap(map);
        const initial = map[activeSlug] || { title: KNOWN_PAGES[0].defaultTitle, content: '' };
        setTitle(initial.title);
        setContent(initial.content);
        if (sData.settings?.contact) setContact(sData.settings.contact);
      })
      .catch((err) => setError(err.message));
  }, []);

  function selectPage(slug) {
    setActiveSlug(slug);
    const meta = KNOWN_PAGES.find((p) => p.slug === slug);
    const existing = pagesMap[slug];
    setTitle(existing?.title || meta?.defaultTitle || slug);
    setContent(existing?.content || '');
    setSavedNotice('');
  }

  async function handleSavePage(e) {
    e.preventDefault();
    setSavingPage(true);
    setError('');
    setSavedNotice('');
    try {
      const res = await apiPut(`/api/admin/pages/${activeSlug}`, { title, content });
      setPagesMap((prev) => ({ ...prev, [activeSlug]: res.page }));
      await refreshSite();
      setSavedNotice('Sidan sparades!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPage(false);
    }
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    setSavingContact(true);
    setError('');
    setSavedNotice('');
    try {
      await apiPut('/api/admin/settings/contact', contact);
      await refreshSite();
      setSavedNotice('Kontaktuppgifterna sparades!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingContact(false);
    }
  }

  const activeMeta = KNOWN_PAGES.find((p) => p.slug === activeSlug);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl uppercase tracking-[0.16em]">Sidor &amp; Kontaktuppgifter</h2>
        <p className="text-xs text-stone-500 mt-1">
          Redigera fasta texter på sajten. Använd <code className="bg-stone-100 px-1">## Rubrik</code> på egen rad för underrubriker och tom rad mellan stycken.
        </p>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}
      {savedNotice && (
        <p className="text-sm text-emerald-800 bg-emerald-50 px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4" /> {savedNotice}
        </p>
      )}

      {/* Redigera texter & informationssidor */}
      <div className="bg-white border border-stone-200 p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap gap-2">
          {KNOWN_PAGES.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => selectPage(p.slug)}
              className={`px-3.5 py-2 text-xs uppercase tracking-[0.12em] border transition-colors ${
                activeSlug === p.slug
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              {p.defaultTitle}
            </button>
          ))}
        </div>

        {activeMeta?.hint && <p className="text-xs text-stone-500">{activeMeta.hint}</p>}

        <form onSubmit={handleSavePage} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Sidtitel
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Textinnehåll
            </label>
            <textarea
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-stone-300 px-3 py-2 text-sm leading-relaxed font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={savingPage}
            className="px-6 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-[0.18em] hover:bg-stone-800 disabled:opacity-50"
          >
            {savingPage ? 'Sparar...' : 'Spara sidtext'}
          </button>
        </form>
      </div>

      {/* Kontaktuppgifter & sidfot */}
      <form
        onSubmit={handleSaveContact}
        className="bg-white border border-stone-200 p-5 sm:p-7 space-y-5"
      >
        <h3 className="text-sm uppercase tracking-[0.18em] text-stone-800">
          Kontaktuppgifter, Ateljé &amp; Sidfot
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              E-postadress
            </label>
            <input
              type="email"
              value={contact.email || ''}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Telefon
            </label>
            <input
              type="text"
              value={contact.phone || ''}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Rubrik för adress (t.ex. Ateljé)
            </label>
            <input
              type="text"
              value={contact.studioTitle || ''}
              onChange={(e) => setContact({ ...contact, studioTitle: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Instagram-länk
            </label>
            <input
              type="url"
              value={contact.instagramUrl || ''}
              onChange={(e) => setContact({ ...contact, instagramUrl: e.target.value })}
              placeholder="https://www.instagram.com/..."
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Gatuadress
            </label>
            <input
              type="text"
              value={contact.addressLine1 || ''}
              onChange={(e) => setContact({ ...contact, addressLine1: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Postnummer &amp; ort
            </label>
            <input
              type="text"
              value={contact.addressLine2 || ''}
              onChange={(e) => setContact({ ...contact, addressLine2: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
              Sidfotstext (copyright)
            </label>
            <input
              type="text"
              value={contact.copyright || ''}
              onChange={(e) => setContact({ ...contact, copyright: e.target.value })}
              className="w-full border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingContact}
          className="px-6 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-[0.18em] hover:bg-stone-800 disabled:opacity-50"
        >
          {savingContact ? 'Sparar...' : 'Spara kontaktuppgifter'}
        </button>
      </form>
    </div>
  );
}
