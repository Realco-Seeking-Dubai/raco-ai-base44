import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import PropertyMap from '@/components/map/PropertyMap';
import { MapPin, ChevronRight, Building2, Map } from 'lucide-react';

const COLORS = {
  evergreen: { bg: 'bg-evergreen-tint', text: 'text-evergreen', border: 'border-evergreen/20', dot: 'bg-evergreen' },
  sky: { bg: 'bg-sky-tint', text: 'text-sky', border: 'border-sky/20', dot: 'bg-sky' },
  brass: { bg: 'bg-brass-tint', text: 'text-brass', border: 'border-brass/20', dot: 'bg-brass' },
  terracotta: { bg: 'bg-terracotta-tint', text: 'text-terracotta', border: 'border-terracotta/20', dot: 'bg-terracotta' },
  muted: { bg: 'bg-surface-2', text: 'text-muted-foreground', border: 'border-hairline', dot: 'bg-muted-2' },
};

export default function Zones() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Zones & Projects"
        subtitle="Market zones & master projects"
      />

      {/* Interactive Map */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Map className="w-4 h-4 text-evergreen" />
          <span className="text-sm font-semibold text-foreground">Zone & Lead Density Map</span>
          <span className="text-xs text-muted-foreground ml-1">— click pins for details</span>
        </div>
        <PropertyMap
          height={400}
          markers={[
            { id: 'z1', zone: 'Downtown', label: 'Core — Downtown', type: 'listing', sub: '46 projects' },
            { id: 'z2', zone: 'Palm Jumeirah', label: 'Waterfront — Palm', type: 'listing', sub: '12 projects' },
            { id: 'z3', zone: 'MBR City', label: 'MBR City', type: 'warm', sub: '19 projects' },
            { id: 'z4', zone: 'Al Furjan', label: 'Suburbs — Al Furjan', type: 'owner', sub: '55 projects' },
            { id: 'z5', zone: 'Dubai Marina', label: 'Dubai Marina', type: 'lead', sub: 'High activity' },
            { id: 'z6', zone: 'Business Bay', label: 'Business Bay', type: 'lead', sub: 'Hot zone' },
            { id: 'z7', zone: 'JVC', label: 'JVC Cluster', type: 'warm', sub: 'Growing demand' },
            { id: 'z8', zone: 'Dubai Hills', label: 'Dubai Hills', type: 'hot', sub: 'Premium villas' },
            { id: 'z9', zone: 'Arabian Ranches', label: 'Arabian Ranches', type: 'owner', sub: 'Established' },
          ]}
        />
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {[
            { color: '#166534', label: 'Owner / Seller' },
            { color: '#0369a1', label: 'Lead / Buyer' },
            { color: '#b45309', label: 'Warm Prospect' },
            { color: '#c2410c', label: 'Hot Opportunity' },
            { color: '#7c3aed', label: 'Active Listing' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}