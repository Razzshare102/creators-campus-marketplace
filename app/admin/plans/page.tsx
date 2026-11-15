'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/catalog';
import type { Plan, Product } from '@/lib/types';

interface PlanForm {
  product_id: string;
  name: string;
  duration_months: string;
  price: string;
  compare_price: string;
  active: boolean;
  sort_order: string;
}

const EMPTY_FORM: PlanForm = {
  product_id: '',
  name: '',
  duration_months: '1',
  price: '',
  compare_price: '',
  active: true,
  sort_order: '0',
};

function toForm(p: Plan): PlanForm {
  return {
    product_id: p.product_id,
    name: p.name,
    duration_months: String(p.duration_months),
    price: String(p.price),
    compare_price: p.compare_price === null ? '' : String(p.compare_price),
    active: p.active,
    sort_order: String(p.sort_order),
  };
}

function toRow(f: PlanForm) {
  return {
    product_id: f.product_id,
    name: f.name.trim(),
    duration_months: Number(f.duration_months) || 1,
    price: Number(f.price) || 0,
    compare_price: f.compare_price.trim() === '' ? null : Number(f.compare_price),
    active: f.active,
    sort_order: Number(f.sort_order) || 0,
  };
}

export default function AdminPlansPage() {
  const configured = isSupabaseConfigured();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterProduct, setFilterProduct] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlanForm>(EMPTY_FORM);
  const [addForm, setAddForm] = useState<PlanForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    const [pRes, prodRes] = await Promise.all([
      supabase.from('plans').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
    ]);
    if (pRes.error) setError(pRes.error.message);
    else setPlans((pRes.data ?? []) as Plan[]);
    if (!prodRes.error) setProducts((prodRes.data ?? []) as Product[]);
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  const logActivity = async (action: string, details: Record<string, unknown>) => {
    if (!user) return;
    await getSupabase().from('activity_logs').insert({
      admin_id: user.id,
      action,
      details,
    });
  };

  const productName = (id: string) =>
    products.find((p) => p.id === id)?.name ?? 'Unknown product';

  const visiblePlans =
    filterProduct === 'all' ? plans : plans.filter((p) => p.product_id === filterProduct);

  const grouped: { productId: string; plans: Plan[] }[] = [];
  visiblePlans.forEach((p) => {
    const group = grouped.find((g) => g.productId === p.product_id);
    if (group) group.plans.push(p);
    else grouped.push({ productId: p.product_id, plans: [p] });
  });

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!addForm.product_id) {
      setError('Please choose a product.');
      return;
    }
    setSaving(true);
    const { data, error: err } = await getSupabase()
      .from('plans')
      .insert(toRow(addForm))
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('plan.create', { plan_id: data.id, name: addForm.name });
    setAddForm(EMPTY_FORM);
    setNotice('Plan added.');
    await load();
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setNotice('');
    setSaving(true);
    const { error: err } = await getSupabase()
      .from('plans')
      .update(toRow(editForm))
      .eq('id', editingId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('plan.update', { plan_id: editingId, name: editForm.name });
    setEditingId(null);
    setNotice('Plan updated.');
    await load();
  };

  const handleDelete = async (p: Plan) => {
    if (!window.confirm(`Delete plan "${p.name}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    const { error: err } = await getSupabase().from('plans').delete().eq('id', p.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('plan.delete', { plan_id: p.id, name: p.name });
    setNotice('Plan deleted.');
    await load();
  };

  const handleToggleActive = async (p: Plan) => {
    setError('');
    const { error: err } = await getSupabase()
      .from('plans')
      .update({ active: !p.active })
      .eq('id', p.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('plan.update', {
      plan_id: p.id,
      name: p.name,
      active: !p.active,
    });
    await load();
  };

  if (!configured) {
    return (
      <div>
        <h1>Plans</h1>
        <p className="notice">Connect Supabase to use the admin.</p>
      </div>
    );
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Plans</h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="form-row">
        <label className="label" htmlFor="filter-product">Filter by product</label>
        <select
          id="filter-product"
          className="select"
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
        >
          <option value="all">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {visiblePlans.length === 0 ? (
        <p className="muted">No plans yet.</p>
      ) : (
        grouped.map((group) => (
          <div key={group.productId} className="mb-3">
            <h2>{productName(group.productId)}</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Duration</th>
                    <th>Price</th>
                    <th>Compare price</th>
                    <th>Active</th>
                    <th>Sort</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.plans.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.duration_months} mo</td>
                      <td>{formatPrice(Number(p.price))}</td>
                      <td>{p.compare_price === null ? '—' : formatPrice(Number(p.compare_price))}</td>
                      <td>
                        <span className={p.active ? 'badge badge-green' : 'badge badge-gray'}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{p.sort_order}</td>
                      <td>
                        <div className="flex flex-wrap">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setEditingId(p.id);
                              setEditForm(toForm(p));
                              setNotice('');
                              setError('');
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleToggleActive(p)}
                          >
                            {p.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(p)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {editingId && (
        <div className="card mb-3">
          <h2>Edit plan</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-row">
              <label className="label" htmlFor="edit-product">Product</label>
              <select id="edit-product" className="select" value={editForm.product_id} onChange={(e) => setEditForm({ ...editForm, product_id: e.target.value })} required>
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-name">Name</label>
              <input id="edit-name" className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-duration">Duration (months)</label>
              <input id="edit-duration" className="input" type="number" min="1" value={editForm.duration_months} onChange={(e) => setEditForm({ ...editForm, duration_months: e.target.value })} required />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-price">Price (USD)</label>
              <input id="edit-price" className="input" type="number" min="0" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-compare">Compare price (USD, empty for none)</label>
              <input id="edit-compare" className="input" type="number" min="0" step="0.01" value={editForm.compare_price} onChange={(e) => setEditForm({ ...editForm, compare_price: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-sort">Sort order</label>
              <input id="edit-sort" className="input" type="number" value={editForm.sort_order} onChange={(e) => setEditForm({ ...editForm, sort_order: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="label">
                <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} /> Active
              </label>
            </div>
            <div className="flex flex-wrap">
              <button type="submit" className="btn btn-primary" disabled={saving}>Save changes</button>
              <button type="button" className="btn" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Add new plan</h2>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <label className="label" htmlFor="add-product">Product</label>
            <select id="add-product" className="select" value={addForm.product_id} onChange={(e) => setAddForm({ ...addForm, product_id: e.target.value })} required>
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-name">Name</label>
            <input id="add-name" className="input" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-duration">Duration (months)</label>
            <input id="add-duration" className="input" type="number" min="1" value={addForm.duration_months} onChange={(e) => setAddForm({ ...addForm, duration_months: e.target.value })} required />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-price">Price (USD)</label>
            <input id="add-price" className="input" type="number" min="0" step="0.01" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} required />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-compare">Compare price (USD, empty for none)</label>
            <input id="add-compare" className="input" type="number" min="0" step="0.01" value={addForm.compare_price} onChange={(e) => setAddForm({ ...addForm, compare_price: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-sort">Sort order</label>
            <input id="add-sort" className="input" type="number" value={addForm.sort_order} onChange={(e) => setAddForm({ ...addForm, sort_order: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="label">
              <input type="checkbox" checked={addForm.active} onChange={(e) => setAddForm({ ...addForm, active: e.target.checked })} /> Active
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>Add plan</button>
        </form>
      </div>
    </div>
  );
}
