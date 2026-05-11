import { Building2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Matches a lead to a listing by zone/property type.
 * listings: array from pixxi_listings
 * lead: single lead record
 */
export function matchListings(lead, listings) {
  return listings.filter(l => {
    const zoneMatch = lead.zone && l.zone &&
      l.zone.toLowerCase().includes(lead.zone.toLowerCase());
    const priceMatch = lead.budget_aed && l.asking_price &&
      Math.abs(Number(l.asking_price) - Number(lead.budget_aed)) / Number(lead.budget_aed) < 0.3;
    return zoneMatch || priceMatch;
  }).slice(0, 3);
}

export default function ListingLinkBadge({ count }) {
  if (!count) return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
      'bg-sky-tint text-sky border border-sky/20'
    )}>
      <Building2 className="w-2.5 h-2.5" />
      {count} listing{count !== 1 ? 's' : ''}
    </span>
  );
}