'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { NotificationItem } from '@/lib/types';

export default function NotificationsPage() {
  const { user, loading, configured } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    setLoadingList(true);
    const { data, error: qError } = await getSupabase()
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLoadingList(false);
    if (qError) {
      setError('Could not load your notifications. Please try again.');
      return;
    }
    setNotifications((data as NotificationItem[] | null) ?? []);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAllAsRead() {
    if (!user) return;
    setMarkBusy(true);
    const { error: updateError } = await getSupabase()
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setMarkBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (loading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="container">
        <h1>Notifications</h1>
        <p className="notice">Connect Supabase to use this feature — notifications need Supabase connected.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Notifications</h1>
        <p className="notice">
          Please <Link href="/auth/login">log in</Link> to view your notifications.
        </p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container">
      <div className="flex-between">
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={markAllAsRead} disabled={markBusy || unreadCount === 0}>
          {markBusy ? 'Marking…' : 'Mark all as read'}
        </button>
      </div>
      {error && <p className="error mt-2">{error}</p>}
      {loadingList ? (
        <p className="muted mt-2">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <p className="muted mt-2">You have no notifications yet.</p>
      ) : (
        <div className="mt-2">
          {notifications.map((n) => (
            <div key={n.id} className="card mb-2">
              <div className="flex-between">
                {!n.read && <span className="badge badge-blue">Unread</span>}
                <span className="muted small">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <h3 className="mt-1">
                {n.link ? (
                  <a href={n.link}>{n.title}</a>
                ) : (
                  n.title
                )}
              </h3>
              <p style={{ marginBottom: 0 }}>{n.body}</p>
              {n.link && (
                <p className="mt-1" style={{ marginBottom: 0 }}>
                  <a href={n.link}>View details</a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </div>
  );
}
