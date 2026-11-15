'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category, Plan, Product } from '@/lib/types';
import { formatPrice, getCategoryBySlug, getCategoryName, getPlansForProduct, getProductBySlug } from '@/lib/catalog';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useCart } from '@/lib/cart';
import PlanSelector from '@/components/PlanSelector';

export default function ProductPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { addItem } = useCart();
  // Render the local fallback catalog synchronously on first paint when
  // Supabase is not configured, so the page is not a blank "Loading…".
  const [product, setProduct] = useState<Product | null | undefined>(() => {
    if (isSupabaseConfigured()) return undefined;
    const prod = getProductBySlug(params.slug);
    return prod ? { ...prod, plans: getPlansForProduct(prod.id) } : null;
  });
  const [categoryName, setCategoryName] = useState<string>(() => {
    if (isSupabaseConfigured()) return '';
    const prod = getProductBySlug(params.slug);
    return prod
      ? (getCategoryBySlug(prod.category_id)?.name ?? getCategoryName(prod.category_id))
      : '';
  });
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .eq('slug', params.slug)
          .eq('active', true)
          .single();
        const prod = (prodData as Product | null) ?? null;
        if (!prod) {
          setProduct(null);
          return;
        }
        const { data: planData } = await supabase
          .from('plans')
          .select('*')
          .eq('product_id', prod.id)
          .eq('active', true)
          .order('sort_order', { ascending: true });
        prod.plans = (planData as Plan[] | null) ?? [];
        setProduct(prod);
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('id', prod.category_id)
          .single();
        setCategoryName((catData as Category | null)?.name ?? getCategoryName(prod.category_id));
      } else {
        const prod = getProductBySlug(params.slug);
        if (!prod) {
          setProduct(null);
          return;
        }
        setProduct({ ...prod, plans: getPlansForProduct(prod.id) });
        setCategoryName(getCategoryBySlug(prod.category_id)?.name ?? getCategoryName(prod.category_id));
      }
    }
    load();
  }, [params.slug]);

  if (product === undefined) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="container">
        <h1>Product not found</h1>
        <p className="muted">This product does not exist.</p>
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    );
  }

  const inStock = product.stock > 0;
  const plans = product.plans ?? getPlansForProduct(product.id);
  const fromPrice = plans.length ? Math.min(...plans.map((p) => p.price)) : 0;

  function handleAdd(plan: Plan) {
    addItem(product as Product, plan);
    setAdded(true);
    router.push('/cart');
  }

  return (
    <div className="container">
      <div className="flex flex-wrap mb-1">
        <span className="badge badge-purple">{categoryName}</span>
        {inStock ? (
          <span className="badge badge-green">In stock</span>
        ) : (
          <span className="badge badge-red">Out of stock</span>
        )}
        <span className="badge badge-gray">
          {product.delivery_type === 'activation_code' ? 'Activation code delivery' : 'Manual delivery'}
        </span>
      </div>

      <h1>{product.name}</h1>
      <p className="muted">{product.description}</p>
      {plans.length > 0 && (
        <p>
          <span className="small muted">From </span>
          <span className="price-from">{formatPrice(fromPrice)}</span>
        </p>
      )}

      {product.features.length > 0 && (
        <>
          <h3>What you get</h3>
          <ul>
            {product.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      )}

      {product.delivery_instructions && (
        <div className="notice mt-2">
          <strong>Delivery:</strong> {product.delivery_instructions}
        </div>
      )}

      <div className="card mt-3">
        <PlanSelector product={product} onAdd={handleAdd} />
        {added && (
          <p className="success mt-2">
            Added to cart. <Link href="/cart">View cart →</Link>
          </p>
        )}
        <div className="mt-2">
          <Link href="/cart" className="btn btn-outline btn-block">
            View cart
          </Link>
        </div>
      </div>
    </div>
  );
}
