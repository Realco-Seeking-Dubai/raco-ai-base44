import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/ui/EmptyState';
import { Building2, Search, RefreshCw } from 'lucide-react';

function formatPrice(price) {
  if (!price) return '—';
  const n = Number(price);
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

export default function PocketInventoryTab() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  function loadUnits() {
    setLoading(true);
    base44.functions.invoke('getPocketInventory', {})
      .then(res => {
        setUnits(res?.data?.units || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Pocket inventory error:', err);
        setUnits([]);
        setLoading(false);
      });
  }

  useEffect(() => { loadUnits(); }, []);

  const filtered = units.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.title || '').toLowerCase().includes(q) ||
      (u.community || '').toLowerCase().includes(q) ||
      (u.assigned_agent || '').toLowerCase().includes(q) ||
      (u.property_category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, community, agent…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
          />
        </div>
        <button
          onClick={loadUnits}
          className="p-1.5 rounded-lg border border-hairline bg-card text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No properties found" body="Properties from the pocket inventory will appear here." />
      ) : (
        <>
          <div className="text-xs text-muted-foreground mb-3">{filtered.length} propert{filtered.length !== 1 ? 'ies' : 'y'}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((u, i) => (
              <div key={u.id || i} className="bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-hairline-strong transition-all">
                {/* Title + badges */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm font-medium text-foreground truncate flex-1">{u.title || '—'}</div>
                  <div className="flex gap-1 shrink-0">
                    {u.is_hot && <span className="text-[10px] px-1.5 py-0.5 rounded bg-terracotta-tint text-terracotta font-semibold">HOT</span>}
                    {u.is_exclusive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brass-tint text-brass font-semibold">EXCL</span>}
                  </div>
                </div>
                {/* Price */}
                <div className="text-sm font-semibold text-foreground mb-2">{formatPrice(u.asking_price_aed)}</div>
                {/* Community */}
                {u.community && (
                  <div className="text-xs text-sky bg-sky-tint rounded px-2 py-0.5 inline-flex mb-2 truncate max-w-full">{u.community}</div>
                )}
                {/* Meta row */}
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {u.property_category && <span className="bg-surface-2 px-1.5 py-0.5 rounded">{u.property_category}</span>}
                  {u.bedrooms > 0 && <span>{u.bedrooms} bd</span>}
                  {u.listing_purpose && <span className="capitalize">{u.listing_purpose}</span>}
                </div>
                {u.assigned_agent && (
                  <div className="text-xs text-muted-foreground mt-2">Agent: {u.assigned_agent}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}