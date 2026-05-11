import { useEffect, useState } from 'react';
import { getNetworkContacts, getPixxiListings, getPortalLeads } from '@/lib/supabase';
import StatusBadge from '@/components/ui/StatusBadge';
import { Users, Building2, TrendingUp, Phone, MessageCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SOURCE_COLORS = {
  bayut: 'bg-brass-tint text-brass border border-brass/20',
  dubizzle: 'bg-sky-tint text-sky border border-sky/20',
};

function SectionHeader({ icon: Icon, title, color, count, linkTo, linkLabel }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-hairline bg-gradient-to-r ${color} to-transparent`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold">{title}</span>
        {count !== undefined && <span className="text-xs opacity-60 font-mono">({count})</span>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          {linkLabel} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export default function IrfanDataSections({ lensEmail }) {
  const [contacts, setContacts] = useState([]);
  const [listings, setListings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getNetworkContacts({}),
      getPixxiListings(lensEmail),
      getPortalLeads(lensEmail),
    ]).then(([c, l, ld]) => {
      setContacts(c);
      setListings(l);
      setLeads(ld);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [lensEmail]);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        {[1,2,3].map(i => <div key={i} className="h-64 bg-surface rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4 mt-6">

      {/* CRM Contacts */}
      <div className="bg-card border border-hairline rounded-xl overflow-hidden">
        <SectionHeader
          icon={Users}
          title="CRM Contacts"
          color="from-evergreen-tint"
          count={contacts.length}
          linkTo="/contacts"
          linkLabel="All contacts"
        />
        <div className="divide-y divide-hairline max-h-72 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No contacts found</div>
          ) : contacts.slice(0, 8).map(c => (
            <div key={c.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-surface transition-colors">
              <div className="w-7 h-7 rounded-full bg-evergreen-tint flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-evergreen">{(c.full_name || '?').charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{c.full_name || '—'}</div>
                <div className="text-[10px] text-muted-foreground truncate">{c.primary_email || c.primary_phone_normalized || '—'}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {c.current_tag && <StatusBadge status={c.current_tag} />}
              </div>
            </div>
          ))}
        </div>
        {contacts.length > 8 && (
          <div className="px-4 py-2 border-t border-hairline">
            <Link to="/contacts" className="text-xs text-evergreen hover:underline">+{contacts.length - 8} more contacts</Link>
          </div>
        )}
      </div>

      {/* Pixxi Listings */}
      <div className="bg-card border border-hairline rounded-xl overflow-hidden">
        <SectionHeader
          icon={Building2}
          title="Pixxi Listings"
          color="from-brass-tint"
          count={listings.length}
          linkTo="/inventory"
          linkLabel="All listings"
        />
        <div className="divide-y divide-hairline max-h-72 overflow-y-auto">
          {listings.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No listings found</div>
          ) : listings.slice(0, 8).map(l => (
            <div key={l.id} className="px-4 py-2.5 flex items-start gap-2 hover:bg-surface transition-colors">
              <Building2 className="w-3.5 h-3.5 text-muted-2 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{l.project_name || l.title || '—'}</div>
                <div className="text-[10px] text-muted-foreground">
                  {l.zone || ''}
                  {l.unit_number ? ` · Unit ${l.unit_number}` : ''}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={l.status || 'new'} />
                {l.asking_price && (
                  <span className="text-[10px] text-muted-2 font-mono">AED {Number(l.asking_price).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {listings.length > 8 && (
          <div className="px-4 py-2 border-t border-hairline">
            <Link to="/inventory" className="text-xs text-brass hover:underline">+{listings.length - 8} more listings</Link>
          </div>
        )}
      </div>

      {/* Portal Leads */}
      <div className="bg-card border border-hairline rounded-xl overflow-hidden">
        <SectionHeader
          icon={TrendingUp}
          title="Bayut & Dubizzle Leads"
          color="from-sky-tint"
          count={leads.length}
          linkTo="/leads"
          linkLabel="All leads"
        />
        <div className="divide-y divide-hairline max-h-72 overflow-y-auto">
          {leads.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No portal leads found</div>
          ) : leads.slice(0, 8).map(l => (
            <div key={l.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-surface transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{l.contact_name || '—'}</div>
                <div className="text-[10px] text-muted-foreground">
                  {l.budget_aed ? `AED ${Number(l.budget_aed).toLocaleString()}` : ''}
                  {l.zone ? ` · ${l.zone}` : ''}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-semibold capitalize', SOURCE_COLORS[l.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                  {l.source}
                </span>
                {l.stage && <StatusBadge status={l.stage} />}
              </div>
            </div>
          ))}
        </div>
        {leads.length > 8 && (
          <div className="px-4 py-2 border-t border-hairline">
            <Link to="/leads" className="text-xs text-sky hover:underline">+{leads.length - 8} more leads</Link>
          </div>
        )}
      </div>

    </div>
  );
}