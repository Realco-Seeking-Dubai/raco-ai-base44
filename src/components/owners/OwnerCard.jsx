import { Phone, Mail, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OwnerCard({ owner, onClick }) {
  return (
    <button
      onClick={() => onClick(owner)}
      className="text-left w-full bg-card border border-hairline rounded-xl p-4 hover:shadow-sm hover:border-evergreen/40 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-semibold text-foreground group-hover:text-evergreen transition-colors truncate">
          {owner.owner_name || 'Unknown Owner'}
        </div>
        {owner.owner_area && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-evergreen-tint text-evergreen font-medium shrink-0 max-w-[90px] truncate">
            {owner.owner_area}
          </span>
        )}
      </div>

      <div className="space-y-1">
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

      <div className="flex gap-3 mt-3 pt-3 border-t border-hairline text-[11px] text-muted-foreground">
        {owner.owner_record_count != null && (
          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{owner.owner_record_count} records</span>
        )}
        {owner.linked_project_count != null && owner.linked_project_count > 0 && (
          <span>{owner.linked_project_count} projects</span>
        )}
        {owner.linked_zones?.length > 0 && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{owner.linked_zones.slice(0, 2).join(', ')}</span>
        )}
      </div>
    </button>
  );
}