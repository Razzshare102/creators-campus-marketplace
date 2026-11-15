'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { paymentMethodLabel } from '@/lib/catalog';
import type { Order, Payment } from '@/lib/types';

function paymentBadge(status: string): string {
  if (status === 'approved') return 'badge badge-green';
  if (status === 'rejected') return 'badge badge-red';
  return 'badge badge-amber';
}

export default function AdminPaymentsPage() {
  const configured = isSupabaseConfigured();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    const { data, error: err } = await supabase
      .from('payments')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      const list = ((data ?? []) as Payment[]).sort((a, b) => {
        const rank = (s: string) => (s === 'pending' ? 0 : s === 'approved' ? 1 : 2);
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime();
      });
      setPayments(list);
      const orderIds = [...new Set(list.map((p) => p.order_id))];
      if (orderIds.length > 0) {
        const { data: orderRows } = await supabase
          .from('orders')
          .select('*')
          .in('id', orderIds);
        const map: Record<string, Order> = {};
        ((orderRows ?? []) as Order[]).forEach((o) => {
          map[o.id] = o;
        });
        setOrders(map);
      }
    }
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  const logActivity = async (action: string, details: Record<string, unknown>) => {
    if (!user) return;
    await getSupabase().from('activity_logs').insert({
      admin_id: user.id,
      action,
      details,
    });
  };

  const notifyCustomer = async (userId: string, title: string, body: string, link: string | null) => {
    await getSupabase().from('notifications').insert({
      user_id: userId,
      title,
      body,
      link,
      read: false,
    });
  };

  const handleApprove = async (payment: Payment) => {
    const order = orders[payment.order_id];
    setError('');
    setNotice('');
    setBusyId(payment.id);
    const supabase = getSupabase();
    const reviewedAt = new Date().toISOString();
    const { error: payErr } = await supabase
      .from('payments')
      .update({ status: 'approved', reviewed_at: reviewedAt })
      .eq('id', payment.id);
    if (payErr) {
      setError(payErr.message);
      setBusyId(null);
      return;
    }
    if (order) {
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ status: 'verified' })
        .eq('id', order.id);
      if (orderErr) {
        setError(orderErr.message);
        setBusyId(null);
        return;
      }
      await notifyCustomer(
        order.user_id,
        'Payment approved',
        `Your payment for order ${order.order_number} was approved. Your order is now being prepared.`,
        `/dashboard/orders/${order.id}`,
      );
    }
    await logActivity('payment.approve', {
      payment_id: payment.id,
      order_id: payment.order_id,
      order_number: order?.order_number ?? null,
    });
    setNotice(`Payment for order ${order?.order_number ?? payment.order_id} approved.`);
    setBusyId(null);
    await load();
  };

  const handleReject = async (payment: Payment) => {
    const note = window.prompt('Rejection note for the customer (optional):', '');
    if (note === null) return; // user cancelled the prompt
    const order = orders[payment.order_id];
    setError('');
    setNotice('');
    setBusyId(payment.id);
    const supabase = getSupabase();
    const reviewedAt = new Date().toISOString();
    const { error: payErr } = await supabase
      .from('payments')
      .update({ status: 'rejected', reviewed_at: reviewedAt, note: note.trim() || null })
      .eq('id', payment.id);
    if (payErr) {
      setError(payErr.message);
      setBusyId(null);
      return;
    }
    if (order) {
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ status: 'pending_payment' })
        .eq('id', order.id);
      if (orderErr) {
        setError(orderErr.message);
        setBusyId(null);
        return;
      }
      await notifyCustomer(
        order.user_id,
        'Payment rejected',
        `Your payment for order ${order.order_number} was rejected.${note.trim() ? ` Note: ${note.trim()}` : ' Please check your payment details and submit again.'}`,
        `/dashboard/orders/${order.id}`,
      );
    }
    await logActivity('payment.reject', {
      payment_id: payment.id,
      order_id: payment.order_id,
      order_number: order?.order_number ?? null,
      note: note.trim() || null,
    });
    setNotice(`Payment for order ${order?.order_number ?? payment.order_id} rejected.`);
    setBusyId(null);
    await load();
  };

  if (!configured) {
    return (
      <div>
        <h1>Payment Verification</h1>
        <p className="notice">Connect Supabase to use the admin.</p>
      </div>
    );
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Payment Verification</h1>
      <p className="muted">Pending payments are shown first.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {payments.length === 0 ? (
        <p className="muted">No payments submitted yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Method</th>
                <th>Transaction ID</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const order = orders[p.order_id];
                return (
                  <tr key={p.id}>
                    <td>{order?.order_number ?? p.order_id}</td>
                    <td>{paymentMethodLabel(p.method)}</td>
                    <td>{p.transaction_id ?? '—'}</td>
                    <td>
                      <span className={paymentBadge(p.status)}>{p.status}</span>
                      {p.note ? <div className="small muted">{p.note}</div> : null}
                    </td>
                    <td>
                      {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '—'}
                    </td>
                    <td>
                      {p.proof_url ? (
                        <a href={p.proof_url} target="_blank" rel="noreferrer">
                          View proof
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {p.status === 'pending' ? (
                        <div className="flex flex-wrap">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={busyId === p.id}
                            onClick={() => handleApprove(p)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busyId === p.id}
                            onClick={() => handleReject(p)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="muted small">
                          Reviewed
                          {p.reviewed_at ? ` ${new Date(p.reviewed_at).toLocaleString()}` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
