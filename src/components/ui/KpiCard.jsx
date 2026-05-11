import { cn } from '@/lib/utils';

export default function KpiCard({ label, value, sub, icon: Icon, color = 'evergreen', onClick }) {
  const colors = {
    evergreen: 'bg-evergreen-tint text-evergreen',
    brass: 'bg-brass-tint text-brass',
    terracotta: 'bg-terracotta-tint text-terracotta',
    sky: 'bg-sky-tint text-sky',
    muted: 'bg-surface-2 text-muted-foreground',
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 p-4 rounded-xl border border-hairline bg-card text-left w-full transition-all',
        onClick ? 'hover:border-hairline-strong hover:shadow-sm cursor-pointer' : 'cursor-default'
      )}
    >
      {Icon && (
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div>
        <div className="text-2xl font-semibold text-foreground tabular-nums">{value ?? '—'}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-2 mt-1">{sub}</div>}
      </div>
    </button>
  );
}