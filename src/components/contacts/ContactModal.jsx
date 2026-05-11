import { useState, useEffect } from 'react';
import { X, Phone, MessageCircle, Mail, Send, StickyNote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/ui/StatusBadge';
import MeetingLogger from '@/components/contacts/MeetingLogger';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'History', 'Deals'];

export default function ContactModal({ contact, onClose }) {
  const [tab, setTab] = useState('Overview');
  const [history, setHistory] = useState([]);
  const [deals, setDeals] = useState([]);
  const [note, setNote] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!contact?.id) return;
    Promise.all([
      supabase.from('v_activity_timeline').select('*').eq('contact_id', contact.id).order('event_at', { ascending: false }).limit(20),
      supabase.from('deals').select('*').or(`buyer_id.eq.${contact.id},seller_id.eq.${contact.id}`).limit(10),
    ]).then(([hRes, dRes]) => {
      setHistory(hRes.data || []);
      setDeals(dRes.data || []);
    }).catch(() => {}).finally(() => setLoadingHistory(false));
  }, [contact?.id]);

  function handleLogNote() {
    if (!note.trim()) return;
    // Optimistically add to history
    setHistory(h => [{
      id: Date.now(),
      event_type: 'note',
      description: note,
      event_at: new Date().toISOString(),
    }, ...h]);
    setNote('');
  }

  if (!contact) return null;

  const initials = (contact.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-hairline rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-hairline shrink-0">
          <div className="w-12 h-12 rounded-full bg-evergreen-tint flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-evergreen">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{contact.full_name || 'Unknown'}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {contact.current_tag && <StatusBadge status={contact.current_tag} />}
              {contact.is_client && <StatusBadge status="client" />}
              {contact.primary_email && (
                <span className="text-xs text-muted-foreground">{contact.primary_email}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 px-6 py-3 border-b border-hairline shrink-0 bg-surface/50">
          {contact.primary_phone_normalized && (
            <a href={`tel:${contact.primary_phone_normalized}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-hairline bg-card hover:bg-evergreen-tint hover:border-evergreen hover:text-evergreen transition-all font-medium text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          )}
          {contact.primary_phone_normalized && (
            <a href={`https://wa.me/${contact.primary_phone_normalized?.replace(/\D/g, '')}`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-hairline bg-card hover:bg-evergreen-tint hover:border-evergreen hover:text-evergreen transition-all font-medium text-muted-foreground">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {contact.primary_email && (
            <a href={`mailto:${contact.primary_email}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-hairline bg-card hover:bg-sky-tint hover:border-sky hover:text-sky transition-all font-medium text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> Email
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b border-hairline shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t ? 'border-evergreen text-evergreen' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'Overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Phone', value: contact.primary_phone_normalized },
                  { label: 'Email', value: contact.primary_email },
                  { label: 'Nationality', value: contact.nationality },
                  { label: 'Source', value: contact.lead_source },
                  { label: 'Confidence', value: contact.confidence_score ? `${Math.round(contact.confidence_score * 100)}%` : null },
                  { label: 'Last Contact', value: contact.last_contact_at ? new Date(contact.last_contact_at).toLocaleDateString('en-GB') : null },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="bg-surface rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">{f.label}</div>
                    <div className="text-sm font-medium text-foreground">{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Quick note */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4 text-brass" />
                  <span className="text-sm font-medium text-foreground">Quick Note</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a quick note…"
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors resize-none"
                  />
                  <button onClick={handleLogNote}
                    className="px-3 rounded-lg bg-evergreen text-white hover:bg-evergreen-mid transition-colors self-stretch flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Meeting Logger */}
              <div className="mt-3">
                <MeetingLogger
                  contact={contact}
                  onLogged={(entry, statusChange) => {
                    setHistory(h => [entry, ...h]);
                    if (statusChange) setTab('History');
                  }}
                />
              </div>
            </div>
          )}

          {tab === 'History' && (
            <div>
              {loadingHistory ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />)}</div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">No interaction history found.</div>
              ) : (
                <div className="space-y-0 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-hairline">
                  {history.map((h, i) => (
                    <div key={h.id || i} className="flex items-start gap-4 py-3 relative">
                      <div className="w-5 h-5 rounded-full bg-card border border-hairline flex items-center justify-center shrink-0 relative z-10 mt-0.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full', h.event_type === 'note' ? 'bg-brass' : 'bg-evergreen')} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-foreground">{h.description || h.event_type}</div>
                        <div className="text-xs text-muted-2 mt-0.5 font-mono">
                          {h.event_at ? new Date(h.event_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Deals' && (
            <div>
              {loadingHistory ? (
                <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />)}</div>
              ) : deals.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">No associated deals found.</div>
              ) : (
                <div className="space-y-2">
                  {deals.map(d => (
                    <div key={d.id} className="bg-surface rounded-xl p-3 border border-hairline">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-foreground">{d.deal_title || d.unit_ref || 'Deal'}</div>
                          {d.deal_value && <div className="text-xs font-mono text-muted-foreground mt-0.5">AED {Number(d.deal_value).toLocaleString()}</div>}
                        </div>
                        <StatusBadge status={(d.stage || 'offer').toLowerCase()} label={d.stage} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}