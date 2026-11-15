'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product, StockMovement } from '@/lib/types';

interface RowDraft {
  newStock: string;
  reason: string;
}

export default function AdminStockPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [fetching, setFetching] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const supabase = getSupabase();
    const [prodRes, movRes] = await Promise.all([
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (prodRes.error) setError(prodRes.error.message);
    else setProducts((prodRes.data as Product[]) ?? []);
    if (movRes.error) setError((prev) => prev || movRes.error.message);
    else setMovements((movRes.data as StockMovement[]) ?? []);
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  function draftFor(p: Product): RowDraft {
    return drafts[p.id] ?? { newStock: String(p.stock), reason: '' };
  }

  function setDraft(productId: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? { newStock: '', reason: '' }), ...patch },
    }));
  }

  async function adjust(p: Product) {
    if (!user) return;
    const draft = draftFor(p);
    const newStock = Number(draft.newStock);
    if (!Number.isFinite(newStock) || !Number.isInteger(newStock) || newStock < 0) {
      setError(`New stock for ${p.name} must be a whole number of 0 or more.`);
      return;
    }
    const change = newStock - p.stock;
    if (change === 0) {
      setError(`New stock for ${p.name} is the same as the current stock — nothing to adjust.`);
      return;
    }
    if (!draft.reason.trim()) {
      setError(`Enter a reason for the stock change on ${p.name}.`);
      return;
    }
    setAdjustingId(p.id);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { error: updErr } = await supabase.from('products').update({ stock: newStock }).eq('id', p.id);
    if (updErr) {
      setError(updErr.message);
      setAdjustingId(null);
      return;
    }
    const { error: movErr } = await supabase.from('stock_movements').insert({
      product_id: p.id,
      change,
      reason: draft.reason.trim(),
      created_by: user.id,
    });
    if (movErr) {
      setError(`Stock updated but the movement record failed: ${movErr.message}`);
      setAdjustingId(null);
      await load();
      return;
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: 'stock_adjust',
      details: { product_id: p.id, product_name: p.name, old_stock: p.stock, new_stock: newStock, change, reason: draft.reason.trim() },
    });
    setNotice(`${p.name}: stock ${p.stock} → ${newStock} (${change > 0 ? '+' : ''}${change}).`);
    setDrafts((prev) => ({ ...prev, [p.id]: { newStock: String(newStock), reason: '' } }));
    await load();
    setAdjustingId(null);
  }

  const productName = (productId: string): string =>
    products.find((p) => p.id === productId)?.name ?? productId;

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Stock</h1>
      <p className="muted">Set a new stock level per product. Every adjustment is recorded below.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {fetching ? (
        <p className="muted">Loading stock…</p>
      ) : products.length === 0 ? (
        <p className="notice">No products found.</p>
      ) : (
        <div className="table-wrap mb-3">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current stock</th>
                <th>New stock</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const draft = draftFor(p);
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>
                      <span className={p.stock <= 0 ? 'badge badge-red' : p.stock < 10 ? 'badge badge-amber' : 'badge badge-green'}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="1"
                        value={draft.newStock}
                        onChange={(e) => setDraft(p.id, { newStock: e.target.value })}
                        aria-label={`New stock for ${p.name}`}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="text"
                        value={draft.reason}
                        onChange={(e) => setDraft(p.id, { reason: e.target.value })}
                        placeholder="e.g. Restocked from supplier"
                        aria-label={`Reason for ${p.name}`}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        type="button"
                        disabled={adjustingId === p.id}
                        onClick={() => adjust(p)}
                      >
                        {adjustingId === p.id ? 'Saving…' : 'Adjust'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-3">Stock movements</h2>
      <p className="muted small">Latest 50 adjustments, newest first.</p>
      {movements.length === 0 ? (
        <p className="notice">No stock movements recorded yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{productName(m.product_id)}</td>
                  <td>
                    <span className={m.change > 0 ? 'badge badge-green' : 'badge badge-red'}>
                      {m.change > 0 ? `+${m.change}` : m.change}
                    </span>
                  </td>
                  <td className="small">{m.reason ?? '—'}</td>
                  <td className="small">{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
