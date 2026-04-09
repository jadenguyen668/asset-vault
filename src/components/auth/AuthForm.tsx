'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, UserPlus, KeyRound } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot';

export function AuthForm() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (view === 'login') {
        const input = email.trim();

        // If input doesn't contain @, treat as admin username login
        if (!input.includes('@')) {
          const res = await fetch('/api/auth/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: input, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Invalid credentials');
          } else {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });
            if (sessionError) { setError(sessionError.message); }
            else { router.push('/library'); router.refresh(); }
          }
        } else {
          // Normal Supabase email login
          const { error } = await supabase.auth.signInWithPassword({ email: input, password });
          if (error) setError(error.message); else { router.push('/library'); router.refresh(); }
        }
      } else if (view === 'signup') {
        if (!email.endsWith('@vng.com.vn')) { setError('Unable to create account. Your email is not authorized.'); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message); else setSuccess('Check your email for a confirmation link.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) setError(error.message); else setSuccess('Check your email for a password reset link.');
      }
    } catch { setError('An unexpected error occurred.'); }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-wider text-white">LIVE <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">ASSET</span></h1>
        <p className="mt-1 text-xs text-dim">Asset Management Platform</p>
      </div>
      <div className="mb-6 flex gap-1 rounded-lg bg-bg p-1">
        {(['login', 'signup', 'forgot'] as AuthView[]).map((v) => (
          <button key={v} onClick={() => { setView(v); setError(''); setSuccess(''); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${view === v ? 'bg-accent text-white' : 'text-dim hover:text-white'}`}>
            {v === 'forgot' ? 'Reset' : v}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type={view === 'login' ? 'text' : 'email'}
          placeholder={view === 'login' ? 'Email or Username' : 'Your work email'}
          value={email} onChange={(e) => setEmail(e.target.value)} required
          autoComplete={view === 'login' ? 'username' : 'email'}
          className="w-full rounded-lg border border-border bg-panel-secondary px-4 py-2.5 text-sm text-text outline-none placeholder:text-dim focus:border-accent" />
        {view !== 'forgot' && (
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
            autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            className="w-full rounded-lg border border-border bg-panel-secondary px-4 py-2.5 text-sm text-text outline-none placeholder:text-dim focus:border-accent" />
        )}
        {error && <p className="rounded-md bg-red/10 px-3 py-2 text-xs text-red">{error}</p>}
        {success && <p className="rounded-md bg-green/10 px-3 py-2 text-xs text-green">{success}</p>}
        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-[#6d4fde] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : view === 'login' ? <LogIn className="h-4 w-4" /> : view === 'signup' ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}
