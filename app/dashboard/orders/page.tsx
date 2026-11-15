'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ORDER_STATUS_LABELS, formatPrice } from '@/lib/catalog';
import type { Order } from '@/lib/types';

function orderStatusBadgeClass(status: string): string {
  if (status === 'completed') return 'badge-green';
  if (status === 'awaiting_verification') return 'badge-amber';
  if (status === 'cancelled' || status === 'refunded') return 'badge-red';
  if (status === 'verified' || status === 'delivering') return 'badge-blue';
  return 'badge-gray';
}

export default function OrdersPage() {
  const { user, loading, configured } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    setLoadingOrders(true);
    getSupabase()
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: qError }) => {
        setLoadingOrders(false);
        if (qError) {
          setError('Could not load your orders. Please try again.');
          return;
        }
        setOrders((data as Order[] | null) ?? []);
      });
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
        <h1>My orders</h1>
        <p className="notice">Connect Supabase to use this feature — orders need Supabase connected.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <h1>My orders</h1>
        <p className="notice">
          Please <Link href="/auth/login">log in</Link> to view your orders.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>My orders</h1>
      {error && <p className="error">{error}</p>}
      {loadingOrders ? (
        <p className="muted">Loading orders…</p>
      ) : orders.length === 0 ? (
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
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td>
                    <span className={`badge ${orderStatusBadgeClass(o.status)}`}>
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
      <p className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </div>
  );
}
