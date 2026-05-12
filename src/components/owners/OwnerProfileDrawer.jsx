import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Phone, Mail, Building2, MapPin, Loader2, Globe, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OwnerProfileDrawer({ ownerId, onClose }) {
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    setOwner(null);
    base44.functions.invoke('getOwnerExplorer', { action: 'owner_profile', owner_id: ownerId })
      .then(res => setOwner(res.data?.owner || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ownerId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-background shadow-2xl border-l border-hairline flex flex-col animate-slide-in overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline shrink-0 bg-card">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-evergreen" />
            <span className="text-sm font-semibold text-foreground">Owner Profile</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-evergreen" />
          </div>
        ) : !owner ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Owner not found.
          </div>
        ) : (
          <div className="flex-1 p-5 space-y-5">
            {/* Identity */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">{owner.owner_name}</h2>
              {owner.owner_area && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-evergreen-tint text-evergreen font-medium">
                  <MapPin className="w-3 h-3" /> {owner.owner_area}
                </span>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</div>
              {owner.email ? (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${owner.email}`} className="text-evergreen hover:underline truncate">{owner.email}</a>
                </div>
              ) : (
                <div className="text-sm text-muted-2">No email on record</div>
              )}
              {owner.mobile ? (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${owner.mobile}`} className="text-foreground hover:underline">{owner.mobile}</a>
                </div>
              ) : (
                <div className="text-sm text-muted-2">No phone on record</div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-lg p-3">
                <div className="text-xl font-bold text-foreground">{owner.owner_record_count ?? '—'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total Records</div>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <div className="text-xl font-bold text-foreground">{owner.linked_project_count ?? '—'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Linked Projects</div>
              </div>
            </div>

            {/* Zones */}
            {owner.linked_zones?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Zones</div>
                <div className="flex flex-wrap gap-1.5">
                  {owner.linked_zones.map(z => (
                    <span key={z} className="text-xs px-2 py-0.5 rounded-full bg-sky-tint text-sky border border-sky/20">{z}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio — linked master projects */}
            {owner.linked_master_project_names?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Portfolio — Communities ({owner.linked_master_project_names.length})
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {owner.linked_master_project_names.map((p, i) => (
                    <div key={i} className="text-xs px-2 py-1 rounded bg-surface text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground shrink-0" /> {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked projects / buildings */}
            {owner.linked_projects?.filter(Boolean).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Properties / Buildings ({owner.linked_projects.filter(Boolean).length})
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {owner.linked_projects.filter(Boolean).map((p, i) => (
                    <div key={i} className="text-xs px-2 py-1 rounded bg-surface text-foreground">
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement */}
            {(owner.last_approached_at || owner.last_responded_at) && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Engagement</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {owner.last_approached_at && (
                    <div>Last approached: <span className="text-foreground">{new Date(owner.last_approached_at).toLocaleDateString()}</span></div>
                  )}
                  {owner.last_responded_at && (
                    <div>Last responded: <span className="text-foreground">{new Date(owner.last_responded_at).toLocaleDateString()}</span></div>
                  )}
                </div>
              </div>
            )}

            <div className="text-[10px] text-muted-2 pt-2">Source: {owner.source_system}</div>
          </div>
        )}
      </div>
    </div>
  );
}