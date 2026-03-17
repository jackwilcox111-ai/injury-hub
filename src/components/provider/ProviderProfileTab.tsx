import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, MapPin, Phone, Globe, Star } from 'lucide-react';

export function ProviderProfileTab() {
  const { profile } = useAuth();

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider-profile', profile?.provider_id],
    queryFn: async () => {
      if (!profile?.provider_id) return null;
      const { data } = await supabase.from('providers')
        .select('*')
        .eq('id', profile.provider_id)
        .single();
      return data;
    },
    enabled: !!profile?.provider_id,
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!provider) return <p className="text-muted-foreground text-sm py-8 text-center">No provider profile linked to your account.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Practice Info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Practice Information</h3>
        <div className="space-y-3">
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Practice Name" value={provider.name} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={provider.phone || '—'} />
          <InfoRow label="Specialty" value={provider.specialty || '—'} />
          <InfoRow label="Locations" value={String(provider.locations || 1)} />
          <InfoRow icon={<Star className="w-4 h-4" />} label="Rating" value={provider.rating ? `${provider.rating} / 5` : 'Not rated'} />
        </div>
      </div>

      {/* Compliance & Languages */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Compliance & Languages</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> HIPAA BAA on File
            </span>
            <Badge variant={provider.hipaa_baa_on_file ? 'default' : 'destructive'} className="text-[10px]">
              {provider.hipaa_baa_on_file ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Credentialing Expiry</span>
            <span className="text-xs font-mono text-foreground">{provider.credentialing_expiry || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Interpreter Available</span>
            <Badge variant={provider.interpreter_available ? 'default' : 'outline'} className="text-[10px]">
              {provider.interpreter_available ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-start justify-between py-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" /> Languages
            </span>
            <div className="flex flex-wrap gap-1 justify-end">
              {(provider.languages_spoken || []).map((l: string) => (
                <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge variant={provider.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">{provider.status}</Badge>
          </div>
        </div>
      </div>

      {/* Notes */}
      {provider.notes && (
        <div className="bg-card border border-border rounded-xl p-6 md:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground">{provider.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground flex items-center gap-2">{icon}{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
