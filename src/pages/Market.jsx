import { useEffect, useState } from 'react';
import { getMarketSummary } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3, TrendingUp, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';



export default function Market() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh] = useState(new Date());

  useEffect(() => {
    getMarketSummary()
      .then(setSummary)
      .catch(() => setSummary([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Market Insights"
        subtitle="DLD transaction intelligence"
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" />
            Last updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        }
      />

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-64 shrink-0 h-48 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : summary.length === 0 ? (
        <EmptyState icon={BarChart3} title="No market data yet" />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Total Transactions" value={`${(summary.reduce((s, z) => s + (z.transactions || 0), 0) / 1e6).toFixed(2)}M`} icon={BarChart3} color="evergreen" />
            <KpiCard label="Zones" value={summary.length} icon={TrendingUp} color="brass" />
            <KpiCard label="Avg. Price" value={`AED ${(summary.reduce((s, z) => s + (z.avg_price_m || 0), 0) / summary.length).toFixed(1)}M`} icon={BarChart3} color="sky" />
            <KpiCard label="Positive Zones" value={summary.filter(z => (z.deviation || 0) >= 0).length} icon={TrendingUp} color="terracotta" />
          </div>

          {/* Pulse vs Sentiment */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Pulse vs Sentiment by Zone</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.map(z => {
            const dev = z.deviation || 0;
            const isPos = dev >= 0;
            return (
              <div key={z.zone} className="bg-card border border-hairline rounded-xl p-4 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium text-foreground">{z.zone}</div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${isPos ? 'text-evergreen' : 'text-terracotta'}`}>
                    {isPos ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(dev).toFixed(1)}%
                  </div>
                </div>
                {/* Bars */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Real prices</span>
                      <span className="font-mono">AED {z.avg_price_m}M</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-evergreen rounded-full" style={{ width: `${Math.min((z.avg_price_m / 8) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Asking prices</span>
                      <span className="font-mono">AED {(z.avg_price_m * (1 + dev / 100)).toFixed(1)}M</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-brass rounded-full" style={{ width: `${Math.min(((z.avg_price_m * (1 + dev / 100)) / 8) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-2">
                  {z.transactions?.toLocaleString() || '—'} transactions
                </div>
              </div>
            );
              })}
            </div>
          </div>

          {/* Volume chart */}
          <div className="bg-card border border-hairline rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-4">Transaction Volume by Zone</h3>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary} barSize={32}>
                  <XAxis dataKey="zone" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString()} transactions`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--hairline))', fontSize: 12 }}
                  />
                  <Bar dataKey="transactions" fill="hsl(var(--evergreen))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
    </div>
  );
}