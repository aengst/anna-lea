import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { apiGet } from '../lib/api.js';
import RichText from '../components/RichText.jsx';

const STATUS_LABELS = {
  available: 'Tillgänglig',
  sold: 'Såld',
  exhibited: 'Utställd',
};

function getGridClass(cols) {
  if (Number(cols) === 2) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
  if (Number(cols) === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}

export default function ArtPage() {
  const { settings, pages } = useSite();
  const { theme, layout } = settings;
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'project' | 'artwork'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiGet('/api/public/art')
      .then((data) => {
        if (active) setEntries(data.items || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Kunde inte ladda konst.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Dölj enskilda verk i huvudlistan om de redan ligger inuti ett synligt projekt och filtret är "all"
  const projects = entries.filter((e) => e.entry_type === 'project');
  const artworks = entries.filter((e) => e.entry_type === 'artwork');
  const hasBothTypes = projects.length > 0 && artworks.length > 0;

  const visibleEntries = entries.filter((e) => {
    if (filter === 'project') return e.entry_type === 'project';
    if (filter === 'artwork') return e.entry_type === 'artwork';
    return !e.parent_project_id;
  });

  const gridClass = getGridClass(layout.galleryColumnsDesktop);
  const artPage = pages['om-konsten'];

  return (
    <div>
      {/* Header */}
      <section
        className="relative py-16 sm:py-24 px-5 sm:px-8 border-b border-black/[0.06]"
        style={
          theme.artBgUrl
            ? {
                backgroundImage: `url(${theme.artBgUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {theme.artBgUrl && <div className="absolute inset-0 bg-black/25" />}
        <div
          className={`relative z-10 max-w-3xl mx-auto text-center space-y-4 ${
            theme.artBgUrl ? 'text-white' : 'text-brand-ink'
          }`}
        >
          <p
            className={`text-xs uppercase tracking-[0.25em] ${
              theme.artBgUrl ? 'text-white/80' : 'text-brand-muted'
            }`}
          >
            Galleri &amp; Projekt
          </p>
          <h1 className="text-3xl sm:text-4xl uppercase tracking-[0.18em]">Konst</h1>
          <p
            className={`text-sm sm:text-base max-w-xl mx-auto ${
              theme.artBgUrl ? 'text-white/90' : 'text-brand-muted'
            }`}
          >
            Konstverk, bildserier och utställningsprojekt av Anna-Lea Öquist.
          </p>

          {hasBothTypes && (
            <div className="pt-4 flex items-center justify-center gap-3">
              {[
                { id: 'all', label: 'Alla' },
                { id: 'project', label: 'Projekt & serier' },
                { id: 'artwork', label: 'Enskilda verk' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-4 py-1.5 text-xs uppercase tracking-[0.18em] border transition-colors ${
                    filter === tab.id
                      ? 'border-brand-ink bg-brand-ink text-brand-bg'
                      : 'border-black/15 text-brand-muted hover:text-brand-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Galleri */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        {loading && (
          <p className="text-center text-sm text-brand-muted py-12 tracking-wider">Laddar konst...</p>
        )}
        {error && <p className="text-center text-sm text-red-700 py-8">{error}</p>}

        {!loading && !error && visibleEntries.length === 0 && (
          <div className="max-w-xl mx-auto text-center py-16 px-6 border border-black/[0.07] bg-brand-surface/50 space-y-4">
            <h2 className="text-lg uppercase tracking-[0.18em] text-brand-ink">
              Konstgalleriet är på väg
            </h2>
            <p className="text-sm text-brand-muted leading-relaxed">
              Här kommer Anna-Leas konstverk och utställningsprojekt att visas. Nya verk och
              bildserier publiceras löpande.
            </p>
            <div className="pt-2">
              <Link
                to="/kontakt"
                className="text-xs uppercase tracking-[0.2em] border-b border-brand-ink pb-1 hover:opacity-75 transition-opacity"
              >
                Hör gärna av dig vid frågor
              </Link>
            </div>
          </div>
        )}

        {visibleEntries.length > 0 && (
          <div className={`grid ${gridClass} gap-x-8 gap-y-12`}>
            {visibleEntries.map((entry) => {
              const cover = entry.media?.[0];
              const metaBits = [entry.year, entry.technique, entry.dimensions].filter(Boolean);
              const statusLabel = STATUS_LABELS[entry.status];

              return (
                <Link key={entry.id} to={`/konst/${entry.slug}`} className="group block">
                  <div className="aspect-[4/3] bg-brand-surface border border-black/[0.06] overflow-hidden relative">
                    {cover ? (
                      <img
                        src={cover.url_thumb || cover.url_large}
                        alt={cover.alt_text || entry.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-brand-muted">
                        {entry.entry_type === 'project' ? 'Projekt' : 'Konstverk'}
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex gap-2">
                      {entry.entry_type === 'project' && (
                        <span className="bg-white/90 text-brand-ink text-[10px] uppercase tracking-[0.2em] px-2.5 py-1">
                          Projekt
                        </span>
                      )}
                      {statusLabel && (
                        <span
                          className={`text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 ${
                            entry.status === 'sold'
                              ? 'bg-brand-ink/85 text-brand-bg'
                              : 'bg-white/90 text-brand-ink'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 text-center space-y-1">
                    <h3 className="text-sm sm:text-base tracking-[0.14em] uppercase text-brand-ink group-hover:text-brand-accent transition-colors">
                      {entry.title}
                    </h3>
                    {metaBits.length > 0 && (
                      <p className="text-xs text-brand-muted">{metaBits.join(' · ')}</p>
                    )}
                    {entry.price_label && (
                      <p className="text-xs text-brand-ink/80">{entry.price_label}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Om konsten */}
      {artPage && (
        <section className="border-t border-black/[0.06] bg-brand-surface/40 py-16 sm:py-20 px-5 sm:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl uppercase tracking-[0.18em] mb-6">{artPage.title}</h2>
            <RichText content={artPage.content} className="text-center" />
          </div>
        </section>
      )}
    </div>
  );
}
