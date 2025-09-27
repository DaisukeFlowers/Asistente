import React from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useLegalAcceptance } from '../auth/LegalAcceptanceContext.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from '../components/Footer.jsx';
import { SkipNavLink } from '../components/SkipNavLink.jsx';
import { OnboardingChecklist } from '../components/OnboardingChecklist.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const legal = useLegalAcceptance();
  const { t } = useI18n();

  const needsAcceptance = legal && !legal.loading && (!!user) && (!legal.acceptedPrivacy || !legal.acceptedTerms);

  return (
  <div className="flex flex-col min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-100">
    <SkipNavLink />
      <Navbar />
  <main id="main" className="flex-1" tabIndex={-1}>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="card p-8 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-0 md:opacity-60 bg-[radial-gradient(circle_at_75%_20%,rgba(59,130,246,0.12),transparent_70%)]" />
            <h2 className="relative text-2xl font-semibold mb-6 tracking-tight">{t.dashboard.title}</h2>
            {user ? (
              <>
                <div className="flex flex-col items-center gap-4">
                  {user.picture && <img src={user.picture} alt={user.name} width={96} height={96} className="rounded-full shadow" />}
                  <div>
                    <p className="font-medium text-lg">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
                {needsAcceptance && (
                  <div className="mt-8 w-full text-left p-4 border border-amber-300 bg-amber-50 rounded">
                    <h2 className="font-semibold mb-2 text-amber-900 text-sm">Legal Updates Require Your Review</h2>
                    <ul className="text-xs list-disc pl-5 mb-3 text-amber-900 space-y-1">
                      {!legal.acceptedPrivacy && <li>Privacy Policy v{legal.privacyVersion} pending acceptance</li>}
                      {!legal.acceptedTerms && <li>Terms of Service v{legal.termsVersion} pending acceptance</li>}
                    </ul>
                    <div className="flex gap-2 flex-wrap text-xs">
                      {!legal.acceptedPrivacy && <button onClick={() => legal.accept('privacy')} className="btn-primary">Accept Privacy Policy</button>}
                      {!legal.acceptedTerms && <button onClick={() => legal.accept('terms')} className="btn-primary">Accept Terms</button>}
                      <a href="/privacy" className="underline text-amber-800">View Privacy Policy</a>
                      <a href="/terms" className="underline text-amber-800">View Terms</a>
                    </div>
                  </div>
                )}
                <div className="mt-8 text-left w-full space-y-6">
                  <div className="border border-slate-200 rounded-md p-4 text-sm bg-white/70">
                    <p className="font-semibold mb-1 text-slate-700">{t.permissions.title}</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li>{t.permissions.scopes.openid}</li>
                      <li>{t.permissions.scopes.calendar}</li>
                    </ul>
                    <p className="mt-2 text-xs text-slate-500">{t.permissions.revocation} <a className="text-brand-600 underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">{t.permissions.revokeLinkLabel}</a>.</p>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="font-semibold text-slate-700 text-xs tracking-wide mb-1">{t.permissions.revocationStepsHeading}</p>
                      <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-xs">
                        {t.permissions.revocationSteps?.map((s,i) => <li key={i}>{s}</li>)}
                      </ol>
                      <p className="mt-2 text-[11px] text-slate-500 italic">{t.permissions.revocationNote}</p>
                    </div>
                  </div>
                  {!needsAcceptance && (
                    <OnboardingChecklist
                      items={[
                        { id: 'legal', label: 'Review & accept legal documents', done: true },
                        { id: 'profile', label: 'Confirm profile info appears correctly', done: true },
                        { id: 'calendarList', label: 'List your calendars', done: false },
                        { id: 'createEvent', label: 'Create a test calendar event (coming soon)', done: false },
                        { id: 'configurePrefs', label: 'Set scheduling preferences (coming soon)', done: false }
                      ]}
                    />
                  )}
                  <button onClick={logout} className="btn-primary bg-rose-600 hover:bg-rose-700 shadow-md">{t.dashboard.logout}</button>
                </div>
              </>
            ) : (
              <p className="text-slate-500">{t.dashboard.notAuth}</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
