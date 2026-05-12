import { Phone, Mail, Building2, MapPin, Database, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

function SourceBadge({ sourceLabel, sourceSystem }) {
  const isExcel = sourceSystem === 'excel' || (sourceLabel || '').toLowerCase().includes('excel');
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
      isExcel
        ? 'bg-brass-tint text-brass border border-brass/20'
        : 'bg-evergreen-tint text-evergreen border border-evergreen/20'
    )}>
      {isExcel
        ? <FileSpreadsheet className="w-2.5 h-2.5" />
        : <Database className="w-2.5 h-2.5" />
      }
      {isExcel ? (sourceLabel || 'Excel') : 'Master DB'}
    </span>
  );
}

export default function OwnerCard({ owner, onClick }) {
  return (
    <button
      onClick={() => onClick(owner)}
      className="text-left w-full bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-evergreen/40 transition-all group"
    >
      {/* Name row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-semibold text-foreground group-hover:text-evergreen transition-colors truncate leading-tight">
          {owner.owner_name || 'Unknown Owner'}
        </div>
        <SourceBadge sourceLabel={owner.source_label} sourceSystem={owner.source_system} />
      </div>

      {/* Area */}
      {owner.owner_area && (
        <div className="flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">{owner.owner_area}</span>
          {owner.building_name && owner.building_name !== owner.owner_area && (
            <span className="text-[11px] text-muted-2 truncate">· {owner.building_name}</span>
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
      <div className="flex gap-3 mt-3 pt-2.5 border-t border-hairline text-[11px] text-muted-foreground flex-wrap">
        {owner.flat_number && (
          <span>Unit {owner.flat_number}{owner.floor ? `, Fl ${owner.floor}` : ''}</span>
        )}
        {owner.owner_record_count != null && (
          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{owner.owner_record_count} records</span>
        )}
        {owner.linked_zones?.length > 0 && (
          <span>{owner.linked_zones.slice(0, 2).join(', ')}</span>
        )}
      </div>
    </button>
  );
}