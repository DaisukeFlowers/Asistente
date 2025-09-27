import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '../legal/legalMeta.js';

/**
 * Tracks whether the current authenticated user has accepted the latest legal document versions.
 * Backend persists accepted versions on the session (temporary until user storage added).
 */
const LegalAcceptanceContext = createContext(null);

export function LegalAcceptanceProvider({ children }) {
  const [state, setState] = useState({ loading: true, acceptedPrivacy: false, acceptedTerms: false, privacyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/legal/acceptance', { credentials: 'include' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setState({ loading: false, ...data });
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const accept = useCallback(async (doc) => {
    await fetch('/api/legal/accept', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: doc }) });
    await refresh();
  }, [refresh]);

  return <LegalAcceptanceContext.Provider value={{ ...state, refresh, accept }}>{children}</LegalAcceptanceContext.Provider>;
}

export function useLegalAcceptance() { return useContext(LegalAcceptanceContext); }
