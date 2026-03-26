import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSpecialtyColor } from '@/lib/specialties';
import { ProviderMapData } from './ProviderCard';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, ExternalLink, Navigation } from 'lucide-react';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createColorIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%; background: ${color};
      border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function createActiveIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker-active',
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50%; background: ${color};
      border: 4px solid white; box-shadow: 0 0 0 3px ${color}, 0 4px 12px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      animation: pulse 1.5s ease-in-out infinite;
    "><div style="width: 10px; height: 10px; border-radius: 50%; background: white;"></div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [center[0], center[1], zoom]);
  return null;
}

interface Props {
  providers: ProviderMapData[];
  center: [number, number];
  zoom: number;
  activeId: string | null;
  hoveredId: string | null;
  onSelectProvider: (id: string) => void;
}

export function ProviderMapView({ providers, center, zoom, activeId, hoveredId, onSelectProvider }: Props) {
  const mappable = providers.filter(p => p.latitude != null && p.longitude != null);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border shadow-sm">
      <style>{`
        .custom-marker, .custom-marker-active { background: transparent !important; border: none !important; }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} zoom={zoom} />

        {mappable.map(p => {
          const color = getSpecialtyColor(p.specialty);
          const isActive = p.id === activeId || p.id === hoveredId;
          const icon = isActive ? createActiveIcon(color) : createColorIcon(color);
          const accepting = p.accepting_patients !== false;
          const address = [p.address_street, p.address_city, p.address_state, p.address_zip].filter(Boolean).join(', ');
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || `${p.latitude},${p.longitude}`)}`;

          return (
            <Marker
              key={p.id}
              position={[p.latitude!, p.longitude!]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectProvider(p.id),
              }}
            >
              <Popup maxWidth={280} className="provider-popup">
                <div className="space-y-2 py-1">
                  <h3 className="font-semibold text-sm text-foreground">{p.name}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.specialty && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                        {p.specialty}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      accepting ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {accepting ? 'Accepting Patients' : 'Not Accepting'}
                    </span>
                  </div>
                  {address && <p className="text-xs text-gray-600">{address}</p>}
                  {p.phone && <p className="text-xs text-gray-600">{p.phone}</p>}
                  <div className="flex gap-2 pt-1">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      <Navigation className="w-3 h-3" /> Get Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
