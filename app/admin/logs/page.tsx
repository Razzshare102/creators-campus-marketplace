'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ActivityLog, Profile } from '@/lib/types';

export default function AdminLogsPage() {
  const { loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [emailByAdminId, setEmailByAdminId] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const supabase = getSupabase();
    const [logRes, profRes] = await Promise.all([
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id, email'),
    ]);
    if (logRes.error) {
      setError(logRes.error.message);
      setFetching(false);
      return;
    }
    if (profRes.error) setError(profRes.error.message);
    const map: Record<string, string> = {};
    (((profRes.data as Pick<Profile, 'id' | 'email'>[] | null) ?? [])).forEach((p) => {
      map[p.id] = p.email;
    });
    setEmailByAdminId(map);
    setLogs((logRes.data as ActivityLog[]) ?? []);
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;

  return (
    <div>
      <h1>Activity logs</h1>
      <p className="muted">Latest 100 admin actions, newest first.</p>
      {error && <p className="error">{error}</p>}
      {fetching ? (
        <p className="muted">Loading logs…</p>
      ) : logs.length === 0 ? (
        <p className="notice">No activity logged yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="small">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="small">
                    {log.admin_id ? emailByAdminId[log.admin_id] ?? log.admin_id : '—'}
                  </td>
                  <td><span className="badge badge-blue">{log.action}</span></td>
                  <td className="small">
                    {log.details ? JSON.stringify(log.details) : '—'}
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
