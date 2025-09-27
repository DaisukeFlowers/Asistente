import React from 'react';
import { Link } from 'react-router-dom';
import { GoogleSignInButton } from '../auth/GoogleSignInButton.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { SkipNavLink } from '../components/SkipNavLink.jsx';
import { Footer } from '../components/Footer.jsx';
import { FeatureCard } from '../components/FeatureCard.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

// Home (Landing) page: Minimal, audit‑friendly. Keep copy factual; avoid marketing hype.
export default function Home() {
  const { t, lang } = useI18n();
  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100 relative">
      <SkipNavLink />
      <Navbar />
      {/* Subtle radial accent for depth; adjust/remove if stricter corporate aesthetic desired. */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_center,black_60%,transparent)] bg-hero-gradient" aria-hidden="true" />

  <main id="main" className="flex-1" tabIndex={-1}>
        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-24">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left: Core identity & sign-in */}
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-600 text-white font-semibold flex items-center justify-center shadow-md text-xl">S</div>
                  <h1 className="m-0 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Schedulink</h1>
                </div>
                <p className="text-lg font-medium text-slate-800">{t.hero.tagline}</p>
                <p className="mt-4 text-slate-600 max-w-prose leading-relaxed">{t.hero.description}</p>
                <div className="mt-8">
                  {/* Official Google Sign-In button (must remain unstyled) */}
                  <GoogleSignInButton />
                </div>
                <p className="mt-6 text-xs text-slate-500 max-w-md">{t.hero.compliance}</p>
                <div className="mt-6 space-y-2 text-[11px] leading-relaxed text-slate-600 max-w-md border border-slate-200 rounded-md p-3 bg-white/70">
                  <p className="font-semibold text-slate-700">{t.permissions.title}</p>
                  <p>{t.permissions.intro}</p>
                  <p className="font-medium text-slate-700">{t.permissions.scopesHeading}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>{t.permissions.scopes.openid}</li>
                    <li>{t.permissions.scopes.calendar}</li>
                  </ul>
                  <p>{t.permissions.revocation} <a className="text-brand-600 underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">{t.permissions.revokeLinkLabel}</a>.</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-4 text-sm">
                  <Link to="/privacy" className="link-underline">{lang==='es' ? 'Política de Privacidad' : 'Privacy Policy'}</Link>
                  <Link to="/terms" className="link-underline">{lang==='es' ? 'Términos' : 'Terms'}</Link>
                  <Link to="/contact" className="link-underline">{lang==='es' ? 'Soporte' : 'Support'}</Link>
                </div>
              </div>

              {/* Right: Placeholder illustration / replace with product screenshot later */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-white/80 ring-1 ring-slate-200 shadow-[0_8px_40px_-10px_rgba(0,0,0,0.10)] flex items-center justify-center p-6">
                  <div className="text-center max-w-xs">
                    <div className="mx-auto h-16 w-16 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-white font-bold flex items-center justify-center text-2xl shadow-lg">S</div>
                    <p className="mt-5 text-sm font-medium text-slate-700">{lang==='es' ? 'Capa de conectividad de programación.' : 'Scheduling connectivity layer.'}</p>
                    <ul className="mt-4 text-left text-xs text-slate-600 space-y-2 list-disc list-inside">
                      <li>{lang==='es' ? 'Sincronización de calendario' : 'Calendar sync'}</li>
                      <li>{lang==='es' ? 'Disparadores de chat' : 'Chat triggers'}</li>
                      <li>{lang==='es' ? 'Actualizaciones de eventos' : 'Event updates'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features (exact 3 minimal cards) */}
        <section className="relative border-t border-slate-200/70 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="max-w-xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">{t.featuresTitle}</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard title={t.features.automated.title}>{t.features.automated.body}</FeatureCard>
              <FeatureCard title={t.features.reminders.title}>{t.features.reminders.body}</FeatureCard>
              <FeatureCard title={t.features.secure.title}>{t.features.secure.body}</FeatureCard>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
