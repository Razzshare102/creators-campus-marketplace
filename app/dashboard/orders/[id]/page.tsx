'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS, formatPrice, paymentMethodLabel } from '@/lib/catalog';
import type { Delivery, Order, OrderItem, Payment } from '@/lib/types';

function statusBadgeClass(status: string): string {
  if (status === 'completed') return 'badge-green';
  if (status === 'awaiting_verification') return 'badge-amber';
  if (status === 'cancelled' || status === 'refunded') return 'badge-red';
  if (status === 'verified' || status === 'delivering') return 'badge-blue';
  return 'badge-gray';
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { user, loading, configured } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [productInstructions, setProductInstructions] = useState<string[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);

  const [txId, setTxId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState('');
  const [proofSuccess, setProofSuccess] = useState('');
  const [proofBusy, setProofBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    setLoadingOrder(true);
    setNotFound(false);
    setError('');
    const supabase = getSupabase();
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();
    if (orderError || !orderData) {
      setLoadingOrder(false);
      setNotFound(true);
      return;
    }
    const found = orderData as Order;
    setOrder(found);

    const [itemsRes, paymentRes, deliveryRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', found.id),
      supabase.from('payments').select('*').eq('order_id', found.id).maybeSingle(),
      supabase.from('deliveries').select('*').eq('order_id', found.id).maybeSingle(),
    ]);
    if (itemsRes.error || paymentRes.error || deliveryRes.error) {
      setError('Could not load the full order details. Please try again.');
    }
    const loadedItems = (itemsRes.data as OrderItem[] | null) ?? [];
    setItems(loadedItems);
    setPayment((paymentRes.data as Payment | null) ?? null);
    setDelivery((deliveryRes.data as Delivery | null) ?? null);

    // Product delivery instructions (fallback when no delivery row exists yet).
    const productIds = [...new Set(loadedItems.map((i) => i.product_id).filter(Boolean))];
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('delivery_instructions')
        .in('id', productIds);
      const instructions = ((products as { delivery_instructions: string | null }[] | null) ?? [])
        .map((p) => p.delivery_instructions)
        .filter((t): t is string => Boolean(t));
      setProductInstructions([...new Set(instructions)]);
    } else {
      setProductInstructions([]);
    }
    setLoadingOrder(false);
  }, [user, params.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleProofSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !order) return;
    setProofError('');
    setProofSuccess('');
    if (!txId.trim()) {
      setProofError('Please enter the transaction ID.');
      return;
    }
    if (!payment) {
      setProofError('No payment record exists for this order yet. Please contact support.');
      return;
    }
    setProofBusy(true);
    const supabase = getSupabase();
    let proofUrl: string | null = payment.proof_url ?? null;
    if (proofFile) {
      const ext = proofFile.name.split('.').pop() ?? 'png';
      const path = `${user.id}/${order.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, proofFile);
      if (uploadError) {
        setProofError(uploadError.message);
        setProofBusy(false);
        return;
      }
      proofUrl = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
    }
    const { error: payError } = await supabase
      .from('payments')
      .update({
        transaction_id: txId.trim(),
        proof_url: proofUrl,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    if (payError) {
      setProofError(payError.message);
      setProofBusy(false);
      return;
    }
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'awaiting_verification' })
      .eq('id', order.id)
      .eq('user_id', user.id);
    setProofBusy(false);
    if (orderError) {
      setProofError(orderError.message);
      return;
    }
    setProofSuccess('Payment proof submitted — your order is now awaiting verification.');
    setTxId('');
    setProofFile(null);
    await loadOrder();
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
        <h1>Order</h1>
        <p className="notice">Connect Supabase to use this feature — orders need Supabase connected.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Order</h1>
        <p className="notice">
          Please <Link href="/auth/login">log in</Link> to view this order.
        </p>
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="container">
        <p className="muted">Loading order…</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="container">
        <h1>Order</h1>
        <p className="notice">Order not found.</p>
        <p>
          <Link href="/dashboard/orders">Back to my orders</Link>
        </p>
      </div>
    );
  }

  const currentStep = ORDER_STATUS_STEPS.indexOf(order.status);
  const canSubmitProof = order.status === 'pending_payment' || payment?.status === 'rejected';
  const showProductInstructions =
    !delivery && (order.status === 'verified' || order.status === 'delivering' || order.status === 'completed');

  return (
    <div className="container">
      <p className="mb-1">
        <Link href="/dashboard/orders">&larr; Back to my orders</Link>
      </p>
      <div className="flex-between">
        <h1 style={{ margin: 0 }}>Order {order.order_number}</h1>
        <span className={`badge ${statusBadgeClass(order.status)}`}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>
      <p className="muted small mt-1">Placed {new Date(order.created_at).toLocaleString()}</p>
      {error && <p className="error">{error}</p>}
      {(order.status === 'cancelled' || order.status === 'refunded') && (
        <p className="notice">This order is {ORDER_STATUS_LABELS[order.status] ?? order.status}.</p>
      )}

      <div className="card mt-2">
        <h2>Status</h2>
        <ol className="timeline">
          {ORDER_STATUS_STEPS.map((step, i) => (
            <li key={step} className={i < currentStep ? 'done' : i === currentStep ? 'current' : ''}>
              {ORDER_STATUS_LABELS[step] ?? step}
              {i === currentStep && <span className="muted small"> — current step</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="card mt-2">
        <h2>Items</h2>
        {items.length === 0 ? (
          <p className="muted">No items found for this order.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Plan</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name ?? 'Product'}</td>
                    <td>{item.plan_name ?? '—'}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(item.price)}</td>
                    <td>{formatPrice(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2">
          {order.discount > 0 && (
            <p className="mb-1">
              Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}: −{formatPrice(order.discount)}
            </p>
          )}
          <p style={{ fontWeight: 800, margin: 0 }}>Total: {formatPrice(order.total)}</p>
        </div>
      </div>

      <div className="card mt-2">
        <h2>Payment</h2>
        {payment ? (
          <>
            <p className="mb-1">Method: {paymentMethodLabel(payment.method)}</p>
            <p className="mb-1">Transaction ID: {payment.transaction_id ?? '—'}</p>
            <p className="mb-1">
              Status:{' '}
              <span
                className={`badge ${
                  payment.status === 'approved'
                    ? 'badge-green'
                    : payment.status === 'rejected'
                      ? 'badge-red'
                      : 'badge-amber'
                }`}
              >
                {payment.status}
              </span>
            </p>
            {payment.note && <p className="mb-1">Note: {payment.note}</p>}
            <p style={{ marginBottom: 0 }}>
              Proof:{' '}
              {payment.proof_url ? (
                <a href={payment.proof_url} target="_blank" rel="noopener noreferrer">
                  View payment proof
                </a>
              ) : (
                '—'
              )}
            </p>
          </>
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>
            No payment submitted for this order yet.
          </p>
        )}
      </div>

      <div className="card mt-2">
        <h2>Delivery</h2>
        {delivery ? (
          <>
            {delivery.activation_code && (
              <div className="mb-2">
                <p className="label">Activation code</p>
                <div className="flex flex-wrap">
                  <code>{delivery.activation_code}</code>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => copyCode(delivery.activation_code!)}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
            {delivery.instructions && <p style={{ marginBottom: 0 }}>{delivery.instructions}</p>}
            {delivery.delivered_at && (
              <p className="muted small mt-1" style={{ marginBottom: 0 }}>
                Delivered {new Date(delivery.delivered_at).toLocaleString()}
              </p>
            )}
            {!delivery.activation_code && !delivery.instructions && (
              <p className="muted" style={{ marginBottom: 0 }}>
                Delivery details will appear here once available.
              </p>
            )}
          </>
        ) : showProductInstructions && productInstructions.length > 0 ? (
          <>
            {productInstructions.map((text, i) => (
              <p key={i} style={{ marginBottom: 0 }}>
                {text}
              </p>
            ))}
          </>
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>
            Delivery details will appear here after your payment is verified.
          </p>
        )}
      </div>

      {canSubmitProof && (
        <div className="card mt-2">
          <h2>Submit / update payment proof</h2>
          {payment?.status === 'rejected' && (
            <p className="notice">Your previous payment proof was rejected. Please submit a new one.</p>
          )}
          {proofSuccess && <p className="success">{proofSuccess}</p>}
          <form onSubmit={handleProofSubmit}>
            {proofError && <p className="error">{proofError}</p>}
            <div className="form-row">
              <label className="label" htmlFor="proof-txid">
                Transaction ID
              </label>
              <input
                id="proof-txid"
                className="input"
                type="text"
                required
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                disabled={proofBusy}
              />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="proof-file">
                Payment screenshot
              </label>
              <input
                id="proof-file"
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                disabled={proofBusy}
              />
              <p className="muted small mt-1">Upload a screenshot of your payment.</p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={proofBusy}>
              {proofBusy ? 'Submitting…' : 'Submit payment proof'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
