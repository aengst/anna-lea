export const DEFAULT_THEME = {
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
};

export const DEFAULT_LAYOUT = {
  homeMode: 'split', // 'split' | 'jewelry' | 'art'
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
};

export const DEFAULT_CONTACT = {
  email: 'annalea.oquist@gmail.com',
  phone: '+46 73 076 35 15',
  studioTitle: 'Ateljé',
  addressLine1: 'Högbergsgatan 12',
  addressLine2: '116 20 Södermalm, Stockholm',
  instagramUrl: 'https://www.instagram.com/',
  copyright: '© Anna-Lea AB',
};

export const DEFAULT_SETTINGS = {
  theme: DEFAULT_THEME,
  layout: DEFAULT_LAYOUT,
  contact: DEFAULT_CONTACT,
};
