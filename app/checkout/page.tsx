'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Coupon, PaymentAccounts, PaymentMethodId } from '@/lib/types';
import { EMPTY_PAYMENT_ACCOUNTS } from '@/lib/types';
import { PAYMENT_METHODS, formatPrice } from '@/lib/catalog';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';

const ACCOUNT_FIELD: Record<PaymentMethodId, keyof PaymentAccounts> = {
  usdt: 'usdt_address',
  usdc: 'usdc_address',
  bnb: 'bnb_address',
  binance_pay: 'binance_pay_id',
};

const ACCOUNT_LABEL: Record<PaymentMethodId, string> = {
  usdt: 'USDT address',
  usdc: 'USDC address',
  bnb: 'BNB address',
  binance_pay: 'Binance Pay ID',
};

function parsePaymentAccounts(raw: unknown): PaymentAccounts {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return EMPTY_PAYMENT_ACCOUNTS;
    }
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return {
      usdt_address: typeof v.usdt_address === 'string' ? v.usdt_address : '',
      usdc_address: typeof v.usdc_address === 'string' ? v.usdc_address : '',
      bnb_address: typeof v.bnb_address === 'string' ? v.bnb_address : '',
      binance_pay_id: typeof v.binance_pay_id === 'string' ? v.binance_pay_id : '',
    };
  }
  return EMPTY_PAYMENT_ACCOUNTS;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, clear } = useCart();
  const configured = isSupabaseConfigured();

  const [method, setMethod] = useState<PaymentMethodId>('usdt');
  const [accounts, setAccounts] = useState<PaymentAccounts>(EMPTY_PAYMENT_ACCOUNTS);
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!configured) return;
    getSupabase()
      .from('settings')
      .select('value')
      .eq('key', 'payment_accounts')
      .single()
      .then(({ data }) => {
        if (data) setAccounts(parsePaymentAccounts((data as { value: unknown }).value));
      });
  }, [configured]);

  const discount = coupon
    ? coupon.type === 'percent'
      ? Math.min(subtotal, (subtotal * coupon.value) / 100)
      : Math.min(subtotal, coupon.value)
    : 0;
  const total = Math.max(0, subtotal - discount);

  const receivingAccount = accounts[ACCOUNT_FIELD[method]];

  async function applyCoupon() {
    setCouponError('');
    setCouponMessage('');
    const code = couponCode.trim();
    if (!code) {
      setCouponError('Enter a coupon code.');
      return;
    }
    if (!configured) {
      setCouponError('Coupons need Supabase connected.');
      return;
    }
    const { data, error: fetchError } = await getSupabase()
      .from('coupons')
      .select('*')
      .ilike('code', code)
      .eq('active', true)
      .single();
    if (fetchError || !data) {
      setCoupon(null);
      setCouponError('Coupon code is not valid.');
      return;
    }
    const c = data as Coupon;
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
      setCoupon(null);
      setCouponError('This coupon has expired.');
      return;
    }
    if (subtotal < c.min_order) {
      setCoupon(null);
      setCouponError(`This coupon needs a minimum order of ${formatPrice(c.min_order)}.`);
      return;
    }
    if (c.max_uses !== null && c.used_count >= c.max_uses) {
      setCoupon(null);
      setCouponError('This coupon has reached its maximum number of uses.');
      return;
    }
    setCoupon(c);
    setCouponMessage(`Coupon ${c.code} applied.`);
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponCode('');
    setCouponMessage('');
    setCouponError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!user) {
      setError('You need to log in to place an order.');
      return;
    }
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!transactionId.trim()) {
      setError('Enter the transaction ID of your payment.');
      return;
    }
    if (!configured) {
      setError('Checkout needs Supabase connected.');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}`;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'pending_payment',
          total,
          currency: 'USD',
          coupon_code: coupon ? coupon.code : null,
          discount,
        })
        .select('id')
        .single();
      if (orderError || !orderData) {
        throw new Error(orderError?.message ?? 'Could not create the order.');
      }
      const orderId = (orderData as { id: string }).id;

      const orderItems = items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        plan_id: item.planId,
        quantity: item.quantity,
        price: item.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw new Error(itemsError.message);

      let proofUrl: string | null = null;
      if (file) {
        const path = `${user.id}/${orderNumber}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        proofUrl = path;
      }

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: orderId,
        method,
        transaction_id: transactionId.trim(),
        proof_url: proofUrl,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        note: note.trim() || null,
      });
      if (paymentError) throw new Error(paymentError.message);

      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: 'awaiting_verification' })
        .eq('id', orderId);
      if (statusError) throw new Error(statusError.message);

      // Count the coupon use (best-effort; a failure here must not fail the order).
      if (coupon) {
        await supabase
          .from('coupons')
          .update({ used_count: (coupon.used_count ?? 0) + 1 })
          .eq('id', coupon.id);
      }

      clear();
      router.push(`/dashboard/orders/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Checkout</h1>
        <div className="notice">
          You need to log in to place an order.
        </div>
        <Link href="/auth/login?next=/checkout" className="btn btn-primary">
          Log in to continue to checkout
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <h1>Checkout</h1>
        <p className="muted">Your cart is empty.</p>
        <Link href="/" className="btn btn-primary">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Checkout</h1>

      {!configured && (
        <div className="notice">
          Checkout needs Supabase connected. Connect Supabase to place an order.
        </div>
      )}

      <div className="card mb-3">
        <h2>Review your order</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Plan</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.planId}>
                  <td>{item.productName}</td>
                  <td>{item.planName}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex-between mt-2">
          <span>Subtotal</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        {discount > 0 && coupon && (
          <div className="flex-between mt-1">
            <span>Discount ({coupon.code})</span>
            <strong>−{formatPrice(discount)}</strong>
          </div>
        )}
        <div className="flex-between mt-1">
          <span>Total</span>
          <strong>{formatPrice(total)}</strong>
        </div>
      </div>

      <div className="card mb-3">
        <h2>Coupon</h2>
        {coupon ? (
          <div className="flex-between">
            <span>
              Coupon <strong>{coupon.code}</strong> applied —{' '}
              {coupon.type === 'percent' ? `${coupon.value}% off` : `${formatPrice(coupon.value)} off`}
            </span>
            <button type="button" className="btn btn-sm" onClick={removeCoupon}>
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap">
            <input
              className="input"
              type="text"
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              aria-label="Coupon code"
            />
            <button type="button" className="btn btn-outline" onClick={applyCoupon}>
              Apply coupon
            </button>
          </div>
        )}
        {couponError && <p className="error mt-2">{couponError}</p>}
        {couponMessage && <p className="success mt-2">{couponMessage}</p>}
        {!configured && (
          <p className="muted small mt-2">
            Coupons need Supabase connected.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card mb-3">
          <h2>Payment method</h2>
          <div className="form-row">
            <label className="label" htmlFor="payment-method">
              Choose how you will pay
            </label>
            <select
              id="payment-method"
              className="select"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethodId)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
          </div>
          {configured && receivingAccount ? (
            <div className="notice">
              <strong>Send {formatPrice(total)} to this {ACCOUNT_LABEL[method]}:</strong>
              <div>{receivingAccount}</div>
            </div>
          ) : (
            <div className="notice">
              Payment details not configured yet — place the order and the admin will share payment details.
            </div>
          )}
        </div>

        <div className="card mb-3">
          <h2>Payment proof</h2>
          {error && <div className="error">{error}</div>}
          <div className="form-row">
            <label className="label" htmlFor="transaction-id">
              Transaction ID
            </label>
            <input
              id="transaction-id"
              className="input"
              type="text"
              placeholder="Your payment transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="screenshot">
              Payment screenshot
            </label>
            <input
              id="screenshot"
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="muted small mt-1">
              Upload a screenshot of your payment as proof.
            </p>
          </div>
          <div className="form-row">
            <label className="label" htmlFor="order-note">
              Note (optional)
            </label>
            <textarea
              id="order-note"
              className="input"
              rows={3}
              placeholder="Anything the admin should know about this order"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place order — ${formatPrice(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
