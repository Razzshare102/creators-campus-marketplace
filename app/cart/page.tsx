'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/catalog';
import { useCart } from '@/lib/cart';

export default function CartPage() {
  const { items, subtotal, removeItem, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="container">
        <h1>Your cart</h1>
        <p className="muted">Your cart is empty.</p>
        <Link href="/" className="btn btn-primary">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Your cart</h1>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Plan</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.planId}>
                <td>{item.productName}</td>
                <td>
                  {item.planName}
                  <div className="muted small">
                    {item.durationMonths === 1 ? '1 month' : `${item.durationMonths} months`}
                  </div>
                </td>
                <td>
                  <div className="flex">
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.planId, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.planId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td>{formatPrice(item.price)}</td>
                <td>{formatPrice(item.price * item.quantity)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeItem(item.planId)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-3">
        <div className="flex-between">
          <strong>Subtotal</strong>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        <p className="muted small mt-1">
          Any coupon discount is applied at checkout.
        </p>
        <Link href="/checkout" className="btn btn-primary btn-block mt-2">
          Proceed to checkout
        </Link>
        <div className="mt-2">
          <Link href="/" className="btn btn-outline btn-block">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
