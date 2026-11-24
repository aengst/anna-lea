import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { apiGet } from '../lib/api.js';
import RichText from '../components/RichText.jsx';

function getGridClass(cols) {
  if (Number(cols) === 2) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
  if (Number(cols) === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}

function JewelryCard({ item }) {
  const cover = item.media?.[0];
  const variants = Array.isArray(item.variants) ? item.variants : [];

  return (
    <Link to={`/smycken/${item.slug}`} className="group block">
      <div className="aspect-[4/3] bg-white border border-black/[0.06] overflow-hidden relative">
        {cover ? (
          <img
            src={cover.url_thumb || cover.url_large}
            alt={cover.alt_text || item.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-brand-muted">
            Ingen bild
          </div>
        )}
        {item.status === 'sold' && (
          <span className="absolute top-3 left-3 bg-brand-ink/85 text-brand-bg text-[10px] uppercase tracking-[0.2em] px-2.5 py-1">
            Såld
          </span>
        )}
      </div>

      <div className="pt-4 text-center space-y-1">
        <h3 className="text-sm sm:text-base tracking-[0.14em] uppercase text-brand-ink group-hover:text-brand-accent transition-colors">
          {item.title}
        </h3>
        {variants.length > 0 ? (
          <div className="text-xs text-brand-muted space-y-0.5">
            {variants.map((v, i) => (
              <p key={i}>
                {v.label} {v.price}
              </p>
            ))}
          </div>
        ) : (
          item.price_label && <p className="text-xs sm:text-sm text-brand-muted">{item.price_label}</p>
        )}
      </div>
    </Link>
  );
}

export default function JewelryPage() {
  const { settings, pages } = useSite();
  const { theme, layout } = settings;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiGet('/api/public/jewelry')
      .then((data) => {
        if (active) setItems(data.items || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Kunde inte ladda smycken.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const regularItems = items.filter((i) => i.category === 'smycken');
  const bespokeItems = items.filter((i) => i.category === 'unika_bestallningar');
  const gridClass = getGridClass(layout.galleryColumnsDesktop);
  const synPage = pages['min-syn-pa-smycken'];

  return (
    <div>
      {/* Luftig hero-sektion */}
      <section
        className="relative py-16 sm:py-24 px-5 sm:px-8 border-b border-black/[0.06]"
        style={
          theme.jewelryBgUrl
            ? {
                backgroundImage: `url(${theme.jewelryBgUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {theme.jewelryBgUrl && <div className="absolute inset-0 bg-black/25" />}
        <div
          className={`relative z-10 max-w-3xl mx-auto text-center space-y-4 ${
            theme.jewelryBgUrl ? 'text-white' : 'text-brand-ink'
          }`}
        >
          <p
            className={`text-xs uppercase tracking-[0.25em] ${
              theme.jewelryBgUrl ? 'text-white/80' : 'text-brand-muted'
            }`}
          >
            Smycken
          </p>
          <h1 className="text-3xl sm:text-4xl uppercase tracking-[0.18em]">Tongivande smycken</h1>
          <p
            className={`text-sm sm:text-base max-w-xl mx-auto ${
              theme.jewelryBgUrl ? 'text-white/90' : 'text-brand-muted'
            }`}
          >
            Handgjorda smycken tillverkade med reflektion och omtanke i Stockholm.
          </p>
          {bespokeItems.length > 0 && (
            <div className="pt-3 flex items-center justify-center gap-6 text-xs uppercase tracking-[0.18em]">
              <a href="#kollektion" className="underline underline-offset-4 opacity-85 hover:opacity-100">
                Kollektion
              </a>
              <a href="#unika-bestallningar" className="underline underline-offset-4 opacity-85 hover:opacity-100">
                Unika beställningar
              </a>
              {synPage && (
                <a href="#min-syn" className="underline underline-offset-4 opacity-85 hover:opacity-100">
                  Min syn på smycken
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Kollektion */}
      <section id="kollektion" className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        {loading && (
          <p className="text-center text-sm text-brand-muted py-12 tracking-wider">Laddar smycken...</p>
        )}
        {error && <p className="text-center text-sm text-red-700 py-8">{error}</p>}

        {!loading && !error && regularItems.length === 0 && (
          <p className="text-center text-sm text-brand-muted py-12">
            Inga smycken publicerade ännu.
          </p>
        )}

        {regularItems.length > 0 && (
          <div className={`grid ${gridClass} gap-x-8 gap-y-12`}>
            {regularItems.map((item) => (
              <JewelryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Unika beställningar / Vigselringar */}
      {bespokeItems.length > 0 && (
        <section
          id="unika-bestallningar"
          className="border-t border-black/[0.06] bg-brand-surface/55 py-16 sm:py-24 px-5 sm:px-8"
        >
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-muted">
                Unika beställningar
              </p>
              <h2 className="text-2xl sm:text-3xl uppercase tracking-[0.18em]">Vigselringar</h2>
              <p className="text-sm sm:text-base text-brand-muted leading-relaxed">
                Smycken för ögonblick i livet. Handgjorda i återvunnet guld i ett samarbete mellan
                dina unika önskemål, mina idéer och min hantverkskunskap. Tillsammans går vi från
                skiss till färdigt smycke.
              </p>
            </div>

            <div className={`grid ${gridClass} gap-x-8 gap-y-12`}>
              {bespokeItems.map((item) => (
                <JewelryCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Min syn på smycken */}
      {synPage && (
        <section id="min-syn" className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl uppercase tracking-[0.18em] mb-8">{synPage.title}</h2>
          <RichText content={synPage.content} className="text-center" />
        </section>
      )}
    </div>
  );
}
