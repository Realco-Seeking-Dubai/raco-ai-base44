import { Flame, TrendingUp, Clock, CheckCircle2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeadMetricsBar({ leads, listings }) {
  const total = leads.length;
  const hot = leads.filter(l => l._score >= 70).length;
  const warm = leads.filter(l => l._score >= 40 && l._score < 70).length;
  const newToday = leads.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const closed = leads.filter(l => l.stage?.toLowerCase() === 'closed').length;
  const activeListings = listings.filter(l => l.status === 'active').length;

  const metrics = [
    { label: 'Total Leads', value: total, icon: TrendingUp, color: 'text-sky', bg: 'bg-sky-tint' },
    { label: 'Hot', value: hot, icon: Flame, color: 'text-terracotta', bg: 'bg-terracotta-tint' },
    { label: 'Warm', value: warm, icon: TrendingUp, color: 'text-brass', bg: 'bg-brass-tint' },
    { label: 'New Today', value: newToday, icon: Clock, color: 'text-evergreen', bg: 'bg-evergreen-tint' },
    { label: 'Closed', value: closed, icon: CheckCircle2, color: 'text-muted-foreground', bg: 'bg-surface-2' },
    { label: 'Active Listings', value: activeListings, icon: Building2, color: 'text-sky', bg: 'bg-sky-tint' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
      {metrics.map(m => (
        <div key={m.label} className="bg-card border border-hairline rounded-xl p-3 flex flex-col gap-1.5">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', m.bg)}>
            <m.icon className={cn('w-3.5 h-3.5', m.color)} />
          </div>
          <div className="text-xl font-semibold text-foreground tabular-nums">{m.value}</div>
          <div className="text-[11px] text-muted-foreground">{m.label}</div>
        </div>
      ))}
    </div>
  );
}