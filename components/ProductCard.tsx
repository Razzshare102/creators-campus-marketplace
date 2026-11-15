import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatPrice, getCategoryName, minPrice } from '@/lib/catalog';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card product-card">
      <span className="badge badge-purple">{getCategoryName(product.category_id)}</span>
      <h3 className="mt-1">{product.name}</h3>
      <p className="muted small">{product.description}</p>
      <ul className="features">
        {product.features.slice(0, 3).map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <div className="flex-between mt-2" style={{ marginTop: 'auto' }}>
        <div>
          <div className="small muted">From</div>
          <div className="price-from">{formatPrice(minPrice(product.id))}</div>
        </div>
        <Link href={`/product/${product.slug}`} className="btn btn-primary btn-sm">
          View plans
        </Link>
      </div>
    </div>
  );
}
