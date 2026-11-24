import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { apiGet } from '../lib/api.js';
import Lightbox from '../components/Lightbox.jsx';
import InquiryForm from '../components/InquiryForm.jsx';

export default function JewelryDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setActiveImage(0);
    apiGet(`/api/public/jewelry/${slug}`)
      .then((data) => {
        if (!active) return;
        setItem(data.item);
        const variants = Array.isArray(data.item?.variants) ? data.item.variants : [];
        if (variants.length > 0) {
          setSelectedVariant(`${variants[0].label} (${variants[0].price})`);
        } else {
          setSelectedVariant('');
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Smycket kunde inte hittas.');
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
        Laddar smycke...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center space-y-5">
        <p className="text-brand-muted">{error || 'Smycket hittades inte.'}</p>
        <Link
          to="/smycken"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] border-b border-brand-ink pb-1"
        >
          <ArrowLeft className="w-4 h-4" /> Tillbaka till smycken
        </Link>
      </div>
    );
  }

  const images = item.media || [];
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const isBespoke = item.category === 'unika_bestallningar';
  const currentImg = images[activeImage] || images[0];

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
      <Link
        to={isBespoke ? '/smycken#unika-bestallningar' : '/smycken'}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-muted hover:text-brand-ink transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        {isBespoke ? 'Tillbaka till unika beställningar' : 'Tillbaka till smycken'}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Bildgalleri */}
        <div className="lg:col-span-7 space-y-4">
          {currentImg ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group relative block w-full bg-white border border-black/[0.07] overflow-hidden cursor-zoom-in"
            >
              <img
                src={currentImg.url_large}
                alt={currentImg.alt_text || item.title}
                className="w-full aspect-[4/3] object-contain bg-white"
              />
              <span className="absolute bottom-3 right-3 bg-white/90 text-brand-ink p-2 opacity-75 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
              </span>
            </button>
          ) : (
            <div className="aspect-[4/3] bg-brand-surface border border-black/[0.07] flex items-center justify-center text-xs uppercase tracking-widest text-brand-muted">
              Ingen bild tillgänglig
            </div>
          )}

          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-[4/3] bg-white border overflow-hidden transition-all ${
                    idx === activeImage
                      ? 'border-brand-ink opacity-100'
                      : 'border-black/10 opacity-65 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url_thumb || img.url_large}
                    alt={img.alt_text || `${item.title} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info & beställningsformulär */}
        <div className="lg:col-span-5 space-y-7">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-muted">
              {isBespoke ? 'Unik beställning' : 'Smycke'}
            </p>
            <h1 className="text-2xl sm:text-3xl uppercase tracking-[0.16em] text-brand-ink">
              {item.title}
            </h1>

            {variants.length > 0 ? (
              <div className="pt-2 space-y-2">
                <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">
                  Välj utförande
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, idx) => {
                    const label = `${v.label} (${v.price})`;
                    const active = selectedVariant === label;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedVariant(label)}
                        className={`px-4 py-2 text-xs tracking-wider border transition-colors ${
                          active
                            ? 'border-brand-ink bg-brand-ink text-brand-bg'
                            : 'border-black/15 text-brand-ink hover:border-brand-ink'
                        }`}
                      >
                        {v.label} — {v.price}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              item.price_label && (
                <p className="text-lg text-brand-ink font-light">{item.price_label}</p>
              )
            )}

            {item.status === 'sold' && (
              <p className="inline-block text-xs uppercase tracking-[0.18em] bg-brand-ink text-brand-bg px-3 py-1">
                Tillfälligt såld – kontakta gärna vid intresse
              </p>
            )}
          </div>

          {item.description && (
            <p className="text-sm sm:text-[15px] text-brand-muted leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
          )}

          {item.story && (
            <div className="border-l-2 border-brand-accent/50 pl-4 py-1 text-sm text-brand-muted italic leading-relaxed whitespace-pre-line">
              {item.story}
            </div>
          )}

          <p className="text-xs text-brand-muted leading-relaxed">
            {isBespoke
              ? 'Skicka en förfrågan så skapar vi ett unikt smycke tillsammans utifrån dina önskemål.'
              : 'Hör gärna av dig om du vill prova smycket innan beställning så bokar vi in en tid på smedjan.'}
          </p>

          <InquiryForm
            inquiryType={isBespoke ? 'custom_request' : 'jewelry_order'}
            entityType="jewelry"
            entityId={item.id}
            itemTitle={item.title}
            variantChoice={selectedVariant}
            heading={isBespoke ? 'Skicka förfrågan' : 'Beställ eller fråga'}
            subtitle={
              isBespoke
                ? 'Berätta om dina tankar kring metall, sten eller storlek så återkommer Anna-Lea.'
                : 'Skicka din beställning eller fråga här. Alla smycken skickas via rekommenderat postförskott eller hämtas i ateljén.'
            }
            submitLabel={isBespoke ? 'Skicka förfrågan' : 'Beställ'}
            messagePlaceholder={
              isBespoke
                ? 'Berätta om dina önskemål kring smycket...'
                : 'Ange gärna önskad storlek, leveransadress eller om du vill boka tid i ateljén...'
            }
          />
        </div>
      </div>

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
