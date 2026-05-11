import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getOwnerStatus, getOwners } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import InventorySidebar, { BUDGET_RANGES } from '@/components/inventory/InventorySidebar';
import ValuationTool from '@/components/inventory/ValuationTool';
import PropertyMap from '@/components/map/PropertyMap';
import { Building2, Search, Plus, StickyNote, Send, CheckSquare, SlidersHorizontal, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['Listings', 'My Areas', 'Pocket Inventory'];

const DEFAULT_FILTERS = {
  status: 'All',
  propertyType: 'All',
  zone: 'All',
  budget: BUDGET_RANGES[0],
};

export default function Inventory() {
  const { user } = useAuth();
  const [tab, setTab] = useState('My Areas');
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (tab !== 'My Areas' || !user?.email) { setLoading(false); return; }
    setLoading(true);
    getOwnerStatus(user.email)
      .then(data => setOwners(data))
      .catch(() => setOwners([]))
      .finally(() => setLoading(false));
  }, [tab, user]);

  const filteredOwners = owners.filter(o => {
    const name = o.raco_owners?.full_name || '';
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status !== 'All' && o.status?.toLowerCase() !== filters.status.toLowerCase()) return false;
    // Zone filter (approximate match on area field if available)
    if (filters.zone !== 'All' && o.zone && !o.zone.toLowerCase().includes(filters.zone.toLowerCase())) return false;
    // Property type filter
    if (filters.propertyType !== 'All' && o.property_type && o.property_type.toLowerCase() !== filters.propertyType.toLowerCase()) return false;
    // Budget filter
    const budget = Number(o.asking_price) || 0;
    if (filters.budget.max !== Infinity && budget > filters.budget.max) return false;
    if (budget > 0 && budget < filters.budget.min) return false;
    return true;
  });

  const activeFilterCount = [
    filters.status !== 'All',
    filters.propertyType !== 'All',
    filters.zone !== 'All',
    filters.budget?.label !== 'Any',
  ].filter(Boolean).length;

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Inventory & Sellers"
        subtitle="Listings, owner workspace, and pocket inventory"
        actions={
          <div className="flex items-center gap-2">
            {tab === 'My Areas' && (
              <button
                onClick={() => setShowSidebar(s => !s)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg border font-medium flex items-center gap-1.5 transition-colors',
                  showSidebar ? 'border-evergreen bg-evergreen-tint text-evergreen' : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-evergreen text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            {tab === 'My Areas' && (
              <button className="px-3 py-1.5 text-sm rounded-lg border border-brass bg-brass-tint text-brass font-medium flex items-center gap-1.5 hover:bg-brass hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create Campaign
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-hairline">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t ? 'border-evergreen text-evergreen' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'My Areas' && (
        <div className="flex gap-5 items-start">
          {/* Sidebar */}
          {showSidebar && (
            <InventorySidebar filters={filters} onChange={setFilters} />
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search bar */}
            <div className="relative max-w-xs mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search owners…"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
              />
            </div>

            {/* Owner map */}
            {!loading && filteredOwners.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Map className="w-4 h-4 text-evergreen" />
                  <span className="text-xs font-semibold text-foreground">Owner Locations</span>
                </div>
                <PropertyMap
                  height={260}
                  markers={filteredOwners.slice(0, 30).map(o => ({
                    id: o.id,
                    zone: o.zone || 'Al Furjan',
                    label: o.raco_owners?.full_name || 'Owner',
                    type: o.status === 'listed' ? 'listing' : o.status === 'responded' ? 'warm' : 'owner',
                    sub: o.status,
                  }))}
                />
              </div>
            )}

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-surface rounded-xl animate-pulse" />)}
              </div>
            ) : filteredOwners.length === 0 ? (
              <EmptyState icon={Building2} title="No owners match your filters" body="Try adjusting your filter criteria." />
            ) : (
              <>
                <div className="text-xs text-muted-foreground mb-3">{filteredOwners.length} owner{filteredOwners.length !== 1 ? 's' : ''} found</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredOwners.map(o => {
                    const name = o.raco_owners?.full_name || 'Unknown Owner';
                    const statusKey = o.status || 'new';
                    return (
                      <div key={o.id} className="bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-hairline-strong transition-all">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">{name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{o.raco_owners?.email || '—'}</div>
                          </div>
                          <StatusBadge status={statusKey} />
                        </div>
                        {o.zone && (
                          <div className="text-xs text-sky bg-sky-tint rounded px-2 py-0.5 inline-flex mb-2">{o.zone}</div>
                        )}
                        {o.ai_suggestion && (
                          <div className="text-xs text-muted-foreground bg-brass-tint/50 rounded-lg px-3 py-2 mb-3 border border-brass/20">
                            <span className="font-medium text-brass">Raco suggests: </span>{o.ai_suggestion}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-hairline hover:bg-surface transition-colors text-muted-foreground hover:text-foreground">
                            <StickyNote className="w-3 h-3" /> Note
                          </button>
                          <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-hairline hover:bg-surface transition-colors text-muted-foreground hover:text-foreground">
                            <Send className="w-3 h-3" /> Message
                          </button>
                          <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-hairline hover:bg-surface transition-colors text-muted-foreground hover:text-foreground">
                            <CheckSquare className="w-3 h-3" /> Update
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'Listings' && (
        <div className="space-y-6">
          <ValuationTool />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Map className="w-4 h-4 text-evergreen" />
              <span className="text-sm font-semibold text-foreground">Listing Density Map</span>
            </div>
            <PropertyMap
              height={420}
              markers={[
                { id: 'l1', zone: 'Al Furjan', label: 'Al Furjan Listing', type: 'listing', sub: '2BR · AED 1.4M' },
                { id: 'l2', zone: 'JVC', label: 'JVC Tower', type: 'listing', sub: '1BR · AED 820K' },
                { id: 'l3', zone: 'Dubai Hills', label: 'Dubai Hills Villa', type: 'listing', sub: '4BR · AED 6.2M' },
                { id: 'l4', zone: 'Business Bay', label: 'Business Bay Apt', type: 'listing', sub: '2BR · AED 2.1M' },
                { id: 'l5', zone: 'Downtown', label: 'Downtown Studio', type: 'listing', sub: 'Studio · AED 1.1M' },
              ]}
            />
          </div>
        </div>
      )}

      {tab === 'Pocket Inventory' && (
        <EmptyState icon={Building2} title="No pocket listings" body="Pocket listings managed by you will appear here." />
      )}
    </div>
  );
}