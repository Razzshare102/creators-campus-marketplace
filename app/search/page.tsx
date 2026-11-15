'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { PRODUCTS } from '@/lib/catalog';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const [allProducts, setAllProducts] = useState<Product[]>(PRODUCTS);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAllProducts(PRODUCTS);
      return;
    }
    getSupabase()
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) setAllProducts(data as Product[]);
      });
  }, []);

  const results = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return allProducts;
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.features.some((f) => f.toLowerCase().includes(needle)),
    );
  }, [q, allProducts]);

  return (
    <div className="container">
      <h1>{q ? `Search results for “${q}”` : 'Search products'}</h1>
      {!q && <p className="muted">Enter a search term in the header to find a product.</p>}
      {q && (
        <p className="muted">
          {results.length} result{results.length === 1 ? '' : 's'} found.
        </p>
      )}
      {results.length === 0 ? (
        <div>
          <p className="muted">No results found{q ? ` for “${q}”` : ''}. Try a different search.</p>
          <Link href="/" className="btn btn-primary">
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="grid-products">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
