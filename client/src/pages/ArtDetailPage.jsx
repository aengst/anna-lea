import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { apiGet } from '../lib/api.js';
import Lightbox from '../components/Lightbox.jsx';
import InquiryForm from '../components/InquiryForm.jsx';

const STATUS_LABELS = {
  available: 'Tillgänglig',
  sold: 'Såld',
  exhibited: 'Utställd',
};

export default function ArtDetailPage() {
  const { slug } = useParams();
  const [entry, setEntry] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setActiveImage(0);
    apiGet(`/api/public/art/${slug}`)
      .then((data) => {
        if (!active) return;
        setEntry(data.item);
        setChildren(data.children || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Konstverket hittades inte.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24 text-center text-sm text-brand-muted">
        Laddar...
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center space-y-5">
        <p className="text-brand-muted">{error || 'Konstverket hittades inte.'}</p>
        <Link
          to="/konst"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] border-b border-brand-ink pb-1"
        >
          <ArrowLeft className="w-4 h-4" /> Tillbaka till konst
        </Link>
      </div>
    );
  }

  const images = entry.media || [];
  const currentImg = images[activeImage] || images[0];

  // Visa enbart metadata-fält som faktiskt har fyllts i
  const metadataRows = [
    { label: 'År', value: entry.year },
    { label: 'Teknik / Material', value: entry.technique },
    { label: 'Mått', value: entry.dimensions },
    { label: 'Plats / Utställning', value: entry.location },
    { label: 'Pris', value: entry.price_label },
    { label: 'Status', value: STATUS_LABELS[entry.status] || '' },
  ].filter((row) => Boolean(row.value));

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-16 space-y-16">
      <div>
        <Link
          to="/konst"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-muted hover:text-brand-ink transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Tillbaka till konst
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Bilder */}
          <div className="lg:col-span-7 space-y-4">
            {currentImg ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group relative block w-full bg-brand-surface border border-black/[0.07] overflow-hidden cursor-zoom-in"
              >
                <img
                  src={currentImg.url_large}
                  alt={currentImg.alt_text || entry.title}
                  className="w-full max-h-[70vh] object-contain mx-auto"
                />
                <span className="absolute bottom-3 right-3 bg-white/90 text-brand-ink p-2 opacity-75 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
                </span>
              </button>
            ) : (
              <div className="aspect-[4/3] bg-brand-surface border border-black/[0.07] flex items-center justify-center text-xs uppercase tracking-widest text-brand-muted">
                Ingen bild uppladdad ännu
              </div>
            )}

            {currentImg?.caption && (
              <p className="text-xs text-brand-muted italic">{currentImg.caption}</p>
            )}

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`aspect-[4/3] bg-brand-surface border overflow-hidden transition-all ${
                      idx === activeImage
                        ? 'border-brand-ink opacity-100'
                        : 'border-black/10 opacity-65 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url_thumb || img.url_large}
                      alt={img.alt_text || `${entry.title} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Information & intresseförfrågan */}
          <div className="lg:col-span-5 space-y-7">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-brand-muted">
                {entry.entry_type === 'project' ? 'Projekt / Serie' : 'Konstverk'}
              </p>
              <h1 className="text-2xl sm:text-3xl uppercase tracking-[0.16em] text-brand-ink">
                {entry.title}
              </h1>
            </div>

            {entry.description && (
              <p className="text-sm sm:text-[15px] text-brand-muted leading-relaxed whitespace-pre-line">
                {entry.description}
              </p>
            )}

            {metadataRows.length > 0 && (
              <dl className="border-y border-black/[0.08] py-4 space-y-2.5 text-sm">
                {metadataRows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                      {row.label}
                    </dt>
                    <dd className="text-brand-ink text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {entry.allow_inquiry && (
              <InquiryForm
                inquiryType="art_inquiry"
                entityType="art"
                entityId={entry.id}
                itemTitle={entry.title}
                heading="Intresseförfrågan"
                subtitle="Hör gärna av dig om du vill veta mer om verket, visning i ateljén eller tillgänglighet."
                submitLabel="Skicka förfrågan"
                messagePlaceholder="Skriv din fråga eller intresseanmälan..."
              />
            )}
          </div>
        </div>
      </div>

      {/* Ingående konstverk om detta är ett projekt */}
      {children.length > 0 && (
        <section className="border-t border-black/[0.08] pt-12 space-y-8">
          <h2 className="text-xl uppercase tracking-[0.18em] text-center">Verk i projektet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {children.map((child) => {
              const cover = child.media?.[0];
              return (
                <Link key={child.id} to={`/konst/${child.slug}`} className="group block">
                  <div className="aspect-[4/3] bg-brand-surface border border-black/[0.06] overflow-hidden">
                    {cover ? (
                      <img
                        src={cover.url_thumb || cover.url_large}
                        alt={cover.alt_text || child.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-brand-muted">
                        Konstverk
                      </div>
                    )}
                  </div>
                  <div className="pt-3 text-center space-y-0.5">
                    <h3 className="text-sm uppercase tracking-[0.14em] text-brand-ink">
                      {child.title}
                    </h3>
                    {[child.year, child.dimensions].filter(Boolean).length > 0 && (
                      <p className="text-xs text-brand-muted">
                        {[child.year, child.dimensions].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {lightboxOpen && images.length > 0 && (
        <Lightbox
          images={images}
          currentIndex={activeImage}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setActiveImage}
        />
      )}
    </div>
  );
}
