'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatPrice } from '@/lib/catalog';
import type { Order, OrderItem, Refund } from '@/lib/types';

const REVENUE_STATUSES = ['verified', 'delivering', 'completed'];

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminReportsPage() {
  const { loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const supabase = getSupabase();
    const [orderRes, itemRes, refundRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*'),
      supabase.from('refunds').select('*'),
    ]);
    if (orderRes.error) setError(orderRes.error.message);
    else setOrders((orderRes.data as Order[]) ?? []);
    if (itemRes.error) setError((prev) => prev || itemRes.error.message);
    else setItems((itemRes.data as OrderItem[]) ?? []);
    if (refundRes.error) setError((prev) => prev || refundRes.error.message);
    else setRefunds((refundRes.data as Refund[]) ?? []);
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  const revenueOrders = useMemo(
    () => orders.filter((o) => REVENUE_STATUSES.includes(o.status)),
    [orders],
  );

  const totalRevenue = useMemo(
    () => revenueOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    [revenueOrders],
  );

  const refundsTotal = useMemo(
    () =>
      refunds
        .filter((r) => r.status === 'approved' || r.status === 'completed')
        .reduce((sum, r) => sum + (r.amount || 0), 0),
    [refunds],
  );

  const profit = totalRevenue - refundsTotal;

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    revenueOrders.forEach((o) => {
      const month = o.created_at.slice(0, 7);
      const row = map.get(month) ?? { revenue: 0, orders: 0 };
      row.revenue += o.total || 0;
      row.orders += 1;
      map.set(month, row);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, v]) => ({ month, ...v }));
  }, [revenueOrders]);

  const revenueByProduct = useMemo(() => {
    const revenueOrderIds = new Set(revenueOrders.map((o) => o.id));
    const map = new Map<string, { revenue: number; quantity: number }>();
    items
      .filter((it) => revenueOrderIds.has(it.order_id))
      .forEach((it) => {
        const name = it.product_name ?? it.product_id;
        const row = map.get(name) ?? { revenue: 0, quantity: 0 };
        row.revenue += (it.price || 0) * (it.quantity || 0);
        row.quantity += it.quantity || 0;
        map.set(name, row);
      });
    return [...map.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([name, v]) => ({ name, ...v }));
  }, [items, revenueOrders]);

  function downloadCsv() {
    const header = ['order_number', 'date', 'total', 'status'];
    const lines = orders.map((o) =>
      [o.order_number, new Date(o.created_at).toISOString(), o.total, o.status]
        .map(csvCell)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;

  return (
    <div>
      <div className="flex-between mb-2">
        <h1>Reports</h1>
        <button className="btn btn-primary" type="button" onClick={downloadCsv} disabled={orders.length === 0}>
          Download CSV
        </button>
      </div>
      <p className="muted">
        Revenue counts orders with status verified, delivering or completed. Profit here is revenue
        minus refunds — cost data is not tracked, so this is not net profit after costs.
      </p>
      {error && <p className="error">{error}</p>}
      {fetching && <p className="muted">Loading reports…</p>}

      <div className="stat-grid mb-3">
        <div className="card stat-card">
          <div className="stat-value">{formatPrice(totalRevenue)}</div>
          <div className="stat-label">Total revenue</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{formatPrice(refundsTotal)}</div>
          <div className="stat-label">Refunds total (approved + completed)</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{formatPrice(profit)}</div>
          <div className="stat-label">Profit (revenue − refunds)</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{revenueOrders.length}</div>
          <div className="stat-label">Revenue orders</div>
        </div>
      </div>

      <h2>Revenue by month</h2>
      {revenueByMonth.length === 0 ? (
        <p className="notice">No revenue yet.</p>
      ) : (
        <div className="table-wrap mb-3">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {revenueByMonth.map((row) => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td>{row.orders}</td>
                  <td>{formatPrice(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Revenue by product</h2>
      {revenueByProduct.length === 0 ? (
        <p className="notice">No revenue by product yet.</p>
      ) : (
        <div className="table-wrap mb-3">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {revenueByProduct.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.quantity}</td>
                  <td>{formatPrice(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>All orders</h2>
      <p className="small muted">The CSV download contains this same list (order number, date, total, status).</p>
      {orders.length === 0 ? (
        <p className="notice">No orders yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.order_number}</strong></td>
                  <td className="small">{new Date(o.created_at).toLocaleString()}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td><span className="badge badge-gray">{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
