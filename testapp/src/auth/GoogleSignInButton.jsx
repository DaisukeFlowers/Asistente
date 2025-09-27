import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

// Renders official Google Identity Services button.
// On click (or automatic callback) we still redirect to server-side /api/auth/google
// for Authorization Code flow (no client secret exposed in frontend).
/**
 * GoogleSignInButton
 * Compliance notes:
 * - Uses Google Identity Services (GIS) rendered button (google.accounts.id.renderButton) without custom CSS overrides.
 * - We do NOT restyle or modify the inner DOM of the official button to preserve branding integrity per Google guidelines.
 * - Only the public OAuth Client ID is exposed (env var VITE_GOOGLE_CLIENT_ID).
 * - Fallback button (shown only if GIS fails to load) intentionally uses neutral styling (not mimicking the official brand) to avoid improper usage of Google brand assets.
 * - Locale passed from current UI language (es/en) to keep consistent messaging.
 */
export function GoogleSignInButton() {
  const { login } = useAuth();
  const { lang } = useI18n();
  const btnRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.REACT_APP_GOOGLE_CLIENT_ID;
  const locale = lang === 'es' ? 'es' : 'en';

  useEffect(() => {
    if (!clientId) return; // no client id = do not load script
    if (window.google && window.google.accounts && window.google.accounts.id) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptLoaded(false);
    document.head.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !btnRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: () => login(), // we ignore credential; rely on backend code flow
      ux_mode: 'popup',
      locale
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'signin_with',
      logo_alignment: 'left'
    });
  }, [scriptLoaded, clientId, login]);

  return (
    <div>
      <div ref={btnRef} data-testid="google-signin-container" />
      {!scriptLoaded && (
        <button onClick={login} style={fallbackStyle} aria-label={locale==='es' ? 'Acceder con Google (modo de respaldo)' : 'Sign in with Google (fallback)'}>
          {locale==='es' ? 'Continuar con Google' : 'Continue with Google'}
        </button>
      )}
    </div>
  );
}

// Neutral (non-branded) fallback styling – avoids mimicking proprietary Google button styling while remaining accessible.
const fallbackStyle = {
  display:'inline-flex',
  alignItems:'center',
  padding:'8px 14px',
  borderRadius:4,
  background:'#f8fafc',
  border:'1px solid #cbd5e1',
  fontSize:14,
  fontWeight:500,
  cursor:'pointer',
  color:'#0f172a'
};
