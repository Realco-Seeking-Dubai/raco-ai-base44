import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/ui/EmptyState';
import { Building2, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  function loadUnits() {
    setLoading(true);
    setError(null);
    base44.functions.invoke('getPocketInventory', {})
      .then(res => {
        setUnits(res?.data?.units || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Pocket inventory error:', err);
        setError(err.message || 'Failed to load pocket inventory');
        setUnits([]);
        setLoading(false);
      });
  }

  useEffect(() => { loadUnits(); }, []);

  const filtered = units.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.unit_number || u.title || '').toLowerCase().includes(q) ||
      (u.project_name || u.project || '').toLowerCase().includes(q) ||
      (u.community || '').toLowerCase().includes(q)
    );
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-terracotta-tint flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-terracotta" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground mb-1">Pocket Inventory Unavailable</div>
          <div className="text-xs text-muted-foreground max-w-sm">
            The <code className="bg-surface-2 px-1 rounded">antigravity_units_master</code> table needs to be exposed in the Supabase PostgREST schema. Please go to <strong>Supabase Dashboard → API Settings</strong> and add the <code className="bg-surface-2 px-1 rounded">agent</code> schema, then reload.
          </div>
        </div>
        <button
          onClick={loadUnits}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-hairline bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search units…"
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
        <EmptyState icon={Building2} title="No pocket inventory found" body="Units from the antigravity_units_master table will appear here." />
      ) : (
        <>
          <div className="text-xs text-muted-foreground mb-3">{filtered.length} unit{filtered.length !== 1 ? 's' : ''}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((u, i) => {
              const title = u.unit_number || u.title || u.unit_name || `Unit ${i + 1}`;
              const project = u.project_name || u.project || u.developer || '—';
              const community = u.community || u.area || u.zone || '—';
              const price = u.price || u.asking_price || u.list_price;
              const status = u.status || u.unit_status;
              const beds = u.bedrooms || u.beds;
              const sqft = u.size_sqft || u.area_sqft || u.size;

              return (
                <div key={u.id || i} className="bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-hairline-strong transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm font-medium text-foreground truncate">{title}</div>
                    {status && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-evergreen-tint text-evergreen font-medium capitalize">
                        {status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-foreground mb-1">{formatPrice(price)}</div>
                  <div className="text-xs text-sky bg-sky-tint rounded px-2 py-0.5 inline-flex mb-2 truncate max-w-full">{community}</div>
                  <div className="text-xs text-muted-foreground mb-1">{project}</div>
                  <div className="flex gap-3 text-xs text-muted-2">
                    {beds != null && <span>{beds} bd</span>}
                    {sqft && <span>{Number(sqft).toLocaleString()} sqft</span>}
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