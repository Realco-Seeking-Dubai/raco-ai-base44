import { useEffect, useState } from 'react';
import { getLeads } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { TrendingUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = ['New', 'Qualified', 'Viewing', 'Negotiation', 'Closed'];
const SOURCE_COLORS = {
  bayut: 'bg-brass-tint text-brass',
  dubizzle: 'bg-sky-tint text-sky',
  meta: 'bg-evergreen-tint text-evergreen',
  whatsapp: 'bg-evergreen/20 text-evergreen',
  referral: 'bg-brass/20 text-brass',
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getLeads()
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l =>
    !search || l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  const byStage = STAGES.map(s => ({
    stage: s,
    items: filtered.filter(l => (l.stage || 'New').toLowerCase() === s.toLowerCase()),
  }));

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Leads & Buyers"
        subtitle={`${leads.length} leads`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setView('kanban')}
              className={cn('px-3 py-1.5 text-sm rounded-lg border font-medium', view === 'kanban' ? 'border-evergreen bg-evergreen-tint text-evergreen' : 'border-hairline bg-card text-muted-foreground')}
            >
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('px-3 py-1.5 text-sm rounded-lg border font-medium', view === 'list' ? 'border-evergreen bg-evergreen-tint text-evergreen' : 'border-hairline bg-card text-muted-foreground')}
            >
              List
            </button>
          </div>
        }
      />

      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads…"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(s => <div key={s} className="w-64 shrink-0 h-64 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {byStage.map(({ stage, items }) => (
            <div key={stage} className="w-64 shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stage}</span>
                <span className="text-xs bg-surface px-1.5 py-0.5 rounded font-mono text-muted-2">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="h-16 rounded-xl border border-dashed border-hairline flex items-center justify-center text-xs text-muted-2">Empty</div>
                ) : (
                  items.map(lead => (
                    <div key={lead.id} className="bg-card border border-hairline rounded-xl p-3 hover:shadow-sm hover:border-hairline-strong transition-all cursor-pointer">
                      <div className="text-sm font-medium text-foreground truncate">{lead.contact_name || 'Unknown'}</div>
                      {lead.source && (
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-1.5', SOURCE_COLORS[lead.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                          {lead.source}
                        </span>
                      )}
                      {lead.budget_aed && (
                        <div className="text-xs text-muted-foreground mt-1.5 font-mono">AED {Number(lead.budget_aed).toLocaleString()}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        filtered.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No leads found" />
        ) : (
          <div className="bg-card border border-hairline rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline bg-surface">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-surface transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-foreground">{lead.contact_name || '—'}</td>
                    <td className="px-4 py-3">
                      {lead.source && (
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', SOURCE_COLORS[lead.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                          {lead.source}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={lead.stage || 'new'} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}