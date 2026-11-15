'use client';

import { useEffect, useState } from 'react';
import type { Plan, Product } from '@/lib/types';
import { formatPrice, getPlansForProduct } from '@/lib/catalog';

interface PlanSelectorProps {
  product: Product;
  onAdd: (plan: Plan) => void;
}

export default function PlanSelector({ product, onAdd }: PlanSelectorProps) {
  const plans = (product.plans && product.plans.length > 0
    ? product.plans.filter((p) => p.active)
    : getPlansForProduct(product.id)
  ).slice().sort((a, b) => a.sort_order - b.sort_order);

  const [selectedId, setSelectedId] = useState<string>(plans[0]?.id ?? '');

  useEffect(() => {
    setSelectedId(plans[0]?.id ?? '');
    // Reset selection when the product changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];
  const outOfStock = product.stock <= 0;

  if (plans.length === 0) {
    return <p className="notice">No plans are available for this product yet.</p>;
  }

  return (
    <div>
      <h3>Choose a plan</h3>
      <div role="radiogroup" aria-label="Choose a plan">
        {plans.map((plan) => (
          <div
            key={plan.id}
            role="radio"
            aria-checked={selected?.id === plan.id}
            tabIndex={0}
            className={`plan-option${selected?.id === plan.id ? ' selected' : ''}`}
            onClick={() => setSelectedId(plan.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedId(plan.id);
              }
            }}
          >
            <div>
              <div>{plan.name}</div>
              <div className="muted small">
                {plan.duration_months === 1 ? '1 month' : `${plan.duration_months} months`}
              </div>
            </div>
            <div className="plan-price">{formatPrice(plan.price)}</div>
          </div>
        ))}
      </div>
      {outOfStock && <p className="error">This product is currently out of stock.</p>}
      <button
        type="button"
        className="btn btn-primary btn-block mt-2"
        disabled={!selected || outOfStock}
        onClick={() => {
          if (selected) onAdd(selected);
        }}
      >
        Add to cart
      </button>
    </div>
  );
}
