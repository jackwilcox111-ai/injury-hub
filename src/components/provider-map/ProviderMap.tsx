import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSpecialtyColor } from '@/lib/specialties';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Provider {
  id: string;
  name: string;
  specialty: string | null;
  latitude: number | null;
  longitude: number | null;
  accepting_patients: boolean | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone: string | null;
}

interface Props {
  providers: Provider[];
  activeId: string | null;
  onSelectProvider: (id: string) => void;
}

export interface ProviderMapHandle {
  flyTo: (lat: number, lng: number) => void;
}

export const ProviderMapView = forwardRef<ProviderMapHandle, Props>(
  ({ providers, activeId, onSelectProvider }, ref) => {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);

    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number) => {
        mapRef.current?.flyTo([lat, lng], 15, { duration: 0.8 });
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { center: [28.0, -82.45], zoom: 10, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      return () => { map.remove(); mapRef.current = null; };
    }, []);

    useEffect(() => {
      if (!markersRef.current || !mapRef.current) return;
      markersRef.current.clearLayers();
      const mappable = providers.filter(p => p.latitude != null && p.longitude != null);

      mappable.forEach(p => {
        const color = getSpecialtyColor(p.specialty);
        const isActive = p.id === activeId;
        const size = isActive ? 36 : 28;
        const icon = L.divIcon({
          className: 'custom-provider-marker',
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:${isActive ? `0 0 0 3px ${color},` : ''}0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;transition:all .2s"><div style="width:8px;height:8px;border-radius:50%;background:white"></div></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2],
        });

        const address = [p.address_street, p.address_city, p.address_state, p.address_zip].filter(Boolean).join(', ');
        const accepting = p.accepting_patients !== false;

        const marker = L.marker([p.latitude!, p.longitude!], { icon })
          .bindPopup(`<div style="min-width:180px"><strong>${p.name}</strong><br/>${p.specialty ? `<span style="font-size:11px;color:${color}">${p.specialty}</span><br/>` : ''}<span style="font-size:11px;color:${accepting ? '#16a34a' : '#6b7280'}">${accepting ? '✓ Accepting Patients' : '✗ Not Accepting'}</span><br/>${address ? `<span style="font-size:11px">${address}</span>` : ''}</div>`)
          .on('click', () => onSelectProvider(p.id));

        markersRef.current!.addLayer(marker);
      });

      if (mappable.length > 0) {
        const bounds = L.latLngBounds(mappable.map(p => [p.latitude!, p.longitude!] as [number, number]));
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }, [providers, activeId, onSelectProvider]);

    return (
      <div className="w-full rounded-xl overflow-hidden border border-border shadow-sm">
        <style>{`.custom-provider-marker { background: transparent !important; border: none !important; }`}</style>
        <div ref={containerRef} style={{ height: '500px', width: '100%' }} />
      </div>
    );
  }
);