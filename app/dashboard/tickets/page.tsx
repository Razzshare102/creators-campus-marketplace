'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Ticket, TicketReply } from '@/lib/types';

function ticketBadgeClass(status: string): string {
  if (status === 'resolved') return 'badge-green';
  if (status === 'in_progress') return 'badge-blue';
  if (status === 'closed') return 'badge-gray';
  return 'badge-amber';
}

export default function TicketsPage() {
  const { user, loading, configured } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(false);

  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formBusy, setFormBusy] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, TicketReply[]>>({});
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    setLoadingTickets(true);
    const { data, error: qError } = await getSupabase()
      .from('tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLoadingTickets(false);
    if (qError) {
      setError('Could not load your tickets. Please try again.');
      return;
    }
    setTickets((data as Ticket[] | null) ?? []);
  }, [user]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function loadReplies(ticketId: string) {
    if (!isSupabaseConfigured()) return;
    const { data, error: qError } = await getSupabase()
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (qError) {
      setReplyError('Could not load replies. Please try again.');
      return;
    }
    setReplies((prev) => ({ ...prev, [ticketId]: (data as TicketReply[] | null) ?? [] }));
  }

  async function toggleTicket(ticketId: string) {
    if (expandedId === ticketId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ticketId);
    setReplyText('');
    setReplyError('');
    if (!replies[ticketId]) await loadReplies(ticketId);
  }

  async function handleNewTicket(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setFormError('');
    setFormSuccess('');
    if (!subject.trim() || !message.trim()) {
      setFormError('Please fill in a subject and a message.');
      return;
    }
    setFormBusy(true);
    const supabase = getSupabase();
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({ user_id: user.id, subject: subject.trim(), priority, status: 'open' })
      .select('*')
      .single();
    if (ticketError || !ticket) {
      setFormError(ticketError?.message ?? 'Could not create the ticket. Please try again.');
      setFormBusy(false);
      return;
    }
    const { error: replyError } = await supabase
      .from('ticket_replies')
      .insert({ ticket_id: (ticket as Ticket).id, user_id: user.id, message: message.trim() });
    setFormBusy(false);
    if (replyError) {
      setFormError(replyError.message);
      return;
    }
    setFormSuccess('Ticket created. Our team will reply here.');
    setSubject('');
    setPriority('normal');
    setMessage('');
    await loadTickets();
  }

  async function handleReply(e: FormEvent, ticketId: string) {
    e.preventDefault();
    if (!user) return;
    setReplyError('');
    if (!replyText.trim()) {
      setReplyError('Please write a reply.');
      return;
    }
    setReplyBusy(true);
    const { error: insertError } = await getSupabase()
      .from('ticket_replies')
      .insert({ ticket_id: ticketId, user_id: user.id, message: replyText.trim() });
    setReplyBusy(false);
    if (insertError) {
      setReplyError(insertError.message);
      return;
    }
    setReplyText('');
    await loadReplies(ticketId);
  }

  if (loading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="container">
        <h1>Support tickets</h1>
        <p className="notice">Connect Supabase to use this feature — tickets need Supabase connected.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Support tickets</h1>
        <p className="notice">
          Please <Link href="/auth/login">log in</Link> to view your support tickets.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Support tickets</h1>
      {error && <p className="error">{error}</p>}

      <div className="card mb-3">
        <h2>New ticket</h2>
        {formSuccess && <p className="success">{formSuccess}</p>}
        <form onSubmit={handleNewTicket}>
          {formError && <p className="error">{formError}</p>}
          <div className="form-row">
            <label className="label" htmlFor="ticket-subject">
              Subject
            </label>
            <input
              id="ticket-subject"
              className="input"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={formBusy}
            />
          </div>
          <div className="form-row">
            <label className="label" htmlFor="ticket-priority">
              Priority
            </label>
            <select
              id="ticket-priority"
              className="select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={formBusy}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-row">
            <label className="label" htmlFor="ticket-message">
              Message
            </label>
            <textarea
              id="ticket-message"
              className="input"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={formBusy}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={formBusy}>
            {formBusy ? 'Creating…' : 'Create ticket'}
          </button>
        </form>
      </div>

      {loadingTickets ? (
        <p className="muted">Loading tickets…</p>
      ) : tickets.length === 0 ? (
        <p className="muted">You have no support tickets yet.</p>
      ) : (
        tickets.map((ticket) => (
          <div key={ticket.id} className="card mb-2">
            <div className="flex-between">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => toggleTicket(ticket.id)}
                aria-expanded={expandedId === ticket.id}
              >
                {expandedId === ticket.id ? 'Hide replies' : 'View replies'}
              </button>
              <span className={`badge ${ticketBadgeClass(ticket.status)}`}>{ticket.status}</span>
            </div>
            <h3 className="mt-2">{ticket.subject}</h3>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Priority: {ticket.priority} · {new Date(ticket.created_at).toLocaleString()}
            </p>
            {expandedId === ticket.id && (
              <div className="mt-2">
                {(replies[ticket.id] ?? []).length === 0 ? (
                  <p className="muted">No replies yet.</p>
                ) : (
                  replies[ticket.id].map((reply) => (
                    <div key={reply.id} className="card mb-1">
                      <p className="small mb-1" style={{ fontWeight: 700 }}>
                        {reply.user_id === user.id ? 'You' : 'Support'} ·{' '}
                        <span className="muted">{new Date(reply.created_at).toLocaleString()}</span>
                      </p>
                      <p style={{ marginBottom: 0 }}>{reply.message}</p>
                    </div>
                  ))
                )}
                <form onSubmit={(e) => handleReply(e, ticket.id)} className="mt-2">
                  {replyError && <p className="error">{replyError}</p>}
                  <div className="form-row">
                    <label className="label" htmlFor={`reply-${ticket.id}`}>
                      Reply
                    </label>
                    <textarea
                      id={`reply-${ticket.id}`}
                      className="input"
                      rows={3}
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={replyBusy}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={replyBusy}>
                    {replyBusy ? 'Sending…' : 'Send reply'}
                  </button>
                </form>
              </div>
            )}
          </div>
        ))
      )}
      <p className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </div>
  );
}
