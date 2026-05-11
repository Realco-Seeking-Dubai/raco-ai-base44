import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getNetworkContacts } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Users, Search, Phone, MessageCircle, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAG_FILTERS = ['All', 'Seller', 'Buyer', 'Both', 'Client'];

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNetworkContacts({ search })
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [search]);

  const filtered = contacts.filter(c => {
    if (tagFilter === 'All') return true;
    return c.current_tag?.toLowerCase() === tagFilter.toLowerCase();
  });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Network & Contacts"
        subtitle={`${contacts.length.toLocaleString()} contacts`}
        actions={
          <button className="px-3 py-1.5 text-sm rounded-lg border border-hairline bg-card hover:bg-surface font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Add contact
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {TAG_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTagFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                tagFilter === f
                  ? 'border-evergreen bg-evergreen-tint text-evergreen font-medium'
                  : 'border-hairline bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No contacts found" body="Try adjusting your search or filters." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border border-hairline rounded-xl p-4 hover:border-hairline-strong hover:shadow-sm transition-all cursor-pointer">
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
                {c.confidence_score && (
                  <span className="text-[10px] text-muted-2 font-mono ml-auto">{Math.round(c.confidence_score * 100)}%</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {c.primary_phone_normalized && (
                  <a
                    href={`tel:${c.primary_phone_normalized}`}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-hairline hover:bg-surface transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="w-3 h-3" /> Call
                  </a>
                )}
                {c.primary_phone_normalized && (
                  <a
                    href={`https://wa.me/${c.primary_phone_normalized?.replace(/\D/g, '')}`}
                    target="_blank"
                    onClick={e => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border border-hairline hover:bg-surface transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}