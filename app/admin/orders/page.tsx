'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatPrice, ORDER_STATUS_LABELS, paymentMethodLabel } from '@/lib/catalog';
import type { Delivery, Order, OrderItem, OrderStatus, Payment, Profile } from '@/lib/types';

const ALL_STATUSES: OrderStatus[] = [
  'pending_payment',
  'awaiting_verification',
  'verified',
  'delivering',
  'completed',
  'cancelled',
  'refunded',
];

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

interface OrderDetail {
  items: OrderItem[];
  payment: Payment | null;
  delivery: Delivery | null;
}

export default function AdminOrdersPage() {
  const configured = isSupabaseConfigured();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      const list = (data ?? []) as Order[];
      setOrders(list);
      const userIds = [...new Set(list.map((o) => o.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id,email').in('id', userIds);
        const map: Record<string, string> = {};
        ((profiles ?? []) as Profile[]).forEach((p) => {
          map[p.id] = p.email;
        });
        setEmails(map);
      } else {
        setEmails({});
      }
    }
    setLoading(false);
  }, [configured, statusFilter]);

  useEffect(() => {
    setLoading(true);
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

  const toggleExpand = async (order: Order) => {
    if (expandedId === order.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(order.id);
    setDetail(null);
    setDetailLoading(true);
    const supabase = getSupabase();
    const [itemsRes, paymentRes, deliveryRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', order.id),
      supabase.from('payments').select('*').eq('order_id', order.id).maybeSingle(),
      supabase.from('deliveries').select('*').eq('order_id', order.id).maybeSingle(),
    ]);
    setDetail({
      items: (itemsRes.data ?? []) as OrderItem[],
      payment: (paymentRes.data ?? null) as Payment | null,
      delivery: (deliveryRes.data ?? null) as Delivery | null,
    });
    setDetailLoading(false);
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    setError('');
    setNotice('');
    setUpdating(true);
    const { error: err } = await getSupabase()
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);
    setUpdating(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('order.status_change', {
      order_id: order.id,
      order_number: order.order_number,
      from: order.status,
      to: newStatus,
    });
    setNotice(`Order ${order.order_number} moved to ${ORDER_STATUS_LABELS[newStatus]}.`);
    await load();
  };

  if (!configured) {
    return (
      <div>
        <h1>Orders</h1>
        <p className="notice">Connect Supabase to use the admin.</p>
      </div>
    );
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Orders</h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="form-row">
        <label className="label" htmlFor="status-filter">Filter by status</label>
        <select
          id="status-filter"
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <p className="muted">No orders found.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr>
                    <td>{o.order_number}</td>
                    <td>{emails[o.user_id] ?? o.user_id}</td>
                    <td>{formatPrice(Number(o.total))}</td>
                    <td>
                      <span className={statusBadge(o.status)}>
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleExpand(o)}
                      >
                        {expandedId === o.id ? 'Hide details' : 'View details'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr key={`${o.id}-detail`}>
                      <td colSpan={6}>
                        {detailLoading ? (
                          <p className="muted">Loading details…</p>
                        ) : (
                          <div className="card">
                            <h3>Order {o.order_number}</h3>
                            <p className="small muted">
                              Customer: {emails[o.user_id] ?? o.user_id}
                              {o.coupon_code ? ` · Coupon: ${o.coupon_code} (−${formatPrice(Number(o.discount || 0))})` : ''}
                            </p>

                            <h4>Items</h4>
                            {detail && detail.items.length === 0 ? (
                              <p className="muted small">No items recorded for this order.</p>
                            ) : (
                              <div className="table-wrap mb-2">
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Product</th>
                                      <th>Plan</th>
                                      <th>Qty</th>
                                      <th>Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(detail?.items ?? []).map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.product_name ?? item.product_id}</td>
                                        <td>{item.plan_name ?? item.plan_id}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatPrice(Number(item.price))}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <h4>Payment</h4>
                            {detail?.payment ? (
                              <p className="small">
                                {paymentMethodLabel(detail.payment.method)} ·{' '}
                                {detail.payment.transaction_id ?? 'No transaction ID'} ·{' '}
                                <span
                                  className={
                                    detail.payment.status === 'approved'
                                      ? 'badge badge-green'
                                      : detail.payment.status === 'rejected'
                                        ? 'badge badge-red'
                                        : 'badge badge-amber'
                                  }
                                >
                                  {detail.payment.status}
                                </span>
                                {detail.payment.submitted_at
                                  ? ` · Submitted ${new Date(detail.payment.submitted_at).toLocaleString()}`
                                  : ''}
                                {detail.payment.note ? ` · Note: ${detail.payment.note}` : ''}
                              </p>
                            ) : (
                              <p className="muted small">No payment record for this order.</p>
                            )}

                            {detail?.delivery && (
                              <>
                                <h4>Delivery</h4>
                                <p className="small">
                                  Type: {detail.delivery.type}
                                  {detail.delivery.delivered_at
                                    ? ` · Delivered ${new Date(detail.delivery.delivered_at).toLocaleString()}`
                                    : ' · Not delivered yet'}
                                </p>
                              </>
                            )}

                            <div className="form-row mt-2">
                              <label className="label" htmlFor={`status-${o.id}`}>Change status</label>
                              <select
                                id={`status-${o.id}`}
                                className="select"
                                value={o.status}
                                disabled={updating}
                                onChange={(e) => handleStatusChange(o, e.target.value as OrderStatus)}
                              >
                                {ALL_STATUSES.map((s) => (
                                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
