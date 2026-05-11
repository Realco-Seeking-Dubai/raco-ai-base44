import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Dubai center
const DUBAI_CENTER = [25.2048, 55.2708];

// Zone center coordinates for Dubai areas
const ZONE_COORDS = {
  'Al Furjan': [25.0356, 55.1364],
  'JVC': [25.0557, 55.2106],
  'Dubai Hills': [25.1124, 55.2430],
  'Downtown': [25.1972, 55.2744],
  'Palm Jumeirah': [25.1124, 55.1390],
  'Business Bay': [25.1869, 55.2621],
  'DIFC': [25.2131, 55.2811],
  'Dubai Marina': [25.0805, 55.1403],
  'JBR': [25.0769, 55.1322],
  'MBR City': [25.1610, 55.3087],
  'Arabian Ranches': [25.0538, 55.2683],
  'DAMAC Hills': [24.9981, 55.2379],
  'Jumeirah Village': [25.0557, 55.2106],
  'The Springs': [25.0370, 55.1520],
};

const PIN_COLORS = {
  hot: '#c2410c',     // terracotta
  warm: '#b45309',    // brass
  owner: '#166534',   // evergreen
  lead: '#0369a1',    // sky
  listing: '#7c3aed', // purple
};

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (!markers?.length) return;
    const bounds = markers.map(m => [m.lat, m.lng]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [markers]);
  return null;
}

/**
 * markers: Array<{ id, lat, lng, label, type: 'hot'|'warm'|'owner'|'lead'|'listing', sub? }>
 */
export default function PropertyMap({ markers = [], height = 380, className }) {
  // Enrich with fallback coords from known zones if lat/lng missing
  const resolved = markers
    .map(m => {
      if (m.lat && m.lng) return m;
      const zoneKey = Object.keys(ZONE_COORDS).find(z =>
        m.zone?.toLowerCase().includes(z.toLowerCase()) ||
        m.label?.toLowerCase().includes(z.toLowerCase())
      );
      if (!zoneKey) return null;
      const [lat, lng] = ZONE_COORDS[zoneKey];
      // Jitter slightly so pins don't stack perfectly
      return { ...m, lat: lat + (Math.random() - 0.5) * 0.008, lng: lng + (Math.random() - 0.5) * 0.008 };
    })
    .filter(Boolean);

  return (
    <div className={cn('rounded-xl overflow-hidden border border-hairline', className)} style={{ height }}>
      <MapContainer
        center={DUBAI_CENTER}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {resolved.map((m, i) => (
          <CircleMarker
            key={m.id || i}
            center={[m.lat, m.lng]}
            radius={m.type === 'hot' ? 10 : 8}
            pathOptions={{
              fillColor: PIN_COLORS[m.type] || PIN_COLORS.lead,
              color: 'white',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="text-xs min-w-[120px]">
                <div className="font-semibold text-sm mb-0.5">{m.label}</div>
                {m.sub && <div className="text-muted-foreground">{m.sub}</div>}
                {m.type && <div className="mt-1 capitalize font-medium" style={{ color: PIN_COLORS[m.type] }}>{m.type}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        <FitBounds markers={resolved} />
      </MapContainer>
    </div>
  );
}

export { ZONE_COORDS };