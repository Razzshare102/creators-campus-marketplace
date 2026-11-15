'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatPrice, ORDER_STATUS_LABELS } from '@/lib/catalog';
import type { Order, Product, Profile } from '@/lib/types';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  awaitingVerification: number;
  totalCustomers: number;
  productsCount: number;
  openTickets: number;
}

function statusBadge(status: string): string {
  switch (status) {
    case 'completed':
    case 'verified':
      return 'badge badge-green';
    case 'awaiting_verification':
    case 'pending_payment':
      return 'badge badge-amber';
    case 'delivering':
      return 'badge badge-blue';
    case 'cancelled':
      return 'badge badge-red';
    default:
      return 'badge badge-gray';
  }
}

export default function AdminDashboardPage() {
  const configured = isSupabaseConfigured();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const supabase = getSupabase();
      try {
        const [ordersRes, customersRes, productsRes, ticketsRes, recentRes, lowRes] =
          await Promise.all([
            supabase.from('orders').select('total,status'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
            supabase.from('products').select('id', { count: 'exact', head: true }),
            supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
            supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(8),
            supabase.from('products').select('*').lt('stock', 10).order('stock', { ascending: true }),
          ]);
        if (ordersRes.error) throw ordersRes.error;
        if (recentRes.error) throw recentRes.error;
        if (lowRes.error) throw lowRes.error;

        const orders = (ordersRes.data ?? []) as { total: number; status: string }[];
        const revenue = orders
          .filter((o) => ['verified', 'delivering', 'completed'].includes(o.status))
          .reduce((sum, o) => sum + Number(o.total || 0), 0);
        setStats({
          totalRevenue: revenue,
          totalOrders: orders.length,
          awaitingVerification: orders.filter((o) => o.status === 'awaiting_verification').length,
          totalCustomers: customersRes.count ?? 0,
          productsCount: productsRes.count ?? 0,
          openTickets: ticketsRes.count ?? 0,
        });

        const recent = (recentRes.data ?? []) as Order[];
        setRecentOrders(recent);
        const userIds = [...new Set(recent.map((o) => o.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id,email').in('id', userIds);
          const map: Record<string, string> = {};
          ((profiles ?? []) as Profile[]).forEach((p) => {
            map[p.id] = p.email;
          });
          setEmails(map);
        }
        setLowStock((lowRes.data ?? []) as Product[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [configured]);

  if (!configured) {
    return (
      <div>
        <h1>Admin Dashboard</h1>
        <p className="notice">Connect Supabase to use the admin.</p>
      </div>
    );
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <div className="stat-grid mb-3">
        <div className="card stat-card">
          <div className="stat-value">{formatPrice(stats?.totalRevenue ?? 0)}</div>
          <div className="stat-label">Total revenue</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.totalOrders ?? 0}</div>
          <div className="stat-label">Total orders</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.awaitingVerification ?? 0}</div>
          <div className="stat-label">Awaiting verification</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.totalCustomers ?? 0}</div>
          <div className="stat-label">Total customers</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.productsCount ?? 0}</div>
          <div className="stat-label">Products</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.openTickets ?? 0}</div>
          <div className="stat-label">Open tickets</div>
        </div>
      </div>

      <h2>Recent orders</h2>
      {recentOrders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <div className="table-wrap mb-3">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href="/admin/orders">{o.order_number}</Link>
                  </td>
                  <td>{emails[o.user_id] ?? o.user_id}</td>
                  <td>{formatPrice(Number(o.total))}</td>
                  <td>
                    <span className={statusBadge(o.status)}>
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Low stock (under 10)</h2>
      {lowStock.length === 0 ? (
        <p className="muted">No products are low on stock.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock</th>
                <th>Delivery</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    <span className="badge badge-red">{p.stock}</span>
                  </td>
                  <td>{p.delivery_type}</td>
                  <td>
                    <Link href="/admin/products" className="btn btn-outline btn-sm">
                      Manage
                    </Link>
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
