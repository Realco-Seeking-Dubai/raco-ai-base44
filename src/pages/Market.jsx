import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3, TrendingUp, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Market() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  function loadData() {
    setLoading(true);
    base44.functions.invoke('getMarketInsights', {})
      .then(res => {
        setInsights(res?.data?.insights || []);
        setLastRefresh(new Date());
        setLoading(false);
      })
      .catch(err => {
        console.error('Market data error:', err);
        setInsights([]);
        setLoading(false);
      });
  }

  useEffect(() => { loadData(); }, []);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Market Insights"
        subtitle="DLD transaction intelligence"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={loadData} className="p-1.5 rounded-lg border border-hairline bg-card text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-64 shrink-0 h-48 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState icon={BarChart3} title="No market data yet" />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Projects" value={insights.length} icon={BarChart3} color="evergreen" />
            <KpiCard label="Total Units" value={insights.reduce((s, p) => s + (p.total_units || 0), 0).toLocaleString()} icon={TrendingUp} color="brass" />
            <KpiCard label="With Transactions" value={insights.filter(p => p.total_transactions > 0).length} icon={BarChart3} color="sky" />
            <KpiCard label="High Confidence" value={insights.filter(p => p.mapping_confidence === 'HIGH').length} icon={TrendingUp} color="terracotta" />
          </div>

          {/* Project cards */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Projects by Zone</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map(p => (
                <div key={p.id} className="bg-card border border-hairline rounded-xl p-4 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium text-foreground truncate pr-2">{p.project}</div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.mapping_confidence === 'HIGH' ? 'bg-evergreen-tint text-evergreen' : 'bg-brass-tint text-brass'}`}>
                      {p.mapping_confidence}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">{p.area_name} · {p.final_zone_name}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{p.property_category || '—'}</span>
                    <span className="font-mono text-foreground">{(p.total_units || 0).toLocaleString()} units</span>
                  </div>
                  {p.total_transactions > 0 && (
                    <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Transactions</span>
                      <span className="font-mono font-semibold text-evergreen">{p.total_transactions.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Volume chart — zones with transactions */}
          {(() => {
            const zoneData = Object.entries(
              insights.reduce((acc, p) => {
                const zone = p.final_zone_name || 'Other';
                acc[zone] = (acc[zone] || 0) + (p.total_units || 0);
                return acc;
              }, {})
            ).map(([zone, units]) => ({ zone, units })).sort((a, b) => b.units - a.units).slice(0, 12);
            return (
              <div className="bg-card border border-hairline rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">Unit Volume by Zone</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={zoneData} barSize={32}>
                    <XAxis dataKey="zone" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v.toLocaleString()} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value) => [`${value.toLocaleString()} units`]}
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--hairline))', fontSize: 12 }}
                    />
                    <Bar dataKey="units" fill="hsl(var(--evergreen))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}