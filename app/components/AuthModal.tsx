// components/AuthModal.tsx (update the sign out handling)
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Shield, LogOut } from 'lucide-react';

interface AuthModalProps {
  theme: 'light' | 'dark';
  onSuccess: () => void;
  onSignOut?: () => void;
}

const ADMIN_EMAIL = 'melvin@outdoorequipped.com';

export default function AuthModal({ theme, onSuccess, onSignOut }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const isDark = theme === 'dark';

  // Check if user is already signed in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setIsSignedIn(true);
        setUserEmail(user.email);
        setIsAdmin(user.email === ADMIN_EMAIL);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    setIsAdmin(email === ADMIN_EMAIL);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for verification link!');
        // Don't call onSuccess for signup - they need to verify email
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      // Clear session
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      setIsSignedIn(false);
      setUserEmail('');
      setEmail('');
      setPassword('');
      if (onSignOut) onSignOut();
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  // If user is already signed in, show a different view
  if (isSignedIn) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isDark ? 'bg-[#0F172A]' : 'bg-gray-100'
      }`}>
        <div className={`relative w-full max-w-md rounded-2xl border p-8 shadow-2xl ${
          isDark ? 'border-slate-700 bg-slate-900/95' : 'border-gray-200 bg-white/95'
        }`}>
          <div className="text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
              isAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-emerald-500'
            }`}>
              {isAdmin ? (
                <Shield className="h-8 w-8 text-white" />
              ) : (
                <span className="text-2xl font-bold text-white">LOT</span>
              )}
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isAdmin ? '👑 Admin Session' : 'Already Signed In'}
            </h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Signed in as <span className="font-semibold text-emerald-400">{userEmail}</span>
            </p>
            {isAdmin && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                <Shield className="h-3 w-3" />
                Admin Access
              </div>
            )}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => window.location.href = '/'}
                className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 font-semibold transition-colors disabled:opacity-50 ${
                  isDark 
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal login form (existing code)
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isDark ? 'bg-[#0F172A]' : 'bg-gray-100'
    }`}>
      <div className={`relative w-full max-w-md rounded-2xl border p-8 shadow-2xl ${
        isDark ? 'border-slate-700 bg-slate-900/95' : 'border-gray-200 bg-white/95'
      }`}>
        <div className="text-center mb-8">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
            isAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-emerald-500'
          }`}>
            {isAdmin ? (
              <Shield className="h-8 w-8 text-white" />
            ) : (
              <span className="text-2xl font-bold text-white">LOT</span>
            )}
          </div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isAdmin ? '👑 Admin Login' : 'Welcome to LOT'}
          </h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            {mode === 'signin' ? 'Sign in to access tools' : 'Create an account to get started'}
          </p>
          {isAdmin && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
              <Shield className="h-3 w-3" />
              Admin Access Granted
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800/90 text-white' 
                  : 'border-gray-300 bg-white/90 text-gray-900'
              }`}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800/90 text-white' 
                  : 'border-gray-300 bg-white/90 text-gray-900'
              }`}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className={`text-sm ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

        <div className={`mt-6 rounded-lg border p-3 ${
          isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
        }`}>
          <p className={`text-center text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            <span className="font-semibold">🔑 Admin Login:</span>{' '}
            <span className="font-mono">{ADMIN_EMAIL}</span>
            <br />
            <span className="opacity-60">(Bypasses maintenance mode)</span>
          </p>
        </div>
      </div>
    </div>
  );
}