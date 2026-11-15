'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Supplier } from '@/lib/types';

interface SupplierForm {
  name: string;
  contact: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: SupplierForm = { name: '', contact: '', email: '', notes: '' };

export default function AdminSuppliersPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const { data, error: err } = await getSupabase()
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setSuppliers((data as Supplier[]) ?? []);
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contact: s.contact ?? '',
      email: s.email ?? '',
      notes: s.notes ?? '',
    });
    setNotice('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const name = form.name.trim();
    if (!name) {
      setError('Supplier name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name,
      contact: form.contact.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    };
    const supabase = getSupabase();
    const { error: err } = editingId
      ? await supabase.from('suppliers').update(payload).eq('id', editingId)
      : await supabase.from('suppliers').insert(payload);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: editingId ? 'supplier_update' : 'supplier_create',
      details: { name },
    });
    setNotice(editingId ? `Supplier ${name} updated.` : `Supplier ${name} created.`);
    cancelEdit();
    await load();
    setSaving(false);
  }

  async function remove(s: Supplier) {
    if (!user) return;
    if (!window.confirm(`Delete supplier ${s.name}? This cannot be undone.`)) return;
    setError('');
    const { error: err } = await getSupabase().from('suppliers').delete().eq('id', s.id);
    if (err) {
      setError(err.message);
      return;
    }
    await getSupabase().from('activity_logs').insert({
      admin_id: user.id,
      action: 'supplier_delete',
      details: { name: s.name },
    });
    setNotice(`Supplier ${s.name} deleted.`);
    await load();
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Suppliers</h1>
      <p className="muted">People and companies that supply the products sold here.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="card mb-3">
        <h3>{editingId ? 'Edit supplier' : 'New supplier'}</h3>
        <form onSubmit={save}>
          <div className="form-row">
            <label className="label" htmlFor="supplier-name">Name</label>
            <input
              id="supplier-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="supplier-contact">Contact (phone / Telegram / etc.)</label>
            <input
              id="supplier-contact"
              className="input"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="supplier-email">Email</label>
            <input
              id="supplier-email"
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="supplier-notes">Notes</label>
            <textarea
              id="supplier-notes"
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update supplier' : 'Add supplier'}
            </button>
            {editingId && (
              <button className="btn btn-outline" type="button" onClick={cancelEdit}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      {fetching ? (
        <p className="muted">Loading suppliers…</p>
      ) : suppliers.length === 0 ? (
        <p className="notice">No suppliers yet. Add one above.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Notes</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.contact ?? '—'}</td>
                  <td>{s.email ?? '—'}</td>
                  <td className="small">{s.notes ?? '—'}</td>
                  <td className="small">{new Date(s.created_at).toLocaleString()}</td>
                  <td>
                    <div className="flex flex-wrap">
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => startEdit(s)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => remove(s)}>
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
    </div>
  );
}
