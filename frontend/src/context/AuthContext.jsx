// AuthContext — holds the current user + token, persists to localStorage,
// and wires the token into the API client.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  login as apiLogin,
  register as apiRegister,
  googleLogin as apiGoogleLogin,
  setAuthToken,
  setUnauthorizedHandler,
} from '../lib/api.js';

const STORAGE_KEY = 'ait-auth';
const AuthContext = createContext(null);

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = loadStored();
    if (stored?.token) setAuthToken(stored.token);
    return stored;
  });

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }, []);

  const applyAuth = useCallback((res) => {
    const next = { token: res.token, user: res.user };
    setAuthToken(next.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuth(next);
    return next;
  }, []);

  const login = useCallback(
    async (username, password) => applyAuth(await apiLogin(username, password)),
    [applyAuth]
  );

  const register = useCallback(
    async (name, email, password) => applyAuth(await apiRegister(name, email, password)),
    [applyAuth]
  );

  const loginWithGoogle = useCallback(
    async (credential) => applyAuth(await apiGoogleLogin(credential)),
    [applyAuth]
  );

  // Auto-logout when the API client sees an expired/invalid token.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    isAdmin: auth?.user?.role === 'admin',
    login,
    register,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
