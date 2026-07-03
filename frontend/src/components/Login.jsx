// Login — sign-in / create-account screen with optional Google sign-in.
import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { useAuth } from '../context/AuthContext.jsx';
import { GOOGLE_CLIENT_ID } from '../lib/api.js';

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // username or email (sign in)
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
      if (isSignup) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(identifier.trim(), password);
      }
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
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';
  const label = 'mb-1 block text-xs font-medium text-gray-600';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">AI Inventory Tracker</h1>
        <p className="mb-6 text-sm text-gray-500">
          {isSignup ? 'Create your account.' : 'Sign in to continue.'}
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
              <input
                id="email"
                type="email"
                className={field}
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className={label} htmlFor="identifier">Username or email</label>
              <input
                id="identifier"
                className={field}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div>
            <label className={label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Google sign-in (only when configured) */}
        {GOOGLE_CLIENT_ID && (
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="flex justify-center">
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <GoogleLogin onSuccess={handleGoogle} onError={() => setError('Google sign-in failed')} />
              </GoogleOAuthProvider>
            </div>
          </div>
        )}

        {/* Toggle sign in / sign up */}
        <p className="mt-6 text-center text-xs text-gray-500">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? 'signin' : 'signup');
              setError(null);
            }}
            className="font-medium text-blue-600 hover:underline"
          >
            {isSignup ? 'Sign in' : 'Create one'}
          </button>
        </p>

        {!isSignup && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            <p className="font-medium text-gray-600">Demo credentials</p>
            <p>admin / admin123 &nbsp;·&nbsp; staff / staff123</p>
          </div>
        )}
      </div>
    </div>
  );
}
