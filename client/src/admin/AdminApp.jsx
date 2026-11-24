import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  FileText,
  Gem,
  Inbox,
  LogOut,
  Palette,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { apiGet, apiPost } from '../lib/api.js';
import InquiriesTab from './InquiriesTab.jsx';
import JewelryTab from './JewelryTab.jsx';
import ArtTab from './ArtTab.jsx';
import PagesTab from './PagesTab.jsx';
import AppearanceTab from './AppearanceTab.jsx';
import UsersTab from './UsersTab.jsx';
import ManualTab from './ManualTab.jsx';

const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0');

const AUTH_ERROR_MESSAGES = {
  unauthorized: 'Det Google-kontot har inte administratörsbehörighet till anna-lea.com.',
  cancelled: 'Inloggningen avbröts.',
  config: 'Servern saknar JWT_SECRET eller Google OAuth-konfiguration i .env.',
  failed: 'Inloggningen misslyckades. Försök igen.',
};

export default function AdminApp() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('inquiries');
  const [stats, setStats] = useState({ unreadInquiries: 0 });

  const authError = searchParams.get('authError');
  const deniedEmail = searchParams.get('email');

  const loadStats = useCallback(async () => {
    try {
      const data = await apiGet('/api/admin/stats');
      setStats(data);
    } catch {
      // Ignorera om utloggad
    }
  }, []);

  useEffect(() => {
    apiGet('/api/auth/me')
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          loadStats();
        }
      })
      .finally(() => setChecking(false));
  }, [loadStats]);

  async function handleLogout() {
    await apiPost('/api/auth/logout');
    setUser(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
        Kontrollerar inloggning...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
        style={{
          background:
            'radial-gradient(circle at top, #f7f1ec 0%, #faf9f7 52%, #f1ece7 100%)',
        }}
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_20px_60px_-20px_rgba(47,46,46,0.16)] border border-black/[0.06] p-9 sm:p-11 text-center space-y-7">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#faf9f7] border border-black/[0.08] flex items-center justify-center shadow-sm">
            <img src="/favicon.png" alt="Anna-Lea" className="w-12 h-12 object-contain opacity-90" />
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-stone-400">
              Välkommen till
            </p>
            <h1 className="text-2xl sm:text-3xl font-heading font-light uppercase tracking-[0.22em] text-stone-900">
              Anna-Lea
            </h1>
            <p className="text-sm text-stone-500 leading-relaxed pt-1">
              Smycken &amp; Konst. Hantera gallerier, texter, utseende och förfrågningar.
            </p>
          </div>

          {authError && (
            <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-3.5 text-left space-y-1">
              <p>{AUTH_ERROR_MESSAGES[authError] || 'Ett fel uppstod vid inloggning.'}</p>
              {deniedEmail && <p className="font-mono text-[11px]">Konto: {deniedEmail}</p>}
            </div>
          )}

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full rounded-xl bg-stone-900 text-white py-3.5 px-5 text-sm font-normal tracking-wide shadow-sm hover:bg-stone-800 active:scale-[0.99] transition-all"
          >
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </span>
            <span>Logga in med Google</span>
          </a>

          <div className="pt-1 flex flex-col items-center gap-2">
            <Link
              to="/"
              className="inline-block text-xs uppercase tracking-[0.2em] text-stone-400 hover:text-stone-800 transition-colors"
            >
              Tillbaka till hemsidan
            </Link>
            <span className="text-[11px] text-stone-300 tracking-wider">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'inquiries', label: 'Förfrågningar', icon: Inbox, badge: stats.unreadInquiries },
    { id: 'jewelry', label: 'Smycken', icon: Gem },
    { id: 'art', label: 'Konst', icon: Palette },
    { id: 'pages', label: 'Sidor & Kontakt', icon: FileText },
    { id: 'appearance', label: 'Utseende', icon: SlidersHorizontal },
    { id: 'users', label: 'Admins', icon: Users },
    { id: 'manual', label: 'Manual', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Toppbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/favicon.png" alt="Anna-Lea" className="w-7 h-7 object-contain" />
            <span className="text-sm uppercase tracking-[0.2em] truncate">Anna-Lea Admin</span>
            <span className="hidden sm:inline text-[11px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
              v{APP_VERSION}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-600 hover:text-stone-900"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visa sidan</span>
            </Link>

            <span className="hidden md:inline text-xs text-stone-500 truncate max-w-[180px]">
              {user.email}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-600 hover:text-stone-900"
              title="Logga ut"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logga ut</span>
            </button>
          </div>
        </div>

        {/* Mobil- och desktopvänlig flikrad (horisontell scroll på små skärmar) */}
        <nav className="max-w-6xl mx-auto px-3 sm:px-6 flex gap-1 overflow-x-auto border-t border-stone-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs uppercase tracking-[0.14em] whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-stone-900 text-stone-900 font-normal'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Aktiv flik */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {activeTab === 'inquiries' && <InquiriesTab onStatsChange={loadStats} />}
        {activeTab === 'jewelry' && <JewelryTab onStatsChange={loadStats} />}
        {activeTab === 'art' && <ArtTab onStatsChange={loadStats} />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'users' && <UsersTab currentUser={user} onStatsChange={loadStats} />}
        {activeTab === 'manual' && <ManualTab />}
      </main>
    </div>
  );
}
