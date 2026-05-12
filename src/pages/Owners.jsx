import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLens } from '@/lib/LensContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Users, Search, RefreshCw, Phone, Mail } from 'lucide-react';

export default function Owners() {
  const { lensUser } = useLens();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [noScope, setNoScope] = useState(false);

  function loadOwners() {
    setLoading(true);
    setNoScope(false);
    const payload = lensUser?.email ? { agent_email: lensUser.email } : {};
    base44.functions.invoke('getOwners', payload)
      .then(res => {
        setOwners(res.data?.owners || []);
        setIsGlobal(res.data?.is_global || false);
        if (res.data?.reason === 'no_scope') setNoScope(true);
      })
      .catch(() => setOwners([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOwners(); }, [lensUser]);

  const filtered = owners.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (o.owner_name || '').toLowerCase().includes(q) ||
      (o.owner_area || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Owner Database"
        subtitle={isGlobal ? 'Global view — all owners' : 'Scoped to your assigned zones'}
        actions={
          <button
            onClick={loadOwners}
            className="px-3 py-1.5 text-sm rounded-lg border border-hairline bg-card font-medium flex items-center gap-1.5 hover:bg-surface transition-colors text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, area, email…"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : noScope ? (
        <EmptyState
          icon={Users}
          title="No scope assigned"
          body="You have no projects or zones assigned. Contact your admin to get access."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No owners found" body="No owners match your current scope or search." />
      ) : (
        <>
          <div className="text-xs text-muted-foreground mb-3">{filtered.length} owner{filtered.length !== 1 ? 's' : ''}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((o, i) => (
              <div key={o.id || i} className="bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-hairline-strong transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-sm font-semibold text-foreground truncate">{o.owner_name || 'Unknown Owner'}</div>
                  {o.owner_area && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-evergreen-tint text-evergreen font-medium shrink-0">{o.owner_area}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {o.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /> {o.email}
                    </div>
                  )}
                  {o.mobile && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" /> {o.mobile}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-3 pt-3 border-t border-hairline text-[11px] text-muted-foreground">
                  {o.owner_record_count != null && <span>{o.owner_record_count} records</span>}
                  {o.linked_project_count != null && <span>{o.linked_project_count} projects</span>}
                  {o.source_system && <span className="capitalize">{o.source_system}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}