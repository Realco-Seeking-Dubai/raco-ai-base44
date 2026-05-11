import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAGS = ['All', 'Buyer', 'Seller', 'Both', 'Client'];
const ZONES = ['All', 'Al Furjan', 'JVC', 'Dubai Hills', 'Downtown', 'Palm Jumeirah', 'Business Bay', 'DIFC', 'JBR'];
const SOURCES = ['All', 'Referral', 'Bayut', 'Dubizzle', 'WhatsApp', 'Meta', 'Direct'];

const BUDGET_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Under AED 1M', min: 0, max: 1_000_000 },
  { label: 'AED 1M – 3M', min: 1_000_000, max: 3_000_000 },
  { label: 'AED 3M – 7M', min: 3_000_000, max: 7_000_000 },
  { label: 'AED 7M+', min: 7_000_000, max: Infinity },
];

const SORT_OPTIONS = [
  { label: 'Last contact', value: 'last_contact' },
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Confidence ↓', value: 'confidence_desc' },
];

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-2 mb-2">{title}</div>
      {children}
    </div>
  );
}

function ChipGroup({ options, value, onChange, getLabel }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const label = getLabel ? getLabel(opt) : opt;
        const val = typeof opt === 'object' ? opt.value : opt;
        const cur = typeof value === 'object' ? value?.value : value;
        return (
          <button
            key={val}
            onClick={() => onChange(opt)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-md border transition-colors',
              cur === val
                ? 'border-evergreen bg-evergreen-tint text-evergreen font-medium'
                : 'border-hairline bg-card text-muted-foreground hover:text-foreground hover:border-hairline-strong'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const DEFAULT_FILTERS = {
  tag: 'All',
  zone: 'All',
  source: 'All',
  budget: BUDGET_RANGES[0],
  sort: SORT_OPTIONS[0],
};

export { DEFAULT_FILTERS, BUDGET_RANGES as CONTACT_BUDGET_RANGES };

export default function ContactsSidebar({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div className="w-60 shrink-0 bg-card border border-hairline rounded-xl p-4 h-fit sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-evergreen" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
        </div>
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs text-muted-foreground hover:text-terracotta transition-colors"
        >
          Reset
        </button>
      </div>

      <Section title="Sort by">
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => set('sort', o)}
              className={cn(
                'text-left text-xs px-2.5 py-1.5 rounded-md transition-colors',
                filters.sort?.value === o.value
                  ? 'bg-evergreen-tint text-evergreen font-medium'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Tag">
        <ChipGroup options={TAGS} value={filters.tag} onChange={v => set('tag', v)} />
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

      <Section title="Lead Source">
        <ChipGroup options={SOURCES} value={filters.source} onChange={v => set('source', v)} />
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