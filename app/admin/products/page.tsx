'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Category, DeliveryType, Product } from '@/lib/types';

interface ProductForm {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  features: string;
  delivery_type: DeliveryType;
  delivery_instructions: string;
  stock: string;
  active: boolean;
  sort_order: string;
}

const EMPTY_FORM: ProductForm = {
  category_id: '',
  name: '',
  slug: '',
  description: '',
  features: '',
  delivery_type: 'manual',
  delivery_instructions: '',
  stock: '0',
  active: true,
  sort_order: '0',
};

function toForm(p: Product): ProductForm {
  return {
    category_id: p.category_id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? '',
    features: (p.features ?? []).join(', '),
    delivery_type: p.delivery_type,
    delivery_instructions: p.delivery_instructions ?? '',
    stock: String(p.stock),
    active: p.active,
    sort_order: String(p.sort_order),
  };
}

function toRow(f: ProductForm) {
  return {
    category_id: f.category_id || null,
    name: f.name.trim(),
    slug: f.slug.trim(),
    description: f.description.trim(),
    features: f.features
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    delivery_type: f.delivery_type,
    delivery_instructions: f.delivery_instructions.trim() || null,
    stock: Number(f.stock) || 0,
    active: f.active,
    sort_order: Number(f.sort_order) || 0,
  };
}

export default function AdminProductsPage() {
  const configured = isSupabaseConfigured();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM);
  const [addForm, setAddForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    const [pRes, cRes] = await Promise.all([
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    ]);
    if (pRes.error) {
      setError(pRes.error.message);
    } else {
      setProducts((pRes.data ?? []) as Product[]);
    }
    if (!cRes.error) setCategories((cRes.data ?? []) as Category[]);
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

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? '—';

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!addForm.category_id) {
      setError('Please choose a category.');
      return;
    }
    setSaving(true);
    const supabase = getSupabase();
    const { data, error: err } = await supabase
      .from('products')
      .insert(toRow(addForm))
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('product.create', { product_id: data.id, name: addForm.name });
    setAddForm(EMPTY_FORM);
    setNotice('Product added.');
    await load();
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setNotice('');
    setSaving(true);
    const supabase = getSupabase();
    const { error: err } = await supabase
      .from('products')
      .update(toRow(editForm))
      .eq('id', editingId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('product.update', { product_id: editingId, name: editForm.name });
    setEditingId(null);
    setNotice('Product updated.');
    await load();
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Delete product "${p.name}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    const { error: err } = await getSupabase().from('products').delete().eq('id', p.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('product.delete', { product_id: p.id, name: p.name });
    setNotice('Product deleted.');
    await load();
  };

  const handleToggleActive = async (p: Product) => {
    setError('');
    const { error: err } = await getSupabase()
      .from('products')
      .update({ active: !p.active })
      .eq('id', p.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('product.update', {
      product_id: p.id,
      name: p.name,
      active: !p.active,
    });
    await load();
  };

  if (!configured) {
    return (
      <div>
        <h1>Products</h1>
        <p className="notice">Connect Supabase to use the admin.</p>
      </div>
    );
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Products</h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {products.length === 0 ? (
        <p className="muted">No products yet.</p>
      ) : (
        <div className="table-wrap mb-3">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Delivery</th>
                <th>Active</th>
                <th>Sort</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{categoryName(p.category_id)}</td>
                  <td>{p.stock}</td>
                  <td>{p.delivery_type}</td>
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
      )}

      {editingId && (
        <div className="card mb-3">
          <h2>Edit product</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-row">
              <label className="label" htmlFor="edit-category">Category</label>
              <select
                id="edit-category"
                className="select"
                value={editForm.category_id}
                onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-name">Name</label>
              <input id="edit-name" className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-slug">Slug</label>
              <input id="edit-slug" className="input" value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} required />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-description">Description</label>
              <textarea id="edit-description" className="input" rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-features">Features (comma-separated)</label>
              <input id="edit-features" className="input" value={editForm.features} onChange={(e) => setEditForm({ ...editForm, features: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-delivery">Delivery type</label>
              <select id="edit-delivery" className="select" value={editForm.delivery_type} onChange={(e) => setEditForm({ ...editForm, delivery_type: e.target.value as DeliveryType })}>
                <option value="manual">Manual</option>
                <option value="activation_code">Activation code</option>
              </select>
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-instructions">Delivery instructions</label>
              <textarea id="edit-instructions" className="input" rows={3} value={editForm.delivery_instructions} onChange={(e) => setEditForm({ ...editForm, delivery_instructions: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="label" htmlFor="edit-stock">Stock</label>
              <input id="edit-stock" className="input" type="number" min="0" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} />
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
        <h2>Add new product</h2>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <label className="label" htmlFor="add-category">Category</label>
            <select id="add-category" className="select" value={addForm.category_id} onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })} required>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-name">Name</label>
            <input id="add-name" className="input" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-slug">Slug</label>
            <input id="add-slug" className="input" value={addForm.slug} onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })} required />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-description">Description</label>
            <textarea id="add-description" className="input" rows={3} value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-features">Features (comma-separated)</label>
            <input id="add-features" className="input" value={addForm.features} onChange={(e) => setAddForm({ ...addForm, features: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-delivery">Delivery type</label>
            <select id="add-delivery" className="select" value={addForm.delivery_type} onChange={(e) => setAddForm({ ...addForm, delivery_type: e.target.value as DeliveryType })}>
              <option value="manual">Manual</option>
              <option value="activation_code">Activation code</option>
            </select>
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-instructions">Delivery instructions</label>
            <textarea id="add-instructions" className="input" rows={3} value={addForm.delivery_instructions} onChange={(e) => setAddForm({ ...addForm, delivery_instructions: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="add-stock">Stock</label>
            <input id="add-stock" className="input" type="number" min="0" value={addForm.stock} onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })} />
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
          <button type="submit" className="btn btn-primary" disabled={saving}>Add product</button>
        </form>
      </div>
    </div>
  );
}
