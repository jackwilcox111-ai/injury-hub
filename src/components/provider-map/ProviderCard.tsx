import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { getSpecialtyColor } from '@/lib/specialties';

export interface ProviderMapData {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  languages_spoken: string[];
  rating: number | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  accepting_patients: boolean | null;
  logo_url: string | null;
  website_url: string | null;
  distance_miles?: number | null;
}

interface Props {
  provider: ProviderMapData;
  isActive: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}

export function ProviderCard({ provider, isActive, onClick, onHover }: Props) {
  const address = [provider.address_street, provider.address_city, provider.address_state, provider.address_zip]
    .filter(Boolean)
    .join(', ');
  const color = getSpecialtyColor(provider.specialty);
  const accepting = provider.accepting_patients !== false;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
        isActive
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {provider.specialty && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {provider.specialty}
              </span>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] ${
                accepting
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-gray-50 text-gray-500'
              }`}
            >
              {accepting ? 'Accepting Patients' : 'Not Accepting'}
            </Badge>
          </div>
        </div>
        {provider.distance_miles != null && (
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            {provider.distance_miles.toFixed(1)} mi
          </span>
        )}
      </div>

      {address && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{address}</span>
        </div>
      )}

      {!provider.latitude && !provider.longitude && (
        <p className="text-[10px] text-muted-foreground/60 mt-2 italic">Map location unavailable</p>
      )}
    </button>
  );
}
