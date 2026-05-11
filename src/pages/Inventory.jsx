import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getOwnerStatus, getOwners } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Building2, Search, Plus, StickyNote, Send, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['Listings', 'My Areas', 'Pocket Inventory'];
const STATUS_CHIPS = ['All', 'New', 'Approached', 'Responded', 'Listed', 'Declined'];

export default function Inventory() {
  const { user } = useAuth();
  const [tab, setTab] = useState('My Areas');
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

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
    if (statusFilter !== 'All' && o.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Inventory & Sellers"
        subtitle="Listings, owner workspace, and pocket inventory"
        actions={
          tab === 'My Areas' && (
            <button className="px-3 py-1.5 text-sm rounded-lg border border-brass bg-brass-tint text-brass font-medium flex items-center gap-1.5 hover:bg-brass hover:text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Create Campaign
            </button>
          )
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
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search owners…"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_CHIPS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                    statusFilter === s
                      ? 'border-evergreen bg-evergreen-tint text-evergreen font-medium'
                      : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-surface rounded-xl animate-pulse" />)}
            </div>
          ) : filteredOwners.length === 0 ? (
            <EmptyState icon={Building2} title="No owners in your areas" body="Owners in your assigned zones will appear here." />
          ) : (
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
          )}
        </>
      )}

      {tab === 'Listings' && (
        <EmptyState icon={Building2} title="Listings syncing" body="Your Pixxi listings will appear here once sync is complete." />
      )}

      {tab === 'Pocket Inventory' && (
        <EmptyState icon={Building2} title="No pocket listings" body="Pocket listings managed by you will appear here." />
      )}
    </div>
  );
}