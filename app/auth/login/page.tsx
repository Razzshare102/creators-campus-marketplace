'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { signIn, configured, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await signIn(email.trim(), password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    // Honour ?next=/checkout (and friends) when present; default to dashboard.
    let next = '/dashboard';
    try {
      const requested = new URLSearchParams(window.location.search).get('next');
      if (requested && requested.startsWith('/') && !requested.startsWith('//')) next = requested;
    } catch {
      // fall back to dashboard
    }
    router.push(next);
  }

  if (loading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Log in</h1>
      {!configured && (
        <p className="notice">
          Connect Supabase to use this feature — login needs Supabase connected. Add the
          project URL and anon key in .env.local.
        </p>
      )}
      <div className="card" style={{ maxWidth: '480px' }}>
        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          <div className="form-row">
            <label className="label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!configured || busy}
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!configured || busy}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={!configured || busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
      <p className="mt-2">
        Don&apos;t have an account? <Link href="/auth/register">Create one</Link>
      </p>
    </div>
  );
}
