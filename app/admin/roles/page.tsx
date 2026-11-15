'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const ROLES: Profile['role'][] = ['customer', 'support', 'admin'];

function roleBadge(role: string): string {
  if (role === 'admin') return 'badge badge-red';
  if (role === 'support') return 'badge badge-blue';
  return 'badge badge-gray';
}

const PERMISSIONS: { capability: string; customer: boolean; support: boolean; admin: boolean }[] = [
  { capability: 'Browse and buy products', customer: true, support: true, admin: true },
  { capability: 'View own orders and tickets', customer: true, support: true, admin: true },
  { capability: 'View all orders', customer: false, support: true, admin: true },
  { capability: 'Verify payments', customer: false, support: false, admin: true },
  { capability: 'Deliver orders', customer: false, support: false, admin: true },
  { capability: 'View all tickets', customer: false, support: true, admin: true },
  { capability: 'Reply to tickets', customer: false, support: true, admin: true },
  { capability: 'Manage products, categories, plans and coupons', customer: false, support: false, admin: true },
  { capability: 'Manage stock and suppliers', customer: false, support: false, admin: true },
  { capability: 'Manage refunds', customer: false, support: false, admin: true },
  { capability: 'View reports and activity logs', customer: false, support: false, admin: true },
  { capability: 'Change site and payment settings', customer: false, support: false, admin: true },
  { capability: 'Change user roles', customer: false, support: false, admin: true },
];

function Check({ allowed }: { allowed: boolean }) {
  return allowed ? <span className="badge badge-green">Yes</span> : <span className="badge badge-gray">No</span>;
}

export default function AdminRolesPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Profile['role']>('support');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const { data, error: err } = await getSupabase()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setProfiles((data as Profile[]) ?? []);
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyRole(profileId: string, oldRole: Profile['role'], newRole: Profile['role'], emailForLog: string) {
    if (!user || newRole === oldRole) return;
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { error: err } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: 'role_change',
      details: { user_id: profileId, email: emailForLog, old_role: oldRole, new_role: newRole },
    });
    setProfiles((prev) => prev.map((x) => (x.id === profileId ? { ...x, role: newRole } : x)));
    setNotice(`Role for ${emailForLog} changed to ${newRole}.`);
  }

  async function saveByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Email is required.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', targetEmail)
      .single();
    if (err || !data) {
      setError(err?.message ?? `No profile found for ${targetEmail}.`);
      setSaving(false);
      return;
    }
    const p = data as Profile;
    await applyRole(p.id, p.role, role, p.email);
    setSaving(false);
    await load();
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Roles &amp; permissions</h1>
      <p className="muted">What each role can do, and who currently holds each role. Role changes are logged.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <h2>Permission matrix</h2>
      <div className="table-wrap mb-3">
        <table className="table">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Customer</th>
              <th>Support</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((row) => (
              <tr key={row.capability}>
                <td>{row.capability}</td>
                <td><Check allowed={row.customer} /></td>
                <td><Check allowed={row.support} /></td>
                <td><Check allowed={row.admin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted mb-3">
        Admins can do everything. Support can view and reply to tickets and view orders, but cannot
        verify payments, deliver orders, manage the catalog or settings, or change roles. Customers
        can shop and manage only their own orders and tickets.
      </p>

      <div className="card mb-3">
        <h3>Change a user&apos;s role</h3>
        <form onSubmit={saveByEmail}>
          <div className="form-row">
            <label className="label" htmlFor="role-email">User email</label>
            <input
              id="role-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="role-select">New role</label>
            <select
              id="role-select"
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as Profile['role'])}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save role'}
          </button>
        </form>
      </div>

      <h2>All users</h2>
      {fetching ? (
        <p className="muted">Loading users…</p>
      ) : profiles.length === 0 ? (
        <p className="notice">No users found.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Full name</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Change role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.email}</td>
                  <td>{p.full_name ?? '—'}</td>
                  <td><span className={roleBadge(p.role)}>{p.role}</span></td>
                  <td className="small">{new Date(p.created_at).toLocaleString()}</td>
                  <td>
                    <select
                      className="select"
                      value={p.role}
                      onChange={(e) => applyRole(p.id, p.role, e.target.value as Profile['role'], p.email)}
                      aria-label={`Change role for ${p.email}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
