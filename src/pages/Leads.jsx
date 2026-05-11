import { useEffect, useState } from 'react';
import { getLeads } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import LeadScoreBadge, { computeLeadScore, getScoreTier } from '@/components/leads/LeadScoreBadge';
import { TrendingUp, Search, Zap, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = ['New', 'Qualified', 'Viewing', 'Negotiation', 'Closed'];

const SOURCE_COLORS = {
  bayut: 'bg-brass-tint text-brass',
  dubizzle: 'bg-sky-tint text-sky',
  meta: 'bg-evergreen-tint text-evergreen',
  whatsapp: 'bg-evergreen/20 text-evergreen',
  referral: 'bg-brass/20 text-brass',
};

const STAGE_STYLES = {
  New: { header: 'bg-sky-tint text-sky', border: 'border-t-sky' },
  Qualified: { header: 'bg-brass-tint text-brass', border: 'border-t-brass' },
  Viewing: { header: 'bg-evergreen-tint text-evergreen', border: 'border-t-evergreen' },
  Negotiation: { header: 'bg-terracotta-tint text-terracotta', border: 'border-t-terracotta' },
  Closed: { header: 'bg-surface-2 text-muted-foreground', border: 'border-t-muted-2' },
};

const SCORE_FILTERS = ['All', 'Hot', 'Warm', 'Cold'];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('All');

  useEffect(() => {
    getLeads()
      .then(data => {
        // Attach computed score to each lead
        const scored = data.map(l => ({ ...l, _score: computeLeadScore(l) }));
        // Sort hottest first
        scored.sort((a, b) => b._score - a._score);
        setLeads(scored);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.contact_email?.toLowerCase().includes(search.toLowerCase());
    const matchScore = scoreFilter === 'All' || getScoreTier(l._score) === scoreFilter.toLowerCase();
    return matchSearch && matchScore;
  });

  const hotCount = leads.filter(l => getScoreTier(l._score) === 'hot').length;

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
          <div className="flex items-center gap-2">
            {hotCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terracotta-tint border border-terracotta/30 text-xs font-semibold text-terracotta">
                <Zap className="w-3.5 h-3.5" />
                {hotCount} high-potential
              </div>
            )}
            <div className="flex rounded-lg border border-hairline overflow-hidden">
              <button
                onClick={() => setView('kanban')}
                className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1', view === 'kanban' ? 'bg-evergreen text-white' : 'bg-card text-muted-foreground hover:bg-surface')}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Board
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1', view === 'list' ? 'bg-evergreen text-white' : 'bg-card text-muted-foreground hover:bg-surface')}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
          </div>
        }
      />

      {/* Search + AI score filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">AI Score:</span>
          {SCORE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setScoreFilter(f)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium',
                scoreFilter === f
                  ? f === 'Hot' ? 'border-terracotta bg-terracotta-tint text-terracotta'
                    : f === 'Warm' ? 'border-brass bg-brass-tint text-brass'
                    : f === 'Cold' ? 'border-hairline-strong bg-surface-2 text-muted-foreground'
                    : 'border-evergreen bg-evergreen-tint text-evergreen'
                  : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(s => <div key={s} className="w-64 shrink-0 h-64 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
          {byStage.map(({ stage, items }) => {
            const style = STAGE_STYLES[stage];
            return (
              <div key={stage} className="w-64 shrink-0 flex flex-col">
                <div className={cn('flex items-center justify-between mb-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold', style.header)}>
                  <span>{stage}</span>
                  <span className="opacity-70 font-mono">{items.length}</span>
                </div>
                <div className="flex-1 bg-surface/50 rounded-xl p-2 space-y-2 min-h-[120px]">
                  {items.length === 0 ? (
                    <div className="h-14 rounded-lg border border-dashed border-hairline flex items-center justify-center text-xs text-muted-2">Empty</div>
                  ) : (
                    items.map(lead => (
                      <div
                        key={lead.id}
                        className={cn(
                          'bg-card border-t-2 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer',
                          style.border,
                          'border-x border-b border-hairline',
                          getScoreTier(lead._score) === 'hot' && 'ring-1 ring-terracotta/30'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="text-sm font-medium text-foreground truncate">{lead.contact_name || 'Unknown'}</div>
                        </div>

                        <LeadScoreBadge score={lead._score} showLabel={false} />

                        {lead.source && (
                          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-1.5 ml-1.5', SOURCE_COLORS[lead.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                            {lead.source}
                          </span>
                        )}
                        {lead.budget_aed && (
                          <div className="text-xs text-muted-foreground mt-1.5 font-mono">
                            AED {Number(lead.budget_aed).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">AI Score</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Budget</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map(lead => (
                  <tr key={lead.id} className={cn('hover:bg-surface transition-colors cursor-pointer', getScoreTier(lead._score) === 'hot' && 'bg-terracotta-tint/20')}>
                    <td className="px-4 py-3 font-medium text-foreground">{lead.contact_name || '—'}</td>
                    <td className="px-4 py-3"><LeadScoreBadge score={lead._score} /></td>
                    <td className="px-4 py-3">
                      {lead.source && (
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', SOURCE_COLORS[lead.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                          {lead.source}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={lead.stage || 'new'} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                      {lead.budget_aed ? `AED ${Number(lead.budget_aed).toLocaleString()}` : '—'}
                    </td>
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