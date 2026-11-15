'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { signUp, configured, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    const res = await signUp(email.trim(), password, fullName.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCreated(true);
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
      <h1>Create an account</h1>
      {!configured && (
        <p className="notice">
          Connect Supabase to use this feature — registration needs Supabase connected.
          Add the project URL and anon key in .env.local.
        </p>
      )}
      {created ? (
        <div className="card" style={{ maxWidth: '480px' }}>
          <p className="success">Account created — check your email to confirm, then log in.</p>
          <Link href="/auth/login" className="btn btn-primary">
            Go to login
          </Link>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: '480px' }}>
          <form onSubmit={handleSubmit}>
            {error && <p className="error">{error}</p>}
            <div className="form-row">
              <label className="label" htmlFor="register-name">
                Full name
              </label>
              <input
                id="register-name"
                className="input"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!configured || busy}
              />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!configured || busy}
              />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                className="input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!configured || busy}
              />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="register-confirm">
                Confirm password
              </label>
              <input
                id="register-confirm"
                className="input"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!configured || busy}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={!configured || busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      )}
      <p className="mt-2">
        Already have an account? <Link href="/auth/login">Log in</Link>
      </p>
    </div>
  );
}
