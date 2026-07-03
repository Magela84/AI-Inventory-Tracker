// Login — polished split-screen sign-in / create-account screen with Google option.
import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { useAuth } from '../context/AuthContext.jsx';
import { GOOGLE_CLIENT_ID } from '../lib/api.js';

const FEATURES = [
  'AI Copilot that reorders & answers questions',
  'Demand forecasting with stock-runway alerts',
  'Suppliers & purchase-order workflow',
  'Anomaly detection + full audit trail',
];

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignup) await register(name.trim(), email.trim(), password);
      else await login(identifier.trim(), password);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(credentialResponse) {
    setError(null);
    try {
      await loginWithGoogle(credentialResponse.credential);
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  }

  const field =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none';
  const label = 'mb-1 block text-xs font-medium text-gray-600';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        {/* Brand / hero panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white md:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <path d="M3.27 6.96 12 12.01l8.73-5.05" />
                <path d="M12 22.08V12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">AI Inventory Tracker</h1>
            <p className="mt-2 max-w-xs text-sm text-blue-100">
              Smart inventory management — forecasting, procurement, and an AI copilot in one place.
            </p>
          </div>

          <ul className="relative mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-blue-50">
                <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <p className="relative mt-8 text-xs text-blue-200/80">
            Powered by Azure Cosmos DB · Azure OpenAI (GPT-4o)
          </p>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          {/* Compact brand for small screens */}
          <div className="mb-6 md:hidden">
            <h1 className="text-xl font-bold text-gray-900">AI Inventory Tracker</h1>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            {isSignup ? 'Sign up to get started.' : 'Sign in to continue.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignup && (
              <div>
                <label className={label} htmlFor="name">Name</label>
                <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
            )}

            {isSignup ? (
              <div>
                <label className={label} htmlFor="email">Email</label>
                <input id="email" type="email" className={field} placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            ) : (
              <div>
                <label className={label} htmlFor="identifier">Username or email</label>
                <input id="identifier" className={field} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus />
              </div>
            )}

            <div>
              <label className={label} htmlFor="password">Password</label>
              <input id="password" type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="mt-5">
              <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="flex justify-center">
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                  <GoogleLogin onSuccess={handleGoogle} onError={() => setError('Google sign-in failed')} width="320" />
                </GoogleOAuthProvider>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-gray-500">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? 'signin' : 'signup');
                setError(null);
              }}
              className="font-semibold text-blue-600 hover:underline"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>

          {!isSignup && (
            <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-3 text-center text-xs text-gray-500">
              <span className="font-medium text-gray-600">Demo:</span> admin / admin123 &nbsp;·&nbsp; staff / staff123
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
