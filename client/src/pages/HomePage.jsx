import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { apiGet } from '../lib/api.js';
import JewelryPage from './JewelryPage.jsx';
import ArtPage from './ArtPage.jsx';

export default function HomePage() {
  const { settings } = useSite();
  const { theme, layout } = settings;
  const [previewImages, setPreviewImages] = useState({ jewelry: '', art: '' });

  useEffect(() => {
    if (layout.homeMode !== 'split') return;
    let active = true;
    Promise.all([
      apiGet('/api/public/jewelry').catch(() => ({ items: [] })),
      apiGet('/api/public/art').catch(() => ({ items: [] })),
    ]).then(([jData, aData]) => {
      if (!active) return;
      const firstJewelry = jData.items?.find((i) => i.media?.length > 0)?.media?.[0]?.url_large || '';
      const firstArt = aData.items?.find((i) => i.media?.length > 0)?.media?.[0]?.url_large || '';
      setPreviewImages({ jewelry: firstJewelry, art: firstArt });
    });
    return () => {
      active = false;
    };
  }, [layout.homeMode]);

  // Om administratören valt att öppna Smycken eller Konst direkt på startsidan
  if (layout.homeMode === 'jewelry') return <JewelryPage />;
  if (layout.homeMode === 'art') return <ArtPage />;

  const sections = Array.isArray(layout.homeSections) && layout.homeSections.length > 0
    ? layout.homeSections
    : [
        { id: 'hero', visible: true },
        { id: 'portals', visible: true },
        { id: 'about', visible: true },
      ];

  const overlayOpacity = Number(theme.heroOverlayOpacity ?? 0.25);

  const renderSection = (section) => {
    if (section.visible === false) return null;

    if (section.id === 'hero') {
      const hasBg = Boolean(theme.heroImageUrl);
      return (
        <section
          key="hero"
          className="relative min-h-[58vh] sm:min-h-[66vh] flex items-center justify-center overflow-hidden"
          style={
            hasBg
              ? {
                  backgroundImage: `url(${theme.heroImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {
                  background:
                    'linear-gradient(135deg, #f6eee8 0%, #faf9f7 48%, #f1e6de 100%)',
                }
          }
        >
          {hasBg && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `rgba(28, 22, 19, ${overlayOpacity})` }}
            />
          )}

          <div
            className={`relative z-10 max-w-3xl mx-auto px-6 py-20 text-center space-y-6 ${
              hasBg ? 'text-white' : 'text-brand-ink'
            }`}
          >
            <img
              src="/favicon.png"
              alt=""
              className={`w-12 h-12 mx-auto object-contain ${
                hasBg ? 'invert opacity-90' : 'opacity-85'
              }`}
            />
            <h1 className="text-3xl sm:text-5xl font-heading font-light tracking-[0.22em] uppercase">
              {layout.homeTitle || 'Anna-Lea Öquist'}
            </h1>
            <p
              className={`text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-light ${
                hasBg ? 'text-white/90' : 'text-brand-muted'
              }`}
            >
              {layout.homeSubtitle ||
                'Handgjorda smycken och konst från ateljén på Södermalm i Stockholm.'}
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              {layout.showJewelryLink !== false && (
                <Link
                  to="/smycken"
                  className={`px-7 py-3 text-xs uppercase tracking-[0.22em] transition-all border ${
                    hasBg
                      ? 'border-white/80 text-white hover:bg-white hover:text-stone-900'
                      : 'border-brand-ink text-brand-ink hover:bg-brand-ink hover:text-brand-bg'
                  }`}
                >
                  {layout.jewelryCardTitle || 'Smycken'}
                </Link>
              )}
              {layout.showArtLink !== false && (
                <Link
                  to="/konst"
                  className={`px-7 py-3 text-xs uppercase tracking-[0.22em] transition-all border ${
                    hasBg
                      ? 'border-white/80 text-white hover:bg-white hover:text-stone-900'
                      : 'border-brand-ink/40 text-brand-ink hover:border-brand-ink hover:bg-brand-ink hover:text-brand-bg'
                  }`}
                >
                  {layout.artCardTitle || 'Konst'}
                </Link>
              )}
            </div>
          </div>
        </section>
      );
    }

    if (section.id === 'portals') {
      return (
        <section key="portals" className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
            {layout.showJewelryLink !== false && (
              <Link
                to="/smycken"
                className="group block border border-black/[0.08] bg-brand-surface/50 overflow-hidden hover:border-black/20 transition-all"
              >
                <div className="aspect-[4/3] bg-white overflow-hidden flex items-center justify-center">
                  {previewImages.jewelry ? (
                    <img
                      src={previewImages.jewelry}
                      alt={layout.jewelryCardTitle || 'Smycken'}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  ) : (
                    <span className="text-xs uppercase tracking-[0.25em] text-brand-muted">
                      Smycken
                    </span>
                  )}
                </div>
                <div className="p-7 sm:p-9 flex items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <h2 className="text-xl sm:text-2xl uppercase tracking-[0.18em] text-brand-ink">
                      {layout.jewelryCardTitle || 'Smycken'}
                    </h2>
                    <p className="text-sm text-brand-muted">
                      {layout.jewelryCardSubtitle || 'Handgjorda smycken & unika vigselringar'}
                    </p>
                  </div>
                  <ArrowRight
                    className="w-5 h-5 text-brand-muted group-hover:text-brand-ink group-hover:translate-x-1 transition-all shrink-0"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            )}

            {layout.showArtLink !== false && (
              <Link
                to="/konst"
                className="group block border border-black/[0.08] bg-brand-surface/50 overflow-hidden hover:border-black/20 transition-all"
              >
                <div className="aspect-[4/3] bg-brand-surface overflow-hidden flex items-center justify-center relative">
                  {previewImages.art || theme.artBgUrl ? (
                    <img
                      src={previewImages.art || theme.artBgUrl}
                      alt={layout.artCardTitle || 'Konst'}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background:
                          'radial-gradient(circle at 30% 30%, #f3e8df 0%, #faf9f7 60%, #ece7e1 100%)',
                      }}
                    >
                      <span className="text-xs uppercase tracking-[0.3em] text-brand-muted">
                        Galleri &amp; Projekt
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-7 sm:p-9 flex items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <h2 className="text-xl sm:text-2xl uppercase tracking-[0.18em] text-brand-ink">
                      {layout.artCardTitle || 'Konst'}
                    </h2>
                    <p className="text-sm text-brand-muted">
                      {layout.artCardSubtitle || 'Konstverk, serier & projekt'}
                    </p>
                  </div>
                  <ArrowRight
                    className="w-5 h-5 text-brand-muted group-hover:text-brand-ink group-hover:translate-x-1 transition-all shrink-0"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            )}
          </div>
        </section>
      );
    }

    if (section.id === 'about') {
      return (
        <section
          key="about"
          className="border-y border-black/[0.06] bg-brand-surface/60 py-16 sm:py-24 px-5 sm:px-8"
        >
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-muted">
              Södermalm, Stockholm
            </p>
            <p className="text-base sm:text-lg text-brand-ink/90 leading-relaxed font-light">
              {layout.homeIntro ||
                'Smycken tillverkade med reflektion och omtanke i återvunnet silver, guld och etiska ädelstenar — samt konstverk och utställningsprojekt.'}
            </p>
            <div className="pt-2">
              <Link
                to="/kontakt"
                className="text-xs uppercase tracking-[0.2em] text-brand-muted hover:text-brand-ink border-b border-black/20 hover:border-brand-ink pb-1 transition-colors"
              >
                Kontakta ateljén
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return null;
  };

  return <div>{sections.map(renderSection)}</div>;
}
