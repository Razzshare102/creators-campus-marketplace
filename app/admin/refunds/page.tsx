'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatPrice } from '@/lib/catalog';
import type { Order, Refund } from '@/lib/types';

interface RefundWithOrder extends Refund {
  orderNumber: string;
  customerId: string | null;
}

function statusBadge(status: string): string {
  if (status === 'approved') return 'badge badge-green';
  if (status === 'completed') return 'badge badge-blue';
  if (status === 'rejected') return 'badge badge-red';
  return 'badge badge-amber';
}

export default function AdminRefundsPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [refunds, setRefunds] = useState<RefundWithOrder[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const supabase = getSupabase();
    const [refundRes, orderRes] = await Promise.all([
      supabase.from('refunds').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, order_number, user_id'),
    ]);
    if (refundRes.error) {
      setError(refundRes.error.message);
      setFetching(false);
      return;
    }
    if (orderRes.error) setError(orderRes.error.message);
    const orderById: Record<string, { order_number: string; user_id: string }> = {};
    (((orderRes.data as Pick<Order, 'id' | 'order_number' | 'user_id'>[] | null) ?? [])).forEach((o) => {
      orderById[o.id] = { order_number: o.order_number, user_id: o.user_id };
    });
    setRefunds(
      (((refundRes.data as Refund[] | null) ?? [])).map((r) => ({
        ...r,
        orderNumber: orderById[r.order_id]?.order_number ?? r.order_id,
        customerId: orderById[r.order_id]?.user_id ?? null,
      })),
    );
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const num = orderNumber.trim();
    const amt = Number(amount);
    if (!num) {
      setError('Order number is required.');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('order_number', num)
      .single();
    if (orderErr || !orderData) {
      setError(orderErr?.message ?? `No order found with number ${num}.`);
      setSaving(false);
      return;
    }
    const order = orderData as Pick<Order, 'id' | 'order_number'>;
    const { error: insErr } = await supabase.from('refunds').insert({
      order_id: order.id,
      amount: amt,
      reason: reason.trim() || null,
      status: 'pending',
    });
    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: 'refund_create',
      details: { order_id: order.id, order_number: order.order_number, amount: amt, reason: reason.trim() || null },
    });
    setNotice(`Refund of ${formatPrice(amt)} created for order ${order.order_number} (pending).`);
    setOrderNumber('');
    setAmount('');
    setReason('');
    await load();
    setSaving(false);
  }

  async function setStatus(r: RefundWithOrder, status: 'approved' | 'rejected' | 'completed') {
    if (!user) return;
    setActingId(r.id);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { error: err } = await supabase.from('refunds').update({ status }).eq('id', r.id);
    if (err) {
      setError(err.message);
      setActingId(null);
      return;
    }
    if (status === 'approved') {
      await supabase.from('orders').update({ status: 'refunded' }).eq('id', r.order_id);
      if (r.customerId) {
        await supabase.from('notifications').insert({
          user_id: r.customerId,
          title: `Refund approved for order ${r.orderNumber}`,
          body: `A refund of ${formatPrice(r.amount)} for order ${r.orderNumber} has been approved.`,
          link: `/dashboard/orders/${r.order_id}`,
          read: false,
        });
      }
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: `refund_${status}`,
      details: { refund_id: r.id, order_number: r.orderNumber, amount: r.amount },
    });
    setNotice(`Refund for order ${r.orderNumber} marked ${status}.`);
    await load();
    setActingId(null);
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Refunds</h1>
      <p className="muted">Approve a refund also marks the order as refunded and notifies the customer.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="card mb-3">
        <h3>New refund</h3>
        <form onSubmit={createRefund}>
          <div className="form-row">
            <label className="label" htmlFor="refund-order-number">Order number</label>
            <input
              id="refund-order-number"
              className="input"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. CC-1001"
              required
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="refund-amount">Amount ($)</label>
            <input
              id="refund-amount"
              className="input"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="refund-reason">Reason</label>
            <textarea
              id="refund-reason"
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being refunded?"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create refund'}
          </button>
        </form>
      </div>

      {fetching ? (
        <p className="muted">Loading refunds…</p>
      ) : refunds.length === 0 ? (
        <p className="notice">No refunds yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.orderNumber}</strong></td>
                  <td>{formatPrice(r.amount)}</td>
                  <td className="small">{r.reason ?? '—'}</td>
                  <td><span className={statusBadge(r.status)}>{r.status}</span></td>
                  <td className="small">{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <div className="flex flex-wrap">
                      {r.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => setStatus(r, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => setStatus(r, 'rejected')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          disabled={actingId === r.id}
                          onClick={() => setStatus(r, 'completed')}
                        >
                          Mark completed
                        </button>
                      )}
                    </div>
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
