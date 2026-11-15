'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ORDER_STATUS_LABELS, formatPrice } from '@/lib/catalog';
import type { Order } from '@/lib/types';

function statusBadgeClass(status: string): string {
  if (status === 'completed') return 'badge-green';
  if (status === 'awaiting_verification') return 'badge-amber';
  if (status === 'cancelled' || status === 'refunded') return 'badge-red';
  if (status === 'verified' || status === 'delivering') return 'badge-blue';
  return 'badge-gray';
}

export default function DashboardPage() {
  const { user, profile, loading, configured } = useAuth();
  const [totalOrders, setTotalOrders] = useState(0);
  const [awaitingCount, setAwaitingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const supabase = getSupabase();
    async function load() {
      const [total, awaiting, completed, tickets, unread, recent] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('status', 'awaiting_verification'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('status', 'completed'),
        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .in('status', ['open', 'in_progress']),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('read', false),
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      if (total.error || awaiting.error || completed.error || tickets.error || unread.error || recent.error) {
        setError('Could not load your dashboard. Please try again.');
        return;
      }
      setTotalOrders(total.count ?? 0);
      setAwaitingCount(awaiting.count ?? 0);
      setCompletedCount(completed.count ?? 0);
      setOpenTickets(tickets.count ?? 0);
      setUnreadNotifications(unread.count ?? 0);
      setRecentOrders((recent.data as Order[] | null) ?? []);
    }
    load();
  }, [user]);

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
        <h1>Dashboard</h1>
        <p className="notice">Connect Supabase to use this feature — the dashboard needs Supabase connected.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Dashboard</h1>
        <p className="notice">
          Please <Link href="/auth/login">log in</Link> to view your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
      <p className="muted">{profile?.email ?? user.email}</p>
      {error && <p className="error">{error}</p>}

      <div className="flex flex-wrap mt-2">
        <div className="card" style={{ flex: '1 1 180px' }}>
          <p className="muted small mb-1">Total orders</p>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>{totalOrders}</p>
        </div>
        <div className="card" style={{ flex: '1 1 180px' }}>
          <p className="muted small mb-1">Awaiting verification</p>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>{awaitingCount}</p>
        </div>
        <div className="card" style={{ flex: '1 1 180px' }}>
          <p className="muted small mb-1">Completed</p>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>{completedCount}</p>
        </div>
        <div className="card" style={{ flex: '1 1 180px' }}>
          <p className="muted small mb-1">Open tickets</p>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>{openTickets}</p>
        </div>
      </div>

      <div className="card mt-3">
        <div className="flex-between">
          <h2 style={{ margin: 0 }}>Notifications</h2>
          <Link href="/dashboard/notifications" className="btn btn-outline btn-sm">
            View all
          </Link>
        </div>
        <p className="mt-2" style={{ marginBottom: 0 }}>
          {unreadNotifications === 0
            ? 'No unread notifications.'
            : `You have ${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}.`}
        </p>
      </div>

      <div className="mt-3">
        <div className="flex-between mb-1">
          <h2 style={{ margin: 0 }}>Recent orders</h2>
          <Link href="/dashboard/orders" className="btn btn-outline btn-sm">
            View all orders
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="muted">You have no orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.status)}`}>
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/orders/${o.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap mt-3">
        <Link href="/dashboard/orders" className="btn btn-outline">
          My orders
        </Link>
        <Link href="/dashboard/tickets" className="btn btn-outline">
          Support tickets
        </Link>
        <Link href="/dashboard/notifications" className="btn btn-outline">
          Notifications
        </Link>
      </div>
    </div>
  );
}
