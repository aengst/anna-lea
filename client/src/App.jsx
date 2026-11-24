import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { SiteProvider } from './context/SiteContext.jsx';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import JewelryPage from './pages/JewelryPage.jsx';
import JewelryDetailPage from './pages/JewelryDetailPage.jsx';
import ArtPage from './pages/ArtPage.jsx';
import ArtDetailPage from './pages/ArtDetailPage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import ContactPage from './pages/ContactPage.jsx';

// Lazy-ladda admingränssnittet så publika besökare inte laddar ner admin-koden
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center space-y-5">
      <h1 className="text-2xl uppercase tracking-[0.2em]">Sidan hittades inte</h1>
      <p className="text-sm text-brand-muted">Länken verkar inte finnas längre.</p>
      <Link
        to="/"
        className="inline-block text-xs uppercase tracking-[0.2em] border-b border-brand-ink pb-1"
      >
        Tillbaka till startsidan
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <SiteProvider>
      <ScrollToTop />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
                  Laddar admin...
                </div>
              }
            >
              <AdminApp />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/smycken" element={<JewelryPage />} />
                <Route path="/smycken/:slug" element={<JewelryDetailPage />} />
                <Route path="/konst" element={<ArtPage />} />
                <Route path="/konst/:slug" element={<ArtDetailPage />} />
                <Route path="/info/:slug" element={<InfoPage />} />
                <Route path="/kontakt" element={<ContactPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </SiteProvider>
  );
}
