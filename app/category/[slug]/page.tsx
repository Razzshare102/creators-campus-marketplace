'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category, Product } from '@/lib/types';
import { CATEGORIES, PRODUCTS, getCategoryBySlug } from '@/lib/catalog';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  // Render the local fallback catalog synchronously on first paint when
  // Supabase is not configured, so the page is not a blank "Loading…".
  const [category, setCategory] = useState<Category | null | undefined>(() =>
    isSupabaseConfigured() ? undefined : (getCategoryBySlug(params.slug) ?? null),
  );
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [products, setProducts] = useState<Product[]>(() => {
    if (isSupabaseConfigured()) return [];
    const cat = getCategoryBySlug(params.slug);
    return cat ? PRODUCTS.filter((p) => p.category_id === cat.id && p.active) : [];
  });

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', params.slug)
          .eq('active', true)
          .single();
        const cat = (catData as Category | null) ?? null;
        setCategory(cat);
        const { data: allCats } = await supabase
          .from('categories')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });
        if (allCats) setCategories(allCats as Category[]);
        if (cat) {
          const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', cat.id)
            .eq('active', true)
            .order('sort_order', { ascending: true });
          setProducts((prodData as Product[] | null) ?? []);
        } else {
          setProducts([]);
        }
      } else {
        const cat = getCategoryBySlug(params.slug);
        setCategory(cat ?? null);
        setCategories(CATEGORIES);
        setProducts(
          cat ? PRODUCTS.filter((p) => p.category_id === cat.id && p.active) : [],
        );
      }
    }
    load();
  }, [params.slug]);

  if (category === undefined) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (category === null) {
    return (
      <div className="container">
        <h1>Category not found</h1>
        <p className="muted">This category does not exist.</p>
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>{category.name}</h1>
      {category.description && <p className="muted">{category.description}</p>}

      <div className="chip-row mt-2" aria-label="Switch category">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip${c.slug === category.slug ? ' active' : ''}`}
            onClick={() => router.push(`/category/${c.slug}`)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="muted mt-3">No products in this category yet.</p>
      ) : (
        <div className="grid-products mt-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
