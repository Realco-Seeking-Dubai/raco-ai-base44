import { useEffect, useState } from 'react';
import { getDeals } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3, Plus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = ['Offer', 'MOU', 'NOC', 'Trustee', 'Transfer', 'Closed'];

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <button className="px-3 py-1.5 text-sm rounded-lg bg-evergreen text-white font-medium flex items-center gap-1.5 hover:bg-evergreen-mid transition-colors">
            <Plus className="w-3.5 h-3.5" /> New deal
          </button>
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
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {byStage.map(({ stage, items }) => (
            <div key={stage} className="w-60 shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stage}</span>
                <span className="text-xs bg-surface px-1.5 py-0.5 rounded font-mono text-muted-2">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="h-14 rounded-xl border border-dashed border-hairline flex items-center justify-center text-xs text-muted-2">Empty</div>
                ) : (
                  items.map(deal => (
                    <div key={deal.id} className={cn('bg-card border rounded-xl p-3 hover:shadow-sm transition-all cursor-pointer', deal.risk_flag ? 'border-terracotta/30' : 'border-hairline hover:border-hairline-strong')}>
                      <div className="text-sm font-medium text-foreground truncate">{deal.deal_title || deal.unit_ref || 'Deal'}</div>
                      {deal.deal_value && (
                        <div className="text-xs font-mono text-muted-foreground mt-1">AED {Number(deal.deal_value).toLocaleString()}</div>
                      )}
                      {deal.risk_flag && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-terracotta">
                          <AlertTriangle className="w-3 h-3" /> At risk
                        </div>
                      )}
                      <div className="text-xs text-muted-2 mt-1.5 font-mono">
                        {deal.days_in_stage ? `${deal.days_in_stage}d in stage` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}