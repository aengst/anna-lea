import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Instagram, Menu, X } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';

export default function Layout({ children }) {
  const { settings } = useSite();
  const { layout, contact } = settings;
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Hem', end: true, show: layout.homeMode === 'split' },
    { to: '/smycken', label: 'Smycken', show: layout.showJewelryLink !== false },
    { to: '/konst', label: 'Konst', show: layout.showArtLink !== false },
    { to: '/info/bestallning-och-storlek', label: 'Beställning & Storlek', show: true },
    { to: '/kontakt', label: 'Kontakt', show: true },
  ].filter((item) => item.show);

  const navLinkClass = ({ isActive }) =>
    `text-xs uppercase tracking-[0.2em] transition-colors pb-1 border-b ${
      isActive
        ? 'text-brand-ink border-brand-ink'
        : 'text-brand-muted border-transparent hover:text-brand-ink'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-ink">
      {/* Minimalistisk toppmeny */}
      <header className="sticky top-0 z-40 bg-brand-bg/95 backdrop-blur-sm border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 group"
          >
            <img
              src="/favicon.png"
              alt="Anna-Lea"
              className="w-9 h-9 object-contain opacity-90 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-lg sm:text-xl font-heading font-light tracking-[0.26em] uppercase text-brand-ink">
              Anna-Lea
            </span>
          </Link>

          {/* Desktop-navigering */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Huvudmeny">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobil menyknapp */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 -mr-2 text-brand-ink"
            aria-label={menuOpen ? 'Stäng meny' : 'Öppna meny'}
          >
            {menuOpen ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Menu className="w-6 h-6" strokeWidth={1.5} />}
          </button>
        </div>

        {/* Mobil meny */}
        {menuOpen && (
          <nav
            className="md:hidden border-t border-black/[0.06] bg-brand-bg px-6 py-6 flex flex-col gap-5"
            aria-label="Mobilmeny"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `text-sm uppercase tracking-[0.2em] ${
                    isActive ? 'text-brand-ink font-normal' : 'text-brand-muted'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Huvudinnehåll */}
      <main className="flex-1">{children}</main>

      {/* Luftig sidfot i gamla anna-lea.coms anda */}
      <footer className="border-t border-black/[0.08] bg-brand-surface mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10 text-sm">
          {/* Ateljé */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.2em] text-brand-ink mb-3">
              {contact.studioTitle || 'Ateljé'}
            </h3>
            <p className="text-brand-muted">{contact.addressLine1}</p>
            <p className="text-brand-muted">{contact.addressLine2}</p>
          </div>

          {/* Kontakt */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.2em] text-brand-ink mb-3">Kontakt</h3>
            {contact.email && (
              <p>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-brand-muted hover:text-brand-ink transition-colors"
                >
                  {contact.email}
                </a>
              </p>
            )}
            {contact.phone && (
              <p>
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  className="text-brand-muted hover:text-brand-ink transition-colors"
                >
                  {contact.phone}
                </a>
              </p>
            )}
            {contact.instagramUrl && (
              <p className="pt-1">
                <a
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-ink transition-colors"
                >
                  <Instagram className="w-4 h-4" strokeWidth={1.5} />
                  <span>Instagram</span>
                </a>
              </p>
            )}
          </div>

          {/* Information */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.2em] text-brand-ink mb-3">Information</h3>
            <ul className="space-y-2 text-brand-muted">
              <li>
                <Link to="/info/bestallning-och-storlek" className="hover:text-brand-ink transition-colors">
                  Beställning och storlek
                </Link>
              </li>
              <li>
                <Link to="/info/returer" className="hover:text-brand-ink transition-colors">
                  Returer
                </Link>
              </li>
              <li>
                <Link to="/info/allmanna-villkor" className="hover:text-brand-ink transition-colors">
                  Allmänna villkor
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-black/[0.06]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between text-xs text-brand-muted">
            <span>{contact.copyright || '© Anna-Lea AB'}</span>
            <Link
              to="/admin"
              className="opacity-50 hover:opacity-100 transition-opacity tracking-wider uppercase"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
