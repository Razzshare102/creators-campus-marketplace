'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, Ticket, TicketReply } from '@/lib/types';

type TicketStatus = Ticket['status'];
const STATUS_FILTERS: ('all' | TicketStatus)[] = ['all', 'open', 'in_progress', 'resolved', 'closed'];

function statusBadge(status: string): string {
  if (status === 'open') return 'badge badge-red';
  if (status === 'in_progress') return 'badge badge-amber';
  if (status === 'resolved') return 'badge badge-green';
  return 'badge badge-gray';
}

function priorityBadge(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'high' || p === 'urgent') return 'badge badge-red';
  if (p === 'medium') return 'badge badge-amber';
  return 'badge badge-gray';
}

export default function AdminTicketsPage() {
  const { user, loading } = useAuth();
  const configured = isSupabaseConfigured();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [emailByUserId, setEmailByUserId] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [fetching, setFetching] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    setFetching(true);
    setError('');
    const supabase = getSupabase();
    let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const [ticketRes, profRes] = await Promise.all([
      query,
      supabase.from('profiles').select('id, email'),
    ]);
    if (ticketRes.error) {
      setError(ticketRes.error.message);
      setFetching(false);
      return;
    }
    if (profRes.error) setError(profRes.error.message);
    const map: Record<string, string> = {};
    (((profRes.data as Pick<Profile, 'id' | 'email'>[] | null) ?? [])).forEach((p) => {
      map[p.id] = p.email;
    });
    setEmailByUserId(map);
    setTickets((ticketRes.data as Ticket[]) ?? []);
    setFetching(false);
  }, [configured, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleExpand(t: Ticket) {
    if (expandedId === t.id) {
      setExpandedId(null);
      setReplies([]);
      setReplyText('');
      return;
    }
    setExpandedId(t.id);
    setReplyText('');
    setLoadingReplies(true);
    setError('');
    const { data, error: err } = await getSupabase()
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', t.id)
      .order('created_at', { ascending: true });
    if (err) setError(err.message);
    else setReplies((data as TicketReply[]) ?? []);
    setLoadingReplies(false);
  }

  async function sendReply(t: Ticket) {
    if (!user) return;
    const message = replyText.trim();
    if (!message) {
      setError('Reply message is required.');
      return;
    }
    setSending(true);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { error: insErr } = await supabase.from('ticket_replies').insert({
      ticket_id: t.id,
      user_id: user.id,
      message,
    });
    if (insErr) {
      setError(insErr.message);
      setSending(false);
      return;
    }
    if (t.status !== 'resolved' && t.status !== 'closed') {
      await supabase.from('tickets').update({ status: 'in_progress' }).eq('id', t.id);
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: 'ticket_reply',
      details: { ticket_id: t.id, subject: t.subject },
    });
    setNotice('Reply sent.');
    setReplyText('');
    const { data } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', t.id)
      .order('created_at', { ascending: true });
    setReplies((data as TicketReply[]) ?? []);
    await load();
    setSending(false);
  }

  async function setTicketStatus(t: Ticket, status: TicketStatus) {
    if (!user) return;
    setActingId(t.id);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    const { error: err } = await supabase.from('tickets').update({ status }).eq('id', t.id);
    if (err) {
      setError(err.message);
      setActingId(null);
      return;
    }
    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      action: 'ticket_status_change',
      details: { ticket_id: t.id, subject: t.subject, old_status: t.status, new_status: status },
    });
    setNotice(`Ticket "${t.subject}" marked ${status}.`);
    await load();
    setActingId(null);
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!configured) return <p className="notice">Connect Supabase to use the admin.</p>;
  if (!user) return <p className="notice">Sign in to use the admin.</p>;

  return (
    <div>
      <h1>Support tickets</h1>
      <p className="muted">Click a ticket to read its replies and answer it. Replying moves an open ticket to in progress.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="card mb-2">
        <label className="label" htmlFor="ticket-status-filter">Filter by status</label>
        <select
          id="ticket-status-filter"
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | TicketStatus)}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
          ))}
        </select>
      </div>

      {fetching ? (
        <p className="muted">Loading tickets…</p>
      ) : tickets.length === 0 ? (
        <p className="notice">No tickets found.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <Fragment key={t.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleExpand(t)}
                        aria-expanded={expandedId === t.id}
                      >
                        {expandedId === t.id ? 'Hide' : 'View'}
                      </button>{' '}
                      <strong>{t.subject}</strong>
                    </td>
                    <td className="small">{emailByUserId[t.user_id] ?? t.user_id}</td>
                    <td><span className={statusBadge(t.status)}>{t.status}</span></td>
                    <td><span className={priorityBadge(t.priority)}>{t.priority}</span></td>
                    <td className="small">{new Date(t.created_at).toLocaleString()}</td>
                    <td>
                      <div className="flex flex-wrap">
                        {t.status !== 'resolved' && (
                          <button
                            className="btn btn-success btn-sm"
                            type="button"
                            disabled={actingId === t.id}
                            onClick={() => setTicketStatus(t, 'resolved')}
                          >
                            Resolve
                          </button>
                        )}
                        {t.status !== 'closed' && (
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={actingId === t.id}
                            onClick={() => setTicketStatus(t, 'closed')}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={6}>
                        {loadingReplies ? (
                          <p className="muted">Loading replies…</p>
                        ) : replies.length === 0 ? (
                          <p className="muted small">No replies yet.</p>
                        ) : (
                          replies.map((r) => (
                            <div className="card mb-1" key={r.id}>
                              <p className="small muted mb-1">
                                {r.user_id === user.id
                                  ? 'You (admin)'
                                  : emailByUserId[r.user_id] ?? r.user_id}
                                {' · '}
                                {new Date(r.created_at).toLocaleString()}
                              </p>
                              <p>{r.message}</p>
                            </div>
                          ))
                        )}
                        {t.status !== 'closed' && (
                          <div className="mt-2">
                            <label className="label" htmlFor={`reply-${t.id}`}>Reply as admin</label>
                            <textarea
                              id={`reply-${t.id}`}
                              className="input"
                              rows={3}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your reply…"
                            />
                            <button
                              className="btn btn-primary mt-1"
                              type="button"
                              disabled={sending}
                              onClick={() => sendReply(t)}
                            >
                              {sending ? 'Sending…' : 'Send reply'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
