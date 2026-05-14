import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Phone, Mail, Building2, MapPin, Loader2, RefreshCw, ShieldCheck, Hash, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

function InfoRow({ label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-hairline last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn('text-xs text-foreground text-right', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function ConfidenceBar({ score }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-evergreen' : pct >= 50 ? 'bg-brass' : 'bg-terracotta';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

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
            <span className="text-sm font-semibold text-foreground">Owner Intelligence</span>
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
              <h2 className="text-lg font-bold text-foreground">{owner.owner_name}</h2>
              {owner.normalized_owner_name && owner.normalized_owner_name !== owner.owner_name?.toLowerCase() && (
                <p className="text-xs text-muted-2 mt-0.5 font-mono">{owner.normalized_owner_name}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {owner.owner_area && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-evergreen-tint text-evergreen font-medium">
                    <MapPin className="w-3 h-3" /> {owner.owner_area}
                  </span>
                )}
                {owner.property_id && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface text-muted-foreground font-mono border border-hairline">
                    <Hash className="w-3 h-3" /> {owner.property_id}
                  </span>
                )}
              </div>
            </div>

            {/* Data Confidence */}
            {owner.owner_confidence != null && (
              <div className="bg-surface rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-evergreen" />
                  <span className="text-xs font-semibold text-foreground">Data Confidence</span>
                </div>
                <ConfidenceBar score={owner.owner_confidence} />
                {owner.project_match_methods?.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Match methods: {owner.project_match_methods.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Contact */}
            <div className="bg-card border border-hairline rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</div>
              {owner.email ? (
                <div className="flex items-center gap-2 text-sm mb-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${owner.email}`} className="text-evergreen hover:underline truncate">{owner.email}</a>
                </div>
              ) : (
                <div className="text-sm text-muted-2 mb-1.5">No email on record</div>
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

            {/* KPI Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-lg p-3">
                <div className="text-xl font-bold text-foreground tabular-nums">{owner.owner_record_count ?? '—'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total Records</div>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <div className="text-xl font-bold text-foreground tabular-nums">{owner.linked_project_count ?? '—'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Linked Projects</div>
              </div>
            </div>

            {/* Engagement */}
            <div className="bg-card border border-hairline rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Engagement</div>
              <InfoRow label="Last approached" value={owner.last_approached_at ? new Date(owner.last_approached_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
              <InfoRow label="Last responded" value={owner.last_responded_at ? new Date(owner.last_responded_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
              {owner.reconnect_due_at && (
                <div className={cn(
                  'flex items-center justify-between py-1.5 text-xs',
                  new Date(owner.reconnect_due_at) <= new Date() ? 'text-terracotta font-medium' : 'text-brass'
                )}>
                  <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Reconnect due</span>
                  <span>{new Date(owner.reconnect_due_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {!owner.last_approached_at && !owner.last_responded_at && !owner.reconnect_due_at && (
                <div className="text-xs text-muted-2">No engagement history</div>
              )}
            </div>

            {/* Geographic Scope */}
            {(owner.linked_zones?.length > 0 || owner.linked_areas?.length > 0) && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Geographic Scope</div>
                {owner.linked_zones?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {owner.linked_zones.map(z => (
                      <span key={z} className="text-xs px-2 py-0.5 rounded-full bg-sky-tint text-sky border border-sky/20">{z}</span>
                    ))}
                  </div>
                )}
                {owner.linked_areas?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {owner.linked_areas.map(a => (
                      <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-surface text-muted-foreground border border-hairline">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Portfolio — linked master projects */}
            {owner.linked_master_project_names?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Communities ({owner.linked_master_project_names.length})
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {owner.linked_master_project_names.map((p, i) => (
                    <div key={i} className="text-xs px-2 py-1.5 rounded bg-surface text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground shrink-0" /> {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked buildings */}
            {owner.linked_projects?.filter(Boolean).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Buildings / Properties ({owner.linked_projects.filter(Boolean).length})
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {owner.linked_projects.filter(Boolean).map((p, i) => (
                    <div key={i} className="text-xs px-2 py-1.5 rounded bg-surface text-foreground">{p}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer meta */}
            <div className="pt-2 space-y-1 text-[10px] text-muted-2 border-t border-hairline">
              <div>Source: <span className="font-mono">{owner.source_system}</span></div>
              {owner.identity_key && <div>Identity key: <span className="font-mono">{owner.identity_key}</span></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}