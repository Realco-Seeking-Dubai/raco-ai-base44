import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OwnerBreadcrumbs({ crumbs, onNavigate }) {
  // crumbs: [{ label, key }] — first item is always "Owners"
  return (
    <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.key} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-2 shrink-0" />}
            {isLast ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <button
                onClick={() => onNavigate(i)}
                className={cn(
                  'text-muted-foreground hover:text-evergreen transition-colors',
                  i === 0 && 'flex items-center gap-1'
                )}
              >
                {i === 0 && <Home className="w-3.5 h-3.5" />}
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}