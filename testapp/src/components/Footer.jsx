import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';

export function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer className="mt-20 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.25),transparent_60%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 grid gap-8 md:grid-cols-2 text-sm">
        <div className="space-y-3">
          <p className="font-semibold text-white">© 2025 Schedulink</p>
          <p className="max-w-md text-slate-400">{t.footer.description}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-6 md:justify-end">
          <Link to="/privacy" className="hover:text-white transition">{lang==='es' ? 'Política de Privacidad' : 'Privacy Policy'}</Link>
          <Link to="/terms" className="hover:text-white transition">{lang==='es' ? 'Términos de Servicio' : 'Terms of Service'}</Link>
          <a href="mailto:support@schedulink.com" className="hover:text-white transition">support@schedulink.com</a>
        </nav>
      </div>
    </footer>
  );
}
