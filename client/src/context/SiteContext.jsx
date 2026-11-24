import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet } from '../lib/api.js';

const FONT_MAP = {
  jost: '"Jost", sans-serif',
  raleway: '"Raleway", sans-serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  georgia: 'Georgia, "Times New Roman", serif',
};

export const FALLBACK_SETTINGS = {
  theme: {
    bgPrimary: '#ffffff',
    bgSecondary: '#faf9f7',
    textPrimary: '#2f2e2e',
    textMuted: '#605e5e',
    accent: '#8c6d5a',
    fontHeading: 'jost',
    fontBody: 'jost',
    heroImageUrl: '',
    heroOverlayOpacity: 0.25,
    jewelryBgUrl: '',
    artBgUrl: '',
  },
  layout: {
    homeMode: 'split',
    homeTitle: 'Anna-Lea Öquist',
    homeSubtitle: 'Handgjorda smycken och konst från ateljén på Södermalm i Stockholm.',
    homeIntro:
      'Smycken tillverkade med reflektion och omtanke i återvunnet silver, guld och etiska ädelstenar — samt konstverk och utställningsprojekt.',
    jewelryCardTitle: 'Smycken',
    jewelryCardSubtitle: 'Handgjorda smycken & unika vigselringar',
    artCardTitle: 'Konst',
    artCardSubtitle: 'Konstverk, serier & projekt',
    homeSections: [
      { id: 'hero', label: 'Stämningsbild & välkomsttext', visible: true },
      { id: 'portals', label: 'Ingångar till Smycken & Konst', visible: true },
      { id: 'about', label: 'Kort presentation av Anna-Lea', visible: true },
    ],
    galleryColumnsDesktop: 3,
    showArtLink: true,
    showJewelryLink: true,
  },
  contact: {
    email: 'annalea.oquist@gmail.com',
    phone: '+46 73 076 35 15',
    studioTitle: 'Ateljé',
    addressLine1: 'Högbergsgatan 12',
    addressLine2: '116 20 Södermalm, Stockholm',
    instagramUrl: 'https://www.instagram.com/',
    copyright: '© Anna-Lea AB',
  },
};

export function applyThemeToDocument(theme = {}) {
  const root = document.documentElement;
  const t = { ...FALLBACK_SETTINGS.theme, ...theme };
  root.style.setProperty('--color-bg-primary', t.bgPrimary);
  root.style.setProperty('--color-bg-secondary', t.bgSecondary);
  root.style.setProperty('--color-text-primary', t.textPrimary);
  root.style.setProperty('--color-text-muted', t.textMuted);
  root.style.setProperty('--color-accent', t.accent);
  root.style.setProperty('--font-heading', FONT_MAP[t.fontHeading] || FONT_MAP.jost);
  root.style.setProperty('--font-body', FONT_MAP[t.fontBody] || FONT_MAP.jost);
}

const SiteContext = createContext({
  settings: FALLBACK_SETTINGS,
  pages: {},
  loading: true,
  refreshSite: async () => {},
});

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(true);

  const refreshSite = useCallback(async () => {
    try {
      const data = await apiGet('/api/public/bootstrap');
      const merged = {
        theme: { ...FALLBACK_SETTINGS.theme, ...(data.settings?.theme || {}) },
        layout: { ...FALLBACK_SETTINGS.layout, ...(data.settings?.layout || {}) },
        contact: { ...FALLBACK_SETTINGS.contact, ...(data.settings?.contact || {}) },
      };
      setSettings(merged);
      setPages(data.pages || {});
      applyThemeToDocument(merged.theme);
    } catch {
      applyThemeToDocument(FALLBACK_SETTINGS.theme);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSite();
  }, [refreshSite]);

  return (
    <SiteContext.Provider value={{ settings, pages, loading, refreshSite }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
