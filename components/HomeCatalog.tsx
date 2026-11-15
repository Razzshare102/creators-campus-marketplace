'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, PRODUCTS } from '@/lib/catalog';
import ProductCard from './ProductCard';

export default function HomeCatalog() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (category !== 'all' && p.category_id !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.features.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  return (
    <section id="categories" className="mt-3">
      <div className="flex-between">
        <h2>Browse products</h2>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          type="search"
          placeholder="Search X Premium, ChatGPT…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
      </div>
      <div className="chip-row mt-2" role="tablist" aria-label="Filter by category">
        <button type="button" className={`chip${category === 'all' ? ' active' : ''}`} onClick={() => setCategory('all')}>
          All products
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip${category === c.id ? ' active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid-categories mt-2">
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card category-card">
              <strong>{c.name}</strong>
              <div className="muted small">{c.description}</div>
              <div className="small mt-1" style={{ color: 'var(--purple)', fontWeight: 700 }}>
                {PRODUCTS.filter((p) => p.category_id === c.id).length} product(s) →
              </div>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mt-3">Featured products</h2>
      {filtered.length === 0 ? (
        <p className="muted">No products match your search.</p>
      ) : (
        <div className="grid-products">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
