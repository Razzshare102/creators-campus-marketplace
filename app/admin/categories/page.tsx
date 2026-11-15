'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Category } from '@/lib/types';

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  active: boolean;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  sort_order: '0',
  active: true,
};

function toForm(c: Category): CategoryForm {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    sort_order: String(c.sort_order),
    active: c.active,
  };
}

function toRow(f: CategoryForm) {
  return {
    name: f.name.trim(),
    slug: f.slug.trim(),
    description: f.description.trim() || null,
    sort_order: Number(f.sort_order) || 0,
    active: f.active,
  };
}

export default function AdminCategoriesPage() {
  const configured = isSupabaseConfigured();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryForm>(EMPTY_FORM);
  const [addForm, setAddForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const { data, error: err } = await getSupabase()
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (err) setError(err.message);
    else setCategories((data ?? []) as Category[]);
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

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    const { data, error: err } = await getSupabase()
      .from('categories')
      .insert(toRow(addForm))
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('category.create', { category_id: data.id, name: addForm.name });
    setAddForm(EMPTY_FORM);
    setNotice('Category added.');
    await load();
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setNotice('');
    setSaving(true);
    const { error: err } = await getSupabase()
      .from('categories')
      .update(toRow(editForm))
      .eq('id', editingId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('category.update', { category_id: editingId, name: editForm.name });
    setEditingId(null);
    setNotice('Category updated.');
    await load();
  };

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    const { error: err } = await getSupabase().from('categories').delete().eq('id', c.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('category.delete', { category_id: c.id, name: c.name });
    setNotice('Category deleted.');
    await load();
  };

  const handleToggleActive = async (c: Category) => {
    setError('');
    const { error: err } = await getSupabase()
      .from('categories')
      .update({ active: !c.active })
      .eq('id', c.id);
    if (err) {
      setError(err.message);
      return;
    }
    await logActivity('category.update', {
      category_id: c.id,
      name: c.name,
      active: !c.active,
    });
    await load();
  };

  if (!configured) {
    return (
      <div>
        <h1>Categories</h1>
        <p className="notice">Connect Supabase to use the admin.</p>
      </div>
    );
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Categories</h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {categories.length === 0 ? (
        <p className="muted">No categories yet.</p>
      ) : (
        <div className="table-wrap mb-3">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Sort</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td>{c.description ?? '—'}</td>
                  <td>{c.sort_order}</td>
                  <td>
                    <span className={c.active ? 'badge badge-green' : 'badge badge-gray'}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditForm(toForm(c));
                          setNotice('');
                          setError('');
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleToggleActive(c)}
                      >
                        {c.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(c)}
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
          <h2>Edit category</h2>
          <form onSubmit={handleUpdate}>
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
        <h2>Add new category</h2>
        <form onSubmit={handleAdd}>
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
            <label className="label" htmlFor="add-sort">Sort order</label>
            <input id="add-sort" className="input" type="number" value={addForm.sort_order} onChange={(e) => setAddForm({ ...addForm, sort_order: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="label">
              <input type="checkbox" checked={addForm.active} onChange={(e) => setAddForm({ ...addForm, active: e.target.checked })} /> Active
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>Add category</button>
        </form>
      </div>
    </div>
  );
}
