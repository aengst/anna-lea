import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
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
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md bg-white border border-stone-200 p-8 sm:p-10 text-center space-y-6">
          <img src="/favicon.png" alt="Anna-Lea" className="w-14 h-14 mx-auto opacity-90" />
          <div className="space-y-2">
            <h1 className="text-xl uppercase tracking-[0.22em] text-stone-900">
              Anna-Lea Admin
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              Logga in med ett godkänt Google-konto för att hantera smycken, konst, texter och utseende.
            </p>
          </div>

          {authError && (
            <div className="text-xs text-red-800 bg-red-50 border border-red-200 p-3.5 text-left space-y-1">
              <p>{AUTH_ERROR_MESSAGES[authError] || 'Ett fel uppstod vid inloggning.'}</p>
              {deniedEmail && <p className="font-mono text-[11px]">Konto: {deniedEmail}</p>}
            </div>
          )}

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full bg-stone-900 text-white py-3.5 px-5 text-xs uppercase tracking-[0.2em] hover:bg-stone-800 transition-colors"
          >
            Logga in med Google
          </a>

          <Link
            to="/"
            className="inline-block text-xs uppercase tracking-[0.18em] text-stone-500 hover:text-stone-900 pt-2"
          >
            ← Tillbaka till hemsidan
          </Link>
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
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Toppbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/favicon.png" alt="Anna-Lea" className="w-7 h-7 object-contain" />
            <span className="text-sm uppercase tracking-[0.2em] truncate">Anna-Lea Admin</span>
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
      </main>
    </div>
  );
}
