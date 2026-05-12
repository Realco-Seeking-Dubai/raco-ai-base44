import { useEffect, useState } from 'react';
import { getPixxiListings } from '@/lib/supabase';
import { base44 } from '@/api/base44Client';
import { useLens } from '@/lib/LensContext';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import LeadScoreBadge, { computeLeadScore, getScoreTier } from '@/components/leads/LeadScoreBadge';
import LeadMetricsBar from '@/components/leads/LeadMetricsBar';
import LeadDetailDrawer from '@/components/leads/LeadDetailDrawer';
import ListingLinkBadge, { matchListings } from '@/components/leads/ListingLinkBadge';
import AgentAssignBadge from '@/components/leads/AgentAssignBadge';
import LeadKanban from '@/components/leads/LeadKanban';
import { TrendingUp, Search, Zap, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = ['New', 'Qualified', 'Viewing', 'Negotiation', 'Closed'];

const SOURCE_COLORS = {
  bayut: 'bg-brass-tint text-brass',
  dubizzle: 'bg-sky-tint text-sky',
  'property finder': 'bg-evergreen-tint text-evergreen',
  meta: 'bg-terracotta-tint text-terracotta',
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
const SOURCE_FILTERS = ['All', 'Bayut', 'Dubizzle', 'Property Finder', 'Meta', 'Referral'];

export default function Leads() {
  const { lensEmail } = useLens();
  const [leads, setLeads] = useState([]);
  const [listings, setListings] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [selectedLead, setSelectedLead] = useState(null);

  function loadData() {
    setLoading(true);
    Promise.all([
      base44.functions.invoke('getLeads', { agent_email: lensEmail || undefined }),
      getPixxiListings(lensEmail, { filterByAgent: false }),
      base44.functions.invoke('getPixxiUsers', {}),
    ]).then(([leadsRes, listingsData, agentsRes]) => {
      const leadsData = leadsRes?.data?.leads || [];
      const scored = leadsData.map(l => ({ ...l, _score: computeLeadScore(l) }));
      scored.sort((a, b) => b._score - a._score);
      setLeads(scored);
      setListings(listingsData);
      const allAgents = agentsRes?.data?.users || [];
      setAgents(allAgents);
      setLoading(false);
    }).catch(err => {
      console.error('Leads data error:', err);
      setLoading(false);
    });
  }

  useEffect(() => { loadData(); }, [lensEmail]);

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.zone?.toLowerCase().includes(search.toLowerCase());
    const matchScore = scoreFilter === 'All' || getScoreTier(l._score) === scoreFilter.toLowerCase();
    const matchSource = sourceFilter === 'All' || l.source?.toLowerCase() === sourceFilter.toLowerCase();
    return matchSearch && matchScore && matchSource;
  });

  const hotCount = leads.filter(l => getScoreTier(l._score) === 'hot').length;

  const byStage = STAGES.map(s => ({
    stage: s,
    items: filtered.filter(l => (l.stage || 'New').toLowerCase() === s.toLowerCase()),
  }));

  function handleAssigned(leadId, newEmail) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pixxi_user_email: newEmail } : l));
    if (selectedLead?.id === leadId) setSelectedLead(l => ({ ...l, pixxi_user_email: newEmail }));
  }

  function handleLeadUpdated(leadId, updates) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
    if (selectedLead?.id === leadId) setSelectedLead(l => ({ ...l, ...updates }));
  }

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Leads & Buyers"
        subtitle={`${leads.length} leads · ${listings.length} listings synced`}
        actions={
          <div className="flex items-center gap-2">
            {hotCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terracotta-tint border border-terracotta/30 text-xs font-semibold text-terracotta">
                <Zap className="w-3.5 h-3.5" />
                {hotCount} hot
              </div>
            )}
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg border border-hairline bg-card text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
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

      {/* Metrics Bar */}
      <LeadMetricsBar leads={leads} listings={listings} />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, zone…"
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors w-48"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium hidden sm:block">Score:</span>
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
            >{f}</button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium hidden sm:block">Source:</span>
          {SOURCE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium',
                sourceFilter === f
                  ? 'border-evergreen bg-evergreen-tint text-evergreen'
                  : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
              )}
            >{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(s => <div key={s} className="w-64 shrink-0 h-64 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : view === 'kanban' ? (
        <LeadKanban leads={filtered} listings={listings} agents={agents} onLeadUpdated={handleLeadUpdated} />
      ) : (
        filtered.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No leads found" />
        ) : (
          <div className="bg-card border border-hairline rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline bg-surface">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Score</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Budget</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Listings</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map(lead => {
                  const matched = matchListings(lead, listings);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={cn('hover:bg-surface transition-colors cursor-pointer', getScoreTier(lead._score) === 'hot' && 'bg-terracotta-tint/20')}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{lead.contact_name || '—'}</td>
                      <td className="px-4 py-3"><LeadScoreBadge score={lead._score} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {lead.source && (
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', SOURCE_COLORS[lead.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                            {lead.source}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.stage || 'new'} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono hidden md:table-cell">
                        {lead.budget_aed ? `AED ${Number(lead.budget_aed).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <ListingLinkBadge count={matched.length} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                        <AgentAssignBadge lead={lead} agents={agents} onAssigned={handleAssigned} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono hidden md:table-cell">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          listings={listings}
          agents={agents}
          onClose={() => setSelectedLead(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}