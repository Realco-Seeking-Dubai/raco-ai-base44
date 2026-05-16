import { useState } from 'react';
import { Phone, Mail, Building2, MapPin, Database, FileSpreadsheet, RefreshCw, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import OwnerWhatsAppModal from './OwnerWhatsAppModal';

function SourceBadge({ sourceLabel, sourceSystem }) {
  const isExcel = sourceSystem === 'excel' || (sourceLabel || '').toLowerCase().includes('excel');
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
      isExcel
        ? 'bg-brass-tint text-brass border border-brass/20'
        : 'bg-evergreen-tint text-evergreen border border-evergreen/20'
    )}>
      {isExcel ? <FileSpreadsheet className="w-2.5 h-2.5" /> : <Database className="w-2.5 h-2.5" />}
      {isExcel ? (sourceLabel || 'Excel') : 'Master DB'}
    </span>
  );
}

function ConfidenceDot({ score }) {
  if (score == null) return null;
  const color = score >= 0.8 ? 'bg-evergreen' : score >= 0.5 ? 'bg-brass' : 'bg-terracotta';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={cn('w-1.5 h-1.5 rounded-full', color)} />
      {Math.round(score * 100)}% confidence
    </span>
  );
}

export default function OwnerCard({ owner, onClick, currentProject }) {
  const [showWA, setShowWA] = useState(false);
  const reconnectSoon = owner.reconnect_due_at && new Date(owner.reconnect_due_at) <= new Date(Date.now() + 7 * 86400000);

  return (
    <>
    <div className="relative text-left w-full bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-evergreen/40 transition-all group">
      <button className="absolute inset-0 w-full h-full" onClick={() => onClick(owner)} />
      {/* Name row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-semibold text-foreground group-hover:text-evergreen transition-colors truncate leading-tight">
          {owner.owner_name || 'Unknown Owner'}
        </div>
        <SourceBadge sourceLabel={owner.source_label} sourceSystem={owner.source_system} />
      </div>

      {/* Area + property ID */}
      {(owner.owner_area || owner.property_id) && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {owner.owner_area && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{owner.owner_area}</span>
            </div>
          )}
          {owner.property_id && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted-2 font-mono">{owner.property_id}</span>
          )}
        </div>
      )}

      {/* Contact */}
      <div className="space-y-0.5">
        {owner.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Mail className="w-3 h-3 shrink-0" /> {owner.email}
          </div>
        )}
        {owner.mobile && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0" /> {owner.mobile}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-hairline text-[11px] text-muted-foreground flex-wrap">
        {owner.owner_record_count != null && (
          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{owner.owner_record_count} records</span>
        )}
        {owner.linked_project_count != null && owner.linked_project_count > 0 && (
          <span>{owner.linked_project_count} projects</span>
        )}
        {owner.linked_zones?.length > 0 && (
          <span>{owner.linked_zones.slice(0, 2).join(', ')}</span>
        )}
        <ConfidenceDot score={owner.owner_confidence} />
        {reconnectSoon && (
          <span className="flex items-center gap-1 text-brass font-medium">
            <RefreshCw className="w-2.5 h-2.5" /> Reconnect due
          </span>
        )}
        {owner.mobile && (
          <button
            className="relative z-10 ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors font-medium text-[10px]"
            onClick={e => { e.stopPropagation(); setShowWA(true); }}
          >
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </button>
        )}
      </div>
    </div>

    {showWA && (
      <OwnerWhatsAppModal
        owner={owner}
        project={currentProject}
        onClose={() => setShowWA(false)}
      />
    )}
    </>
  );
}