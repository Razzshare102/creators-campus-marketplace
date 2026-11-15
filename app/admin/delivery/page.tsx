'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatPrice } from '@/lib/catalog';
import type { Delivery, DeliveryType, Order, OrderItem, Profile } from '@/lib/types';

interface DeliveryDraft {
  type: DeliveryType;
  activation_code: string;
  instructions: string;
}

interface OrderWithDetails extends Order {
  customerEmail: string;
}

export default function AdminDeliveryPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [deliveryByOrder, setDeliveryByOrder] = useState<Record<string, Delivery>>({});
  const [drafts, setDrafts] = useState<Record<string, DeliveryDraft>>({});
  const [fetching, setFetching] = useState(false);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const supabase = getSupabase();
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['verified', 'delivering'])
      .order('created_at', { ascending: true });
    if (orderErr) {
      setError(orderErr.message);
      setFetching(false);
      return;
    }
    const list = (orderData as Order[]) ?? [];
    const orderIds = list.map((o) => o.id);

    const [itemsRes, delivRes, profRes] = await Promise.all([
      orderIds.length
        ? supabase.from('order_items').select('*').in('order_id', orderIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length
        ? supabase.from('deliveries').select('*').in('order_id', orderIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('profiles').select('id, email'),
    ]);
    if (itemsRes.error) setError(itemsRes.error.message);
    if (delivRes.error) setError((prev) => prev || delivRes.error.message);

    const emailById: Record<string, string> = {};
    ((profRes.data as Pick<Profile, 'id' | 'email'>[] | null) ?? []).forEach((p) => {
      emailById[p.id] = p.email;
    });
    const itemsMap: Record<string, OrderItem[]> = {};
    (((itemsRes.data as OrderItem[] | null) ?? [])).forEach((it) => {
      (itemsMap[it.order_id] = itemsMap[it.order_id] ?? []).push(it);
    });
    const delivMap: Record<string, Delivery> = {};
    (((delivRes.data as Delivery[] | null) ?? [])).forEach((d) => {
      delivMap[d.order_id] = d;
    });

    setOrders(list.map((o) => ({ ...o, customerEmail: emailById[o.user_id] ?? o.user_id })));
    setItemsByOrder(itemsMap);
    setDeliveryByOrder(delivMap);
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  function draftFor(o: Order): DeliveryDraft {
    const existing = deliveryByOrder[o.id];
    return (
      drafts[o.id] ?? {
        type: existing?.type ?? 'manual',
        activation_code: existing?.activation_code ?? '',
        instructions: existing?.instructions ?? '',
      }
    );
  }

  function setDraft(orderId: string, patch: Partial<DeliveryDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] ?? { type: 'manual', activation_code: '', instructions: '' }), ...patch },
    }));
  }

  async function markDelivered(o: OrderWithDetails) {
    if (!user) return;
    const draft = draftFor(o);
    if (draft.type === 'activation_code' && !draft.activation_code.trim()) {
      setError(`Order ${o.order_number}: an activation code is required for activation-code delivery.`);
      return;
    }
    setDeliveringId(o.id);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const existing = deliveryByOrder[o.id];
    const payload = {
      order_id: o.id,
      type: draft.type,
      activation_code: draft.type === 'activation_code' ? draft.activation_code.trim() : null,
      instructions: draft.instructions.trim() || null,
      delivered_at: now,
      delivered_by: user.id,
    };
    const { error: delivErr } = existing
      ? await supabase.from('deliveries').update(payload).eq('id', existing.id)
      : await supabase.from('deliveries').insert(payload);
    if (delivErr) {
      setError(delivErr.message);
      setDeliveringId(null);
      return;
    }
    const { error: orderErr } = await supabase.from('orders').update({ status: 'completed' }).eq('id', o.id);
    if (orderErr) {
      setError(orderErr.message);
      setDeliveringId(null);
      return;
    }
    await supabase.from('notifications').insert({
      user_id: o.user_id,
      title: `Your order ${o.order_number} has been delivered`,
      body:
        draft.type === 'activation_code'
          ? `Your activation code for order ${o.order_number}: ${draft.activation_code.trim()}.`
          : draft.instructions.trim()
            ? `Delivery instructions for order ${o.order_number}: ${draft.instructions.trim()}`
            : `Your order ${o.order_number} has been delivered.`,
      link: `/dashboard/orders/${o.id}`,
      read: false,
    });
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: 'order_delivered',
      details: { order_id: o.id, order_number: o.order_number, delivery_type: draft.type },
    });
    setNotice(`Order ${o.order_number} marked delivered.`);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[o.id];
      return next;
    });
    await load();
    setDeliveringId(null);
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Delivery</h1>
      <p className="muted">
        Orders with verified payment, waiting to be delivered. For manual delivery the instructions
        you enter are what the customer sees.
      </p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {fetching ? (
        <p className="muted">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="notice">No orders waiting for delivery.</p>
      ) : (
        orders.map((o) => {
          const draft = draftFor(o);
          const items = itemsByOrder[o.id] ?? [];
          const existing = deliveryByOrder[o.id];
          return (
            <div className="card mb-3" key={o.id}>
              <div className="flex-between mb-1">
                <h3>{o.order_number}</h3>
                <span className="badge badge-blue">{o.status}</span>
              </div>
              <p className="small muted">
                {o.customerEmail} · {new Date(o.created_at).toLocaleString()} · Total {formatPrice(o.total)}
              </p>
              <ul className="small">
                {items.map((it) => (
                  <li key={it.id}>
                    {it.product_name ?? it.product_id}
                    {it.plan_name ? ` — ${it.plan_name}` : ''} × {it.quantity} · {formatPrice(it.price)}
                  </li>
                ))}
                {items.length === 0 && <li className="muted">No items recorded for this order.</li>}
              </ul>
              {existing?.delivered_at && (
                <p className="small muted">Previously delivered at {new Date(existing.delivered_at).toLocaleString()}.</p>
              )}
              <div className="form-row">
                <label className="label" htmlFor={`delivery-type-${o.id}`}>Delivery type</label>
                <select
                  id={`delivery-type-${o.id}`}
                  className="select"
                  value={draft.type}
                  onChange={(e) => setDraft(o.id, { type: e.target.value as DeliveryType })}
                >
                  <option value="manual">Manual</option>
                  <option value="activation_code">Activation code</option>
                </select>
              </div>
              {draft.type === 'activation_code' && (
                <div className="form-row">
                  <label className="label" htmlFor={`activation-code-${o.id}`}>Activation code</label>
                  <input
                    id={`activation-code-${o.id}`}
                    className="input"
                    value={draft.activation_code}
                    onChange={(e) => setDraft(o.id, { activation_code: e.target.value })}
                    placeholder="Paste the activation / license code"
                  />
                </div>
              )}
              <div className="form-row">
                <label className="label" htmlFor={`instructions-${o.id}`}>
                  Instructions {draft.type === 'manual' ? '(shown to the customer)' : '(optional)'}
                </label>
                <textarea
                  id={`instructions-${o.id}`}
                  className="input"
                  rows={3}
                  value={draft.instructions}
                  onChange={(e) => setDraft(o.id, { instructions: e.target.value })}
                  placeholder="How the customer gets or activates their product…"
                />
              </div>
              <button
                className="btn btn-success"
                type="button"
                disabled={deliveringId === o.id}
                onClick={() => markDelivered(o)}
              >
                {deliveringId === o.id ? 'Delivering…' : 'Mark delivered'}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
