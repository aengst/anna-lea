import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { apiGet } from '../lib/api.js';
import RichText from '../components/RichText.jsx';

export default function InfoPage() {
  const { slug } = useParams();
  const { pages } = useSite();
  const [page, setPage] = useState(pages[slug] || null);
  const [loading, setLoading] = useState(!pages[slug]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (pages[slug]) {
      setPage(pages[slug]);
      setLoading(false);
      setNotFound(false);
      return;
    }

    let active = true;
    setLoading(true);
    setNotFound(false);
    apiGet(`/api/public/pages/${slug}`)
      .then((data) => {
        if (active) setPage(data.page);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, pages]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center text-sm text-brand-muted">
        Laddar...
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center space-y-4">
        <h1 className="text-2xl uppercase tracking-[0.18em]">Sidan hittades inte</h1>
        <Link to="/" className="text-xs uppercase tracking-[0.2em] border-b border-brand-ink pb-1">
          Till startsidan
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-20 space-y-8">
      <header className="text-center space-y-3 pb-6 border-b border-black/[0.08]">
        <p className="text-xs uppercase tracking-[0.24em] text-brand-muted">Information</p>
        <h1 className="text-2xl sm:text-4xl uppercase tracking-[0.16em] text-brand-ink">
          {page.title}
        </h1>
      </header>
      <RichText content={page.content} />
    </article>
  );
}
