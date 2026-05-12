import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLens } from '@/lib/LensContext';
import EmptyState from '@/components/ui/EmptyState';
import { Building2, Search, BedDouble, Bath, Maximize2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTS = ['All', 'active', 'inactive', 'sold', 'leased'];
const STATUS_STYLES = {
  active: 'bg-evergreen-tint text-evergreen',
  inactive: 'bg-surface-2 text-muted-foreground',
  sold: 'bg-brass-tint text-brass',
  leased: 'bg-sky-tint text-sky',
};

function formatPrice(price) {
  if (!price) return '—';
  const n = Number(price);
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

export default function ListingsTab() {
  const { user } = useAuth();
  const { lensEmail } = useLens();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  function loadListings() {
    const agentEmail = lensEmail || user?.email;
    setLoading(true);
    base44.functions.invoke('getPixxiListings', {
      agent_email: agentEmail || null,
      status: statusFilter !== 'All' ? statusFilter : undefined,
    })
      .then(res => {
        setListings(res?.data?.listings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Listings fetch error:', err);
        setListings([]);
        setLoading(false);
      });
  }

  useEffect(() => { loadListings(); }, [user, lensEmail, statusFilter]);

  const filtered = listings.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.title || '').toLowerCase().includes(q) ||
      (l.community || '').toLowerCase().includes(q) ||
      (l.region || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg border font-medium capitalize transition-colors',
                statusFilter === s
                  ? 'border-evergreen bg-evergreen-tint text-evergreen'
                  : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={loadListings}
          className="p-1.5 rounded-lg border border-hairline bg-card text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No listings found" body="Try adjusting filters or search." />
      ) : (
        <>
          <div className="text-xs text-muted-foreground mb-3">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(l => {
              const photo = l.photos?.[0];
              const statusStyle = STATUS_STYLES[l.status] || 'bg-surface-2 text-muted-foreground';
              return (
                <div key={l.id} className="bg-card border border-hairline rounded-xl overflow-hidden hover:shadow-sm hover:border-hairline-strong transition-all">
                  {/* Photo */}
                  {photo ? (
                    <img src={photo} alt={l.title} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-surface-2 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-muted-2" />
                    </div>
                  )}
                  <div className="p-4">
                    {/* Price + status */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-sm font-semibold text-foreground">{formatPrice(l.price)}</div>
                      <span className={cn('shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium capitalize', statusStyle)}>
                        {l.status || '—'}
                      </span>
                    </div>
                    {/* Title */}
                    <div className="text-xs text-muted-foreground truncate mb-2">{l.title || '—'}</div>
                    {/* Community / Region */}
                    <div className="text-xs text-sky bg-sky-tint rounded px-2 py-0.5 inline-flex mb-3 truncate max-w-full">
                      {[l.community, l.region].filter(Boolean).join(' · ') || '—'}
                    </div>
                    {/* Stats */}
                    <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                      {l.bedrooms != null && (
                        <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{l.bedrooms} bd</span>
                      )}
                      {l.bathrooms != null && (
                        <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{l.bathrooms} ba</span>
                      )}
                      {l.size_sqft && (
                        <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" />{Number(l.size_sqft).toLocaleString()} sqft</span>
                      )}
                    </div>
                    {/* Agent */}
                    {l.agent_name && (
                      <div className="text-[11px] text-muted-2 truncate">Agent: {l.agent_name}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}