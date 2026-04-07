import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, MapPin, Phone, Clock, Car, Video, Globe, ExternalLink } from 'lucide-react';

function buildGoogleMapsUrl(street?: string | null, city?: string | null, state?: string | null, zip?: string | null) {
  const parts = [street, city, state, zip].filter(Boolean).join(', ');
  if (!parts) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}

export default function PatientMedicalTeam() {
  const { profile } = useAuth();

  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-team', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('patient_profiles')
        .select('case_id')
        .eq('profile_id', profile!.id)
        .maybeSingle();
      return data;
    },
  });

  const caseId = patientProfile?.case_id;

  // Get the case's primary provider + any providers from appointments
  const { data: caseData } = useQuery({
    queryKey: ['patient-case-providers', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('cases')
        .select('provider_id, providers!cases_provider_id_fkey(id, name, specialty, phone, address_street, address_city, address_state, address_zip, extended_hours, offers_transportation, offers_virtual, services_offered)')
        .eq('id', caseId!)
        .maybeSingle();
      return data;
    },
  });

  // Get all providers the patient has appointments with
  const { data: appointmentProviders, isLoading } = useQuery({
    queryKey: ['patient-appt-providers', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('provider_id, specialty, providers!appointments_provider_id_fkey(id, name, specialty, phone, address_street, address_city, address_state, address_zip, extended_hours, offers_transportation, offers_virtual, services_offered)')
        .eq('case_id', caseId!)
        .not('provider_id', 'is', null);
      return data || [];
    },
  });

  // Get provider locations for richer address info
  const allProviderIds = new Set<string>();
  if ((caseData as any)?.providers?.id) allProviderIds.add((caseData as any).providers.id);
  appointmentProviders?.forEach(a => {
    if ((a as any).providers?.id) allProviderIds.add((a as any).providers.id);
  });

  const { data: locations } = useQuery({
    queryKey: ['patient-provider-locations', Array.from(allProviderIds)],
    enabled: allProviderIds.size > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('provider_locations')
        .select('*')
        .in('provider_id', Array.from(allProviderIds));
      return data || [];
    },
  });

  // Build deduplicated provider list
  const providersMap = new Map<string, any>();
  if ((caseData as any)?.providers) {
    const p = (caseData as any).providers;
    providersMap.set(p.id, { ...p, isPrimary: true });
  }
  appointmentProviders?.forEach(a => {
    const p = (a as any).providers;
    if (p && !providersMap.has(p.id)) {
      providersMap.set(p.id, { ...p, appointmentSpecialty: a.specialty });
    }
  });

  const providers = Array.from(providersMap.values());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" /> Your Medical Team
        </h2>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" /> Your Medical Team
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          These are the medical providers helping with your care. Tap an address to open directions.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Stethoscope className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Your medical team hasn't been assigned yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Your care manager will match you with providers soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map(provider => {
            const providerLocations = locations?.filter(l => l.provider_id === provider.id) || [];
            const mapsUrl = buildGoogleMapsUrl(provider.address_street, provider.address_city, provider.address_state, provider.address_zip);
            const specialty = provider.specialty || provider.appointmentSpecialty;

            return (
              <div key={provider.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Provider header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground">{provider.name}</h3>
                        {provider.isPrimary && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Primary Provider</Badge>
                        )}
                      </div>
                      {specialty && (
                        <p className="text-sm text-muted-foreground mt-0.5">{specialty}</p>
                      )}
                    </div>
                  </div>

                  {/* Services */}
                  {provider.services_offered && provider.services_offered.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {provider.services_offered.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Features */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {provider.extended_hours && (
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Extended Hours</span>
                    )}
                    {provider.offers_transportation && (
                      <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Transportation</span>
                    )}
                    {provider.offers_virtual && (
                      <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Virtual Visits</span>
                    )}
                  </div>

                  {/* Phone */}
                  {provider.phone && (
                    <a href={`tel:${provider.phone}`} className="flex items-center gap-2 text-sm text-primary font-medium">
                      <Phone className="w-4 h-4" /> {provider.phone}
                    </a>
                  )}
                </div>

                {/* Main address - tappable Google Maps link */}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3.5 bg-accent/50 border-t border-border hover:bg-accent transition-colors group"
                  >
                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {provider.address_street}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[provider.address_city, provider.address_state, provider.address_zip].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </a>
                )}

                {/* Additional locations */}
                {providerLocations.length > 0 && providerLocations.map(loc => {
                  const locUrl = buildGoogleMapsUrl(loc.address_street, loc.address_city, loc.address_state, loc.address_zip);
                  if (!locUrl) return null;
                  // Skip if it's the same as the main address
                  if (loc.address_street === provider.address_street && loc.address_city === provider.address_city) return null;
                  return (
                    <a
                      key={loc.id}
                      href={locUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-5 py-3 border-t border-border hover:bg-accent/50 transition-colors group"
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        {loc.label && <p className="text-xs font-medium text-muted-foreground">{loc.label}</p>}
                        <p className="text-sm text-foreground">{loc.address_street}</p>
                        <p className="text-xs text-muted-foreground">
                          {[loc.address_city, loc.address_state, loc.address_zip].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </a>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
