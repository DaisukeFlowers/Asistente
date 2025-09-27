import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Auth design notes:
 * - Uses Authorization Code flow handled by backend (Node/Express).
 * - Backend sets an httpOnly session cookie after successful /api/auth/google/callback.
 * - Frontend only fetches session state from /api/auth/me; no tokens stored client-side.
 * - Login triggers redirect (or popup in future) to /api/auth/google.
 * - Logout calls /api/auth/logout which clears the session cookie.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // { name, email, picture }
  const [loading, setLoading] = useState(true);

  // Fetch session user
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      if (data.authenticated) setUser(data.user); else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = useCallback(() => {
    window.location.href = '/api/auth/google';
  }, []);

  const fetchCsrf = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token;
    } catch { return null; }
  }, []);

  const logout = useCallback(async () => {
    let csrf = await fetchCsrf();
    const headers = {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers })
      .catch(() => {})
      .finally(() => { setUser(null); navigate('/'); });
  }, [navigate, fetchCsrf]);

  const value = {
    user,
    loading,
    login,
  logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
