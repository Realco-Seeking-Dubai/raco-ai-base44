import { X, Phone, Mail, MessageCircle, Building2, Calendar, Zap } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import LeadScoreBadge from '@/components/leads/LeadScoreBadge';
import ListingLinkBadge, { matchListings } from '@/components/leads/ListingLinkBadge';
import AgentAssignBadge from '@/components/leads/AgentAssignBadge';
import { cn } from '@/lib/utils';

const SOURCE_COLORS = {
  bayut: 'bg-brass-tint text-brass',
  dubizzle: 'bg-sky-tint text-sky',
  'property finder': 'bg-evergreen-tint text-evergreen',
  meta: 'bg-terracotta-tint text-terracotta',
  referral: 'bg-brass/20 text-brass',
};

export default function LeadDetailDrawer({ lead, listings, agents, onClose, onAssigned }) {
  if (!lead) return null;

  const matched = matchListings(lead, listings);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-hairline h-full overflow-y-auto shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-hairline px-5 py-4 flex items-center justify-between z-10">
          <div>
            <div className="font-semibold text-foreground text-base">{lead.name || 'Unknown Lead'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{lead.email || lead.phone || '—'}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Score + Stage */}
          <div className="flex items-center gap-3 flex-wrap">
            <LeadScoreBadge score={lead._score} />
            <StatusBadge status={lead.stage || 'new'} />
            {lead.source && (
              <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', SOURCE_COLORS[lead.source?.toLowerCase()] || 'bg-surface-2 text-muted-foreground')}>
                {lead.source}
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-hairline hover:bg-surface transition-colors">
                <Phone className="w-3.5 h-3.5 text-evergreen" /> Call
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-hairline hover:bg-surface transition-colors">
                <Mail className="w-3.5 h-3.5 text-sky" /> Email
              </a>
            )}
            {lead.phone && (
              <a href={`https://wa.me/${lead.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-hairline hover:bg-surface transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-brass" /> WhatsApp
              </a>
            )}
          </div>

          {/* Key details */}
          <div className="bg-surface rounded-xl p-4 space-y-2.5 text-sm">
            {lead.budget && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-semibold font-mono text-foreground">
                  AED {Number(lead.budget.split('|')[0]).toLocaleString()}
                  {lead.budget.split('|')[1] && lead.budget.split('|')[1] !== lead.budget.split('|')[0]
                    ? ` – ${Number(lead.budget.split('|')[1]).toLocaleString()}`
                    : ''}
                </span>
              </div>
            )}
            {lead.community && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Community</span>
                <span className="text-foreground">{lead.community}</span>
              </div>
            )}
            {lead.region && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="text-foreground">{lead.region}</span>
              </div>
            )}
            {lead.property_type && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property Type</span>
                <span className="text-foreground capitalize">{lead.property_type}</span>
              </div>
            )}
            {lead.bedrooms && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bedrooms</span>
                <span className="text-foreground">{lead.bedrooms} BR</span>
              </div>
            )}
            {lead.created_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received</span>
                <span className="text-foreground font-mono text-xs">{new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Agent Assignment */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assigned Agent</div>
            <AgentAssignBadge lead={lead} agents={agents} onAssigned={onAssigned} />
          </div>

          {/* Matched Listings */}
          {matched.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-3.5 h-3.5 text-sky" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Matching Listings</span>
                <ListingLinkBadge count={matched.length} />
              </div>
              <div className="space-y-2">
                {matched.map(l => (
                  <div key={l.id} className="bg-surface rounded-lg px-3 py-2.5 border border-hairline">
                    <div className="text-xs font-medium text-foreground">{l.project_name || l.title || '—'}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{l.zone}{l.unit_number ? ` · Unit ${l.unit_number}` : ''}</span>
                      {l.asking_price && <span className="text-[10px] font-mono text-muted-2">AED {Number(l.asking_price).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insight */}
          {lead._score >= 70 && (
            <div className="bg-terracotta-tint border border-terracotta/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-terracotta" />
                <span className="text-xs font-semibold text-terracotta">Raco Insight</span>
              </div>
              <p className="text-xs text-terracotta/80">
                High-potential lead. {matched.length > 0 ? `${matched.length} listing${matched.length > 1 ? 's' : ''} match their criteria — reach out within 24 hours for best conversion.` : 'No exact listing match yet — consider creating a pocket listing or exploring similar zones.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}