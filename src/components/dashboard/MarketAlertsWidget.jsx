import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, BellRing, TrendingUp, Building2, Loader2, Send, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function AlertRow({ alert }) {
  const isNew = !alert.seen;
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 border-b border-hairline last:border-0 transition-colors', isNew && 'bg-brass-tint/30')}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', isNew ? 'bg-brass-tint' : 'bg-surface')}>
        <TrendingUp className={cn('w-3.5 h-3.5', isNew ? 'text-brass' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground leading-tight">{alert.project || alert.master_project_name || 'Market Update'}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.summary}</div>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-2">
          {alert.zone && <span>{alert.zone}</span>}
          {alert.avg_price_per_sqft && <span>AED {Number(alert.avg_price_per_sqft).toLocaleString()}/sqft avg</span>}
          {alert.transaction_count && <span>{alert.transaction_count} txns</span>}
        </div>
      </div>
      {isNew && <span className="w-2 h-2 rounded-full bg-brass shrink-0 mt-2" />}
    </div>
  );
}

function NotifyModal({ alerts, onClose, onSent }) {
  const [channel, setChannel] = useState('email');
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSend() {
    if (!recipient.trim()) return;
    setSending(true);
    const summary = alerts.slice(0, 5).map((a, i) =>
      `${i + 1}. *${a.project || a.master_project_name || 'Update'}* (${a.zone || ''}): ${a.summary}`
    ).join('\n');

    const body = `🏙️ *Raco AI — Market Alerts*\n\nHere are the latest updates in your assigned areas:\n\n${summary}\n\n_Sent via Raco AI Platform_`;

    await base44.integrations.Core.SendEmail({
      to: recipient,
      subject: 'Raco AI — Market Alerts for Your Areas',
      body: body.replace(/\*/g, '').replace(/_/g, ''),
    });

    setSending(false);
    setDone(true);
    setTimeout(() => { setDone(false); onSent(); onClose(); }, 1500);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div className="text-sm font-semibold text-foreground">Send Market Alert</div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="w-8 h-8 text-evergreen" />
              <div className="text-sm font-medium text-foreground">Alert sent!</div>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                Send a summary of {Math.min(alerts.length, 5)} market updates to:
              </div>
              <input
                type="email"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="recipient@email.com"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-hairline bg-surface focus:outline-none focus:border-evergreen transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!recipient.trim() || sending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-evergreen text-white text-sm font-semibold hover:bg-evergreen-mid transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending…' : 'Send via Email'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketAlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotify, setShowNotify] = useState(false);
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('raco_seen_alerts') || '[]')); }
    catch { return new Set(); }
  });

  function buildAlerts(insights) {
    // Turn project intelligence rows into alert summaries
    return insights.map(row => {
      const parts = [];
      if (row.avg_price_per_sqft) parts.push(`avg AED ${Number(row.avg_price_per_sqft).toLocaleString()}/sqft`);
      if (row.transaction_count) parts.push(`${row.transaction_count} recent transactions`);
      if (row.price_trend) parts.push(`trend: ${row.price_trend}`);
      const summary = parts.length > 0 ? parts.join(' · ') : 'Market data updated';
      return {
        id: row.id || row.project,
        project: row.project,
        master_project_name: row.master_project_name,
        zone: row.final_zone_name || row.zone,
        avg_price_per_sqft: row.avg_price_per_sqft,
        transaction_count: row.transaction_count,
        summary,
        seen: seenIds.has(row.id || row.project),
      };
    }).sort((a, b) => a.seen - b.seen); // unseen first
  }

  useEffect(() => {
    base44.functions.invoke('getMarketInsights', {})
      .then(res => {
        const insights = res.data?.insights || [];
        setAlerts(buildAlerts(insights));
      })
      .finally(() => setLoading(false));
  }, []);

  function markAllSeen() {
    const newSeen = new Set([...seenIds, ...alerts.map(a => a.id)]);
    setSeenIds(newSeen);
    localStorage.setItem('raco_seen_alerts', JSON.stringify([...newSeen]));
    setAlerts(prev => prev.map(a => ({ ...a, seen: true })));
  }

  const unseenCount = alerts.filter(a => !a.seen).length;

  return (
    <>
      <div className="bg-card border border-hairline rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-gradient-to-r from-brass-tint to-transparent">
          <div className="flex items-center gap-2">
            {unseenCount > 0
              ? <BellRing className="w-4 h-4 text-brass" />
              : <Bell className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm font-semibold text-foreground">Market Alerts</span>
            {unseenCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brass text-white text-[10px] font-bold">{unseenCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unseenCount > 0 && (
              <button onClick={markAllSeen} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Mark read
              </button>
            )}
            {alerts.length > 0 && (
              <button
                onClick={() => setShowNotify(true)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-evergreen text-white hover:bg-evergreen-mid transition-colors font-medium"
              >
                <Send className="w-3 h-3" /> Notify
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Building2 className="w-6 h-6" />
            <span className="text-xs">No market data for your areas yet</span>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {alerts.slice(0, 10).map(alert => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {showNotify && (
        <NotifyModal
          alerts={alerts.filter(a => !a.seen).length > 0 ? alerts.filter(a => !a.seen) : alerts}
          onClose={() => setShowNotify(false)}
          onSent={markAllSeen}
        />
      )}
    </>
  );
}