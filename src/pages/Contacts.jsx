import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getNetworkContacts } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ContactsSidebar, { DEFAULT_FILTERS } from '@/components/contacts/ContactsSidebar';
import { Users, Search, Phone, MessageCircle, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import ContactModal from '@/components/contacts/ContactModal';

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    getNetworkContacts({ search })
      .then(data => {
        setContacts(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Contacts fetch error:', err);
        setContacts([]);
        setLoading(false);
      });
  }, [search]);

  const sorted = [...contacts].sort((a, b) => {
    switch (filters.sort?.value) {
      case 'name_asc':
        return (a.full_name || '').localeCompare(b.full_name || '');
      case 'confidence_desc':
        return (b.confidence_score || 0) - (a.confidence_score || 0);
      default: // last_contact
        return new Date(b.last_contact_at || 0) - new Date(a.last_contact_at || 0);
    }
  });

  const filtered = sorted.filter(c => {
    if (filters.tag !== 'All') {
      if (filters.tag === 'Client' && !c.is_client) return false;
      if (filters.tag !== 'Client' && c.current_tag?.toLowerCase() !== filters.tag.toLowerCase()) return false;
    }
    // Zone — approximate match on known zones
    if (filters.zone !== 'All' && c.zone && !c.zone.toLowerCase().includes(filters.zone.toLowerCase())) return false;
    // Source
    if (filters.source !== 'All' && c.lead_source?.toLowerCase() !== filters.source.toLowerCase()) return false;
    // Budget
    const budget = Number(c.budget_aed) || 0;
    if (budget > 0 && filters.budget?.max !== Infinity && budget > filters.budget.max) return false;
    if (budget > 0 && budget < filters.budget?.min) return false;
    return true;
  });

  const activeFilterCount = [
    filters.tag !== 'All',
    filters.zone !== 'All',
    filters.source !== 'All',
    filters.budget?.label !== 'Any',
    filters.sort?.value !== 'last_contact',
  ].filter(Boolean).length;

  return (
    <div className="p-6 animate-fade-in">
      {selectedContact && <ContactModal contact={selectedContact} onClose={() => setSelectedContact(null)} />}

      <PageHeader
        title="Network & Contacts"
        subtitle={`${contacts.length.toLocaleString()} contacts`}
        actions={
          <div className="flex items-center gap-2">
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
            <button className="px-3 py-1.5 text-sm rounded-lg border border-hairline bg-card hover:bg-surface font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Add contact
            </button>
          </div>
        }
      />

      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        {showSidebar && (
          <ContactsSidebar filters={filters} onChange={setFilters} />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative max-w-xs mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
            />
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-surface rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No contacts found" body="Try adjusting your search or filters." />
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-3">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(c => (
                  <div key={c.id} onClick={() => setSelectedContact(c)} className="bg-card border border-hairline rounded-xl p-4 hover:border-hairline-strong hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-evergreen-tint flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-evergreen">
                          {(c.full_name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{c.full_name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{c.primary_email || c.primary_phone_normalized || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {c.current_tag && <StatusBadge status={c.current_tag} />}
                      {c.is_client && <StatusBadge status="client" />}
                      {c.lead_source && (
                        <span className="text-[10px] text-muted-2 bg-surface rounded px-1.5 py-0.5">{c.lead_source}</span>
                      )}
                      {c.confidence_score && (
                        <span className="text-[10px] text-muted-2 font-mono ml-auto">{Math.round(c.confidence_score * 100)}%</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {c.primary_phone_normalized && (
                        <a href={`tel:${c.primary_phone_normalized}`} onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-hairline hover:bg-surface transition-colors text-muted-foreground hover:text-foreground">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      )}
                      {c.primary_phone_normalized && (
                        <a href={`https://wa.me/${c.primary_phone_normalized?.replace(/\D/g, '')}`} target="_blank" onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-hairline hover:bg-surface transition-colors text-muted-foreground hover:text-foreground">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}