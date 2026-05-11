import { X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROPERTY_TYPES = ['All', 'Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Land', 'Commercial'];
const ZONES = ['All', 'Al Furjan', 'Hillside Residences', 'JVC', 'Dubai Hills', 'Downtown', 'Palm Jumeirah', 'Business Bay', 'DIFC'];
const STATUSES = ['All', 'New', 'Approached', 'Responded', 'Listed', 'Declined'];

const BUDGET_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Under AED 1M', min: 0, max: 1_000_000 },
  { label: 'AED 1M – 3M', min: 1_000_000, max: 3_000_000 },
  { label: 'AED 3M – 7M', min: 3_000_000, max: 7_000_000 },
  { label: 'AED 7M – 15M', min: 7_000_000, max: 15_000_000 },
  { label: 'AED 15M+', min: 15_000_000, max: Infinity },
];

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-2 mb-2">{title}</div>
      {children}
    </div>
  );
}

function ChipGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'px-2.5 py-1 text-xs rounded-md border transition-colors',
            value === opt
              ? 'border-evergreen bg-evergreen-tint text-evergreen font-medium'
              : 'border-hairline bg-card text-muted-foreground hover:text-foreground hover:border-hairline-strong'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function InventorySidebar({ filters, onChange, onClose }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div className="w-64 shrink-0 bg-card border border-hairline rounded-xl p-4 h-fit">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-evergreen" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
        </div>
        <button
          onClick={() => onChange({ status: 'All', propertyType: 'All', zone: 'All', budget: BUDGET_RANGES[0] })}
          className="text-xs text-muted-foreground hover:text-terracotta transition-colors"
        >
          Reset all
        </button>
      </div>

      <Section title="Status">
        <ChipGroup options={STATUSES} value={filters.status} onChange={v => set('status', v)} />
      </Section>

      <Section title="Property Type">
        <ChipGroup options={PROPERTY_TYPES} value={filters.propertyType} onChange={v => set('propertyType', v)} />
      </Section>

      <Section title="Zone">
        <div className="flex flex-col gap-1">
          {ZONES.map(z => (
            <button
              key={z}
              onClick={() => set('zone', z)}
              className={cn(
                'text-left text-xs px-2.5 py-1.5 rounded-md transition-colors',
                filters.zone === z
                  ? 'bg-evergreen-tint text-evergreen font-medium'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              )}
            >
              {z}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Budget Range">
        <div className="flex flex-col gap-1">
          {BUDGET_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => set('budget', r)}
              className={cn(
                'text-left text-xs px-2.5 py-1.5 rounded-md transition-colors',
                filters.budget?.label === r.label
                  ? 'bg-evergreen-tint text-evergreen font-medium'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export { BUDGET_RANGES };