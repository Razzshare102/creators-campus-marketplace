'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { EMPTY_PAYMENT_ACCOUNTS } from '@/lib/types';
import type { PaymentAccounts } from '@/lib/types';

interface SiteSettings {
  name: string;
  tagline: string;
  currency: string;
}

const EMPTY_SITE: SiteSettings = { name: '', tagline: '', currency: 'USD' };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export default function AdminSettingsPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [site, setSite] = useState<SiteSettings>(EMPTY_SITE);
  const [accounts, setAccounts] = useState<PaymentAccounts>(EMPTY_PAYMENT_ACCOUNTS);
  const [fetching, setFetching] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [savingAccounts, setSavingAccounts] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const { data, error: err } = await getSupabase().from('settings').select('key, value');
    if (err) {
      setError(err.message);
      setFetching(false);
      return;
    }
    const rows = (data as { key: string; value: unknown }[] | null) ?? [];
    rows.forEach((row) => {
      if (row.key === 'site' && isRecord(row.value)) {
        setSite({
          name: typeof row.value.name === 'string' ? row.value.name : '',
          tagline: typeof row.value.tagline === 'string' ? row.value.tagline : '',
          currency: typeof row.value.currency === 'string' && row.value.currency ? row.value.currency : 'USD',
        });
      }
      if (row.key === 'payment_accounts' && isRecord(row.value)) {
        setAccounts({
          usdt_address: typeof row.value.usdt_address === 'string' ? row.value.usdt_address : '',
          usdc_address: typeof row.value.usdc_address === 'string' ? row.value.usdc_address : '',
          bnb_address: typeof row.value.bnb_address === 'string' ? row.value.bnb_address : '',
          binance_pay_id: typeof row.value.binance_pay_id === 'string' ? row.value.binance_pay_id : '',
          bkash_number: typeof row.value.bkash_number === 'string' ? row.value.bkash_number : '',
          nagad_number: typeof row.value.nagad_number === 'string' ? row.value.nagad_number : '',
        });
      }
    });
    setFetching(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSetting(key: string, value: unknown) {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from('settings').select('id').eq('key', key).single();
    if (existing && typeof (existing as { id: string }).id === 'string') {
      const { error } = await supabase
        .from('settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', (existing as { id: string }).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('settings').insert({ key, value });
      if (error) throw new Error(error.message);
    }
  }

  async function logActivity(action: string, details: Record<string, unknown>) {
    if (!user) return;
    await getSupabase().from('activity_logs').insert({
      admin_id: user.id,
      action,
      details,
    });
  }

  async function saveSite(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingSite(true);
    setError('');
    setNotice('');
    try {
      await saveSetting('site', {
        name: site.name.trim(),
        tagline: site.tagline.trim(),
        currency: site.currency.trim() || 'USD',
      });
      await logActivity('settings_site_update', { name: site.name.trim(), currency: site.currency.trim() || 'USD' });
      setNotice('Site settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save site settings.');
    }
    setSavingSite(false);
  }

  async function saveAccounts(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingAccounts(true);
    setError('');
    setNotice('');
    try {
      const value: PaymentAccounts = {
        usdt_address: accounts.usdt_address.trim(),
        usdc_address: accounts.usdc_address.trim(),
        bnb_address: accounts.bnb_address.trim(),
        binance_pay_id: accounts.binance_pay_id.trim(),
        bkash_number: accounts.bkash_number.trim(),
        nagad_number: accounts.nagad_number.trim(),
      };
      await saveSetting('payment_accounts', value);
      await logActivity('settings_payment_accounts_update', {
        methods_set: Object.entries(value)
          .filter(([, v]) => v !== '')
          .map(([k]) => k),
      });
      setNotice('Payment receiving accounts saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment accounts.');
    }
    setSavingAccounts(false);
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Settings</h1>
      <p className="muted">Site details and the payment accounts customers send money to.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}
      {fetching && <p className="muted">Loading settings…</p>}

      <div className="card mb-3">
        <h3>Site settings</h3>
        <form onSubmit={saveSite}>
          <div className="form-row">
            <label className="label" htmlFor="site-name">Site name</label>
            <input
              id="site-name"
              className="input"
              value={site.name}
              onChange={(e) => setSite({ ...site, name: e.target.value })}
              placeholder="Creators Campus"
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="site-tagline">Tagline</label>
            <input
              id="site-tagline"
              className="input"
              value={site.tagline}
              onChange={(e) => setSite({ ...site, tagline: e.target.value })}
              placeholder="Your Digital Premium Marketplace"
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="site-currency">Currency</label>
            <input
              id="site-currency"
              className="input"
              value={site.currency}
              onChange={(e) => setSite({ ...site, currency: e.target.value })}
              placeholder="USD"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingSite}>
            {savingSite ? 'Saving…' : 'Save site settings'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Payment receiving accounts</h3>
        <p className="notice">Leave a field empty if you do not use that method.</p>
        <form onSubmit={saveAccounts}>
          <div className="form-row">
            <label className="label" htmlFor="acct-usdt">USDT address</label>
            <input
              id="acct-usdt"
              className="input"
              value={accounts.usdt_address}
              onChange={(e) => setAccounts({ ...accounts, usdt_address: e.target.value })}
              placeholder=""
              autoComplete="off"
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="acct-usdc">USDC address</label>
            <input
              id="acct-usdc"
              className="input"
              value={accounts.usdc_address}
              onChange={(e) => setAccounts({ ...accounts, usdc_address: e.target.value })}
              placeholder=""
              autoComplete="off"
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="acct-bnb">BNB address</label>
            <input
              id="acct-bnb"
              className="input"
              value={accounts.bnb_address}
              onChange={(e) => setAccounts({ ...accounts, bnb_address: e.target.value })}
              placeholder=""
              autoComplete="off"
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="acct-binance-pay">Binance Pay ID</label>
            <input
              id="acct-binance-pay"
              className="input"
              value={accounts.binance_pay_id}
              onChange={(e) => setAccounts({ ...accounts, binance_pay_id: e.target.value })}
              placeholder=""
              autoComplete="off"
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="acct-bkash">bKash number</label>
            <input
              id="acct-bkash"
              className="input"
              value={accounts.bkash_number}
              onChange={(e) => setAccounts({ ...accounts, bkash_number: e.target.value })}
              placeholder=""
              autoComplete="off"
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="acct-nagad">Nagad number</label>
            <input
              id="acct-nagad"
              className="input"
              value={accounts.nagad_number}
              onChange={(e) => setAccounts({ ...accounts, nagad_number: e.target.value })}
              placeholder=""
              autoComplete="off"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingAccounts}>
            {savingAccounts ? 'Saving…' : 'Save payment accounts'}
          </button>
        </form>
      </div>
    </div>
  );
}
