import React from 'react';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from '../components/Footer.jsx';
import { SkipNavLink } from '../components/SkipNavLink.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

export default function Contact() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <SkipNavLink />
      <Navbar />
      <main id="main" className="flex-1" tabIndex={-1}>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <article className="prose prose-slate max-w-none card p-8">
            <h1>{t.contact.heading}</h1>
            <p>{t.contact.line1} <a href="mailto:support@schedulink.com">support@schedulink.com</a></p>
            <p>{t.contact.line2}</p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
