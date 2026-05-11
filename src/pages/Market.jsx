import { useEffect, useState } from 'react';
import { getMarketSummary } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3, TrendingUp, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const MOCK_ZONES = [
  { zone: 'Core', transactions: 596322, avg_price_m: 2.9, deviation: 3.2 },
  { zone: 'Suburbs', transactions: 566512, avg_price_m: 2.1, deviation: -1.8 },
  { zone: 'Waterfront', transactions: 98998, avg_price_m: 7.2, deviation: 8.5 },
  { zone: 'MBR City', transactions: 58178, avg_price_m: 5.3, deviation: 5.1 },
  { zone: 'Dubai South', transactions: 33614, avg_price_m: 2.3, deviation: 2.0 },
];

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

  const display = summary.length > 0 ? summary : MOCK_ZONES;

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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Transactions" value="1.35M" icon={BarChart3} color="evergreen" />
        <KpiCard label="Total Market Value" value="AED 3.99T" icon={TrendingUp} color="brass" />
        <KpiCard label="Avg. Transaction" value="AED 2.9M" icon={BarChart3} color="sky" />
        <KpiCard label="Hot Zones" value="3" icon={TrendingUp} color="terracotta" />
      </div>

      {/* Pulse vs Sentiment */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Pulse vs Sentiment by Zone</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {display.map(z => {
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
          <BarChart data={display} barSize={32}>
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
    </div>
  );
}