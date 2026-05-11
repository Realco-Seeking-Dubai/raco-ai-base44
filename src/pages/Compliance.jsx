import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getAuditLog } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Shield, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Compliance() {
  const { user } = useAuth();
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vetoesOnly, setVetoesOnly] = useState(false);

  useEffect(() => {
    getAuditLog()
      .then(setLog)
      .catch(() => setLog([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = vetoesOnly ? log.filter(e => e.status === 'vetoed') : log;

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Compliance & Audit"
        subtitle="Outbound message log, vetoes, and audit trail"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Listing compliance" value="98%" icon={Shield} color="evergreen" />
        <KpiCard label="Consent coverage" value="94%" icon={Shield} color="brass" />
        <KpiCard label="Vetoes (30d)" value={log.filter(e => e.status === 'vetoed').length} icon={Shield} color="terracotta" />
        <KpiCard label="Audit issues" value={log.filter(e => e.severity === 'high').length} icon={Shield} color="sky" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
        <button
          onClick={() => setVetoesOnly(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium',
            vetoesOnly ? 'border-terracotta bg-terracotta-tint text-terracotta' : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Filter className="w-3 h-3" />
          {vetoesOnly ? 'Showing vetoes only' : 'Show vetoes only'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No audit entries" body="Compliance events will appear here as they occur." />
      ) : (
        <div className="bg-card border border-hairline rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Event</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((e, i) => (
                <tr key={e.id || i} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {e.created_at ? new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground max-w-sm truncate">{e.description || e.event_type || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{e.actor_email || e.agent_name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status || 'logged'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}