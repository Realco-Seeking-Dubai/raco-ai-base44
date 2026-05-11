import { useEffect, useState } from 'react';
import { getDeals } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3, Plus, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import DealKanban from '@/components/deals/DealKanban';

const STAGES = ['Offer', 'MOU', 'NOC', 'Trustee', 'Transfer', 'Closed'];

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');

  useEffect(() => {
    getDeals().then(setDeals).catch(() => setDeals([])).finally(() => setLoading(false));
  }, []);

  const total = deals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const won = deals.filter(d => d.stage === 'Closed' || d.stage === 'Won');
  const atRisk = deals.filter(d => d.risk_flag);
  const thisMonth = deals.filter(d => {
    const dt = d.closing_date ? new Date(d.closing_date) : null;
    if (!dt) return false;
    const now = new Date();
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });

  const byStage = STAGES.map(s => ({
    stage: s,
    items: deals.filter(d => (d.stage || 'Offer').toLowerCase() === s.toLowerCase()),
  }));

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Deals & Transactions"
        subtitle={`${deals.length} active deals`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-hairline overflow-hidden">
              <button onClick={() => setView('kanban')} className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1', view === 'kanban' ? 'bg-evergreen text-white' : 'bg-card text-muted-foreground hover:bg-surface')}>
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
              <button onClick={() => setView('list')} className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1', view === 'list' ? 'bg-evergreen text-white' : 'bg-card text-muted-foreground hover:bg-surface')}>
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
            <button className="px-3 py-1.5 text-sm rounded-lg bg-evergreen text-white font-medium flex items-center gap-1.5 hover:bg-evergreen-mid transition-colors">
              <Plus className="w-3.5 h-3.5" /> New deal
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Pipeline Value" value={`AED ${(total / 1e6).toFixed(1)}M`} icon={BarChart3} color="evergreen" />
        <KpiCard label="Closing this month" value={thisMonth.length} icon={BarChart3} color="brass" />
        <KpiCard label="At risk" value={atRisk.length} icon={AlertTriangle} color="terracotta" />
        <KpiCard label="Won YTD" value={won.length} icon={BarChart3} color="sky" />
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(s => <div key={s} className="w-60 shrink-0 h-48 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState icon={BarChart3} title="No deals yet" body="Open your first deal to see it here." />
      ) : view === 'kanban' ? (
        <DealKanban initialDeals={deals} />
      ) : (
        <div className="bg-card border border-hairline rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Deal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {deals.map(deal => (
                <tr key={deal.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{deal.deal_title || deal.unit_ref || 'Deal'}</div>
                    {deal.risk_flag && <div className="flex items-center gap-1 text-xs text-terracotta mt-0.5"><AlertTriangle className="w-3 h-3" /> At risk</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{deal.deal_value ? `AED ${Number(deal.deal_value).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium text-muted-foreground">{deal.stage || 'Offer'}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-2">{deal.days_in_stage || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}