import { useState, useRef, useEffect } from 'react';
import { useLens } from '@/lib/LensContext';
import { ChevronDown, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_DOT = {
  active: 'bg-evergreen',
  staged: 'bg-muted-2',
  pending_email: 'bg-sky',
  on_hold: 'bg-brass',
  left_company: 'bg-terracotta',
  do_not_activate: 'bg-hairline-strong',
};

export default function ViewAsSelector() {
  const { pixxiUsers, lensUser, setLensUser } = useLens();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = pixxiUsers.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.pixxi_email?.toLowerCase().includes(search.toLowerCase())
  );

  function select(u) {
    setLensUser(u);
    setOpen(false);
    setSearch('');
  }

  function clear(e) {
    e.stopPropagation();
    setLensUser(null);
  }

  const isViewing = !!lensUser;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
          isViewing
            ? 'border-brass bg-brass-tint text-brass'
            : 'border-hairline bg-card text-muted-foreground hover:text-foreground hover:border-hairline-strong'
        )}
      >
        <User className="w-3.5 h-3.5 shrink-0" />
        <span className="max-w-[120px] truncate">
          {isViewing ? `Viewing: ${lensUser.full_name?.split(' ')[0]}` : 'View as…'}
        </span>
        {isViewing ? (
          <X className="w-3 h-3 shrink-0" onClick={clear} />
        ) : (
          <ChevronDown className="w-3 h-3 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-card border border-hairline rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-hairline">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Pixxi users…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-hairline bg-surface focus:outline-none focus:border-evergreen"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">No users found</div>
            ) : (
              filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => select(u)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface transition-colors text-left',
                    lensUser?.id === u.id && 'bg-brass-tint'
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-evergreen-tint flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-evergreen">{(u.full_name || '?').charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{u.full_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.pixxi_email || u.primary_email}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[u.lifecycle_status] || 'bg-muted-2')} />
                    <span className="text-[10px] text-muted-foreground capitalize">{u.lifecycle_status?.replace('_', ' ')}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}