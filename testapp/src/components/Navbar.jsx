import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n, LanguageSwitcher } from '../i18n/I18nProvider.jsx';
import { isDraftLegal } from '../legal/legalMeta.js';

// Top navigation bar with site links. Adjust links or add CTA buttons as needed.
export function Navbar() {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkBase = 'px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition relative after:absolute after:left-3 after:-bottom-0.5 after:h-0.5 after:w-0 after:bg-brand-500 after:transition-all hover:after:w-[calc(100%-1.5rem)]';
  const active = 'text-slate-900 after:w-[calc(100%-1.5rem)]';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur transition-colors ${scrolled ? 'bg-white/90 shadow-sm border-b border-slate-200/80' : 'bg-white/60 border-b border-transparent'}`}> 
      <div className="mx-auto max-w-6xl px-4 flex items-center h-16 gap-6">
        <Link to="/" className="shrink-0"><Logo /></Link>
        <nav className="flex items-center gap-1 flex-1">
          <NavLink to="/" end className={({isActive}) => `${linkBase} ${isActive?active:''}`}>{t.nav.home}</NavLink>
          <NavLink to="/privacy" className={({isActive}) => `${linkBase} ${isActive?active:''}`}>{t.nav.privacy}</NavLink>
          <NavLink to="/terms" className={({isActive}) => `${linkBase} ${isActive?active:''}`}>{t.nav.terms}</NavLink>
          <NavLink to="/contact" className={({isActive}) => `${linkBase} ${isActive?active:''}`}>{t.nav.contact}</NavLink>
          {isDraftLegal() && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-400">Draft</span>}
        </nav>
        <LanguageSwitcher className="hidden sm:flex" />
        {isAuthenticated && (
          <Link to="/dashboard" className="btn-primary hidden sm:inline-flex">{t.nav.dashboard}</Link>
        )}
      </div>
    </header>
  );
}
