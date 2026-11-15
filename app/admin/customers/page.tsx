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

export default function AdminCustomersPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const supabase = getSupabase();
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const q = search.trim();
    if (q) query = query.ilike('email', `%${q}%`);
    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setProfiles((data as Profile[]) ?? []);
    setFetching(false);
  }, [configured, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(p: Profile, newRole: Profile['role']) {
    if (newRole === p.role) return;
    if (!user) return;
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { error: err } = await supabase.from('profiles').update({ role: newRole }).eq('id', p.id);
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: 'role_change',
      details: { user_id: p.id, email: p.email, old_role: p.role, new_role: newRole },
    });
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, role: newRole } : x)));
    setNotice(`Role for ${p.email} changed to ${newRole}.`);
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Customers</h1>
      <p className="muted">All user profiles. Change a role with the select — the change is logged.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="card mb-2">
        <label className="label" htmlFor="customer-search">Search by email</label>
        <input
          id="customer-search"
          className="input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
        />
      </div>

      {fetching ? (
        <p className="muted">Loading customers…</p>
      ) : profiles.length === 0 ? (
        <p className="notice">No customers found.</p>
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
                      onChange={(e) => changeRole(p, e.target.value as Profile['role'])}
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
      <p className="small muted mt-2">{profiles.length} profile(s).</p>
    </div>
  );
}
