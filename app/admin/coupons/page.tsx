'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatPrice } from '@/lib/catalog';
import type { Coupon } from '@/lib/types';

interface CouponForm {
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  min_order: string;
  max_uses: string;
  expires_at: string;
  active: boolean;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  type: 'percent',
  value: '',
  min_order: '0',
  max_uses: '',
  expires_at: '',
  active: true,
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

export default function AdminCouponsPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
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
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setCoupons((data as Coupon[]) ?? []);
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(c: Coupon) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      min_order: String(c.min_order ?? 0),
      max_uses: c.max_uses === null ? '' : String(c.max_uses),
      expires_at: toDatetimeLocal(c.expires_at),
      active: c.active,
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
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const minOrder = Number(form.min_order || 0);
    if (!code) {
      setError('Coupon code is required.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Value must be a number greater than 0.');
      return;
    }
    if (form.type === 'percent' && value > 100) {
      setError('A percent coupon cannot be more than 100.');
      return;
    }
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      setError('Minimum order must be 0 or more.');
      return;
    }
    const maxUses = form.max_uses.trim() === '' ? null : Number(form.max_uses);
    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) {
      setError('Max uses must be empty or a whole number of 1 or more.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      code,
      type: form.type,
      value,
      min_order: minOrder,
      max_uses: maxUses,
      expires_at: form.expires_at.trim() === '' ? null : new Date(form.expires_at).toISOString(),
      active: form.active,
    };
    const supabase = getSupabase();
    const { error: err } = editingId
      ? await supabase.from('coupons').update(payload).eq('id', editingId)
      : await supabase.from('coupons').insert(payload);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: editingId ? 'coupon_update' : 'coupon_create',
      details: { code, type: payload.type, value: payload.value },
    });
    setNotice(editingId ? `Coupon ${code} updated.` : `Coupon ${code} created.`);
    cancelEdit();
    await load();
    setSaving(false);
  }

  async function remove(c: Coupon) {
    if (!user) return;
    if (!window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    setError('');
    const { error: err } = await getSupabase().from('coupons').delete().eq('id', c.id);
    if (err) {
      setError(err.message);
      return;
    }
    await getSupabase().from('activity_logs').insert({
      admin_id: user.id,
      action: 'coupon_delete',
      details: { code: c.code },
    });
    setNotice(`Coupon ${c.code} deleted.`);
    await load();
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Coupons</h1>
      <p className="muted">Discount codes for checkout. Codes are stored in uppercase.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="card mb-3">
        <h3>{editingId ? 'Edit coupon' : 'New coupon'}</h3>
        <form onSubmit={save}>
          <div className="form-row">
            <label className="label" htmlFor="coupon-code">Code</label>
            <input
              id="coupon-code"
              className="input"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME10"
              required
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="coupon-type">Type</label>
            <select
              id="coupon-type"
              className="select"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed amount ($)</option>
            </select>
          </div>
          <div className="form-row">
            <label className="label" htmlFor="coupon-value">
              Value {form.type === 'percent' ? '(%)' : '($)'}
            </label>
            <input
              id="coupon-value"
              className="input"
              type="number"
              min="0"
              step="any"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="coupon-min-order">Minimum order ($)</label>
            <input
              id="coupon-min-order"
              className="input"
              type="number"
              min="0"
              step="any"
              value={form.min_order}
              onChange={(e) => setForm({ ...form, min_order: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="coupon-max-uses">Max uses (empty = unlimited)</label>
            <input
              id="coupon-max-uses"
              className="input"
              type="number"
              min="1"
              step="1"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="coupon-expires">Expires at (empty = never)</label>
            <input
              id="coupon-expires"
              className="input"
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="label flex">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="flex flex-wrap">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update coupon' : 'Create coupon'}
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
        <p className="muted">Loading coupons…</p>
      ) : coupons.length === 0 ? (
        <p className="notice">No coupons yet. Create one above.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min order</th>
                <th>Used</th>
                <th>Max uses</th>
                <th>Expires</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong></td>
                  <td>{c.type}</td>
                  <td>{c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}</td>
                  <td>{formatPrice(c.min_order ?? 0)}</td>
                  <td>{c.used_count}</td>
                  <td>{c.max_uses === null ? '—' : c.max_uses}</td>
                  <td className="small">{c.expires_at ? new Date(c.expires_at).toLocaleString() : '—'}</td>
                  <td>
                    <span className={c.active ? 'badge badge-green' : 'badge badge-gray'}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap">
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => remove(c)}>
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
