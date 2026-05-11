import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { MapPin, ChevronRight, Building2, TrendingUp } from 'lucide-react';

const ZONES = [
  { name: 'Core', areas: ['Dubai Marina', 'Downtown Dubai', 'Business Bay', 'DIFC', 'JBR'], color: 'evergreen', count: 46 },
  { name: 'Waterfront', areas: ['Palm Jumeirah', 'Palm Jebel Ali', 'Bluewaters'], color: 'sky', count: 12 },
  { name: 'MBR City', areas: ['District One', 'Sobha Hartland', 'Meydan'], color: 'brass', count: 19 },
  { name: 'Suburbs', areas: ['Al Furjan', 'Arabian Ranches', 'DAMAC Hills', 'Jumeirah Village', 'The Springs'], color: 'terracotta', count: 55 },
  { name: 'Dubai South', areas: ['Emaar South', 'South Bay', 'Expo City'], color: 'muted', count: 2 },
];

const COLORS = {
  evergreen: { bg: 'bg-evergreen-tint', text: 'text-evergreen', border: 'border-evergreen/20', dot: 'bg-evergreen' },
  sky: { bg: 'bg-sky-tint', text: 'text-sky', border: 'border-sky/20', dot: 'bg-sky' },
  brass: { bg: 'bg-brass-tint', text: 'text-brass', border: 'border-brass/20', dot: 'bg-brass' },
  terracotta: { bg: 'bg-terracotta-tint', text: 'text-terracotta', border: 'border-terracotta/20', dot: 'bg-terracotta' },
  muted: { bg: 'bg-surface-2', text: 'text-muted-foreground', border: 'border-hairline', dot: 'bg-muted-2' },
};

export default function Zones() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Zones & Projects"
        subtitle="5 zones · 134 master projects · 301 DLD areas"
      />

      {/* Zone grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {ZONES.map(zone => {
          const c = COLORS[zone.color];
          const isSelected = selected === zone.name;
          return (
            <button
              key={zone.name}
              onClick={() => setSelected(isSelected ? null : zone.name)}
              className={`text-left p-5 rounded-xl border transition-all hover:shadow-sm ${
                isSelected ? `${c.bg} ${c.border} border-2` : 'bg-card border-hairline hover:border-hairline-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className="text-sm font-semibold text-foreground">{zone.name}</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90' : ''} text-muted-foreground`} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{zone.count} projects</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{zone.areas.length} areas</span>
              </div>
              {isSelected && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {zone.areas.map(a => (
                    <span key={a} className={`px-2 py-0.5 rounded text-[11px] font-medium ${c.bg} ${c.text}`}>{a}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Intelligence table */}
      <div className="bg-card border border-hairline rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-hairline">
          <span className="text-sm font-medium text-foreground">Zone Performance</span>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Zone</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Transactions</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Value</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg. Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {[
              { zone: 'Core', tx: '596,322', val: 'AED 1.71T', avg: 'AED 2.9M', color: 'evergreen' },
              { zone: 'Suburbs', tx: '566,512', val: 'AED 1.19T', avg: 'AED 2.1M', color: 'terracotta' },
              { zone: 'Waterfront', tx: '98,998', val: 'AED 709.5B', avg: 'AED 7.2M', color: 'sky' },
              { zone: 'MBR City', tx: '58,178', val: 'AED 306.7B', avg: 'AED 5.3M', color: 'brass' },
              { zone: 'Dubai South', tx: '33,614', val: 'AED 76.8B', avg: 'AED 2.3M', color: 'muted' },
            ].map(row => {
              const c = COLORS[row.color];
              return (
                <tr key={row.zone} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="font-medium">{row.zone}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground font-mono text-xs">{row.tx}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground text-xs font-mono">{row.val}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs font-mono">{row.avg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}