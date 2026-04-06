import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone as PhoneIcon, Globe, ExternalLink } from 'lucide-react';

const AVAILABLE_SERVICES = [
  'Chiropractic', 'Physical Therapy', 'Pain Management', 'Imaging',
  'Orthopedic Surgery', 'Neurology', 'Radiology', 'General Practice', 'Surgery', 'Other',
];

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

  // Fetch patients linked to this provider
  const { data: patients } = useQuery({
    queryKey: ['provider-patients-names', profile?.provider_id],
    queryFn: async () => {
      const { data } = await supabase.from('cases')
        .select('id, patient_name')
        .eq('provider_id', profile!.provider_id!)
        .neq('status', 'Settled')
        .order('patient_name');
      return data || [];
    },
    enabled: !!profile?.provider_id,
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!provider) return <p className="text-muted-foreground text-sm py-8 text-center">No provider profile linked to your account.</p>;

  const servicesOffered = (provider as any).services_offered || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
        <Globe className="w-3.5 h-3.5" />
        <span>Practice information is managed by Got Hurt Injury Network. Contact us to request updates.</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Clinic Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left Column */}
          <div className="divide-y divide-border">
            <InfoRow label="Clinic Owner" value={(provider as any).clinic_owner || ''} />
            <InfoRow label="Clinic Name" value={provider.name} />
            <InfoRow
              label="Phone"
              value={provider.phone || ''}
              suffix={provider.phone ? (
                <a href={`tel:${provider.phone}`} className="text-success ml-2">
                  <PhoneIcon className="w-4 h-4" />
                </a>
              ) : undefined}
            />
            <InfoRow
              label="Website"
              value={provider.website_url || ''}
              renderValue={provider.website_url ? (
                <a href={provider.website_url.startsWith('http') ? provider.website_url : `https://${provider.website_url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm break-all flex items-center gap-1">
                  {provider.website_url} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : undefined}
            />
            <InfoRow
              label="Services Offered"
              value={servicesOffered.length > 0 ? servicesOffered.join('; ') : '—'}
            />
            <InfoRow label="Extended Hours" value={(provider as any).extended_hours ? 'Yes' : 'No'} />
          </div>

          {/* Right Column */}
          <div className="divide-y divide-border">
            <InfoRow
              label="Email"
              value={(provider as any).email || ''}
              renderValue={(provider as any).email ? (
                <a href={`mailto:${(provider as any).email}`} className="text-primary hover:underline text-sm">
                  {(provider as any).email}
                </a>
              ) : undefined}
            />
            <InfoRow
              label="Secondary Email"
              value={(provider as any).secondary_email || ''}
              renderValue={(provider as any).secondary_email ? (
                <a href={`mailto:${(provider as any).secondary_email}`} className="text-primary hover:underline text-sm">
                  {(provider as any).secondary_email}
                </a>
              ) : undefined}
            />
            <InfoRow
              label="Fax"
              value={(provider as any).fax || ''}
              suffix={(provider as any).fax ? (
                <a href={`tel:${(provider as any).fax}`} className="text-success ml-2">
                  <PhoneIcon className="w-4 h-4" />
                </a>
              ) : undefined}
            />
            <InfoRow
              label="Languages"
              value={(provider.languages_spoken || []).length > 0 ? provider.languages_spoken.join('; ') : '—'}
            />
            <InfoRow label="Offers Transportation" value={(provider as any).offers_transportation ? 'Yes' : 'No'} />
            <InfoRow label="Offers Virtual" value={(provider as any).offers_virtual ? 'Yes' : 'No'} />
            <div className="flex items-start justify-between px-6 py-4">
              <span className="text-sm text-muted-foreground w-36 shrink-0 text-right pr-6">Patients</span>
              <div className="flex-1 flex flex-wrap gap-1.5">
                {patients && patients.length > 0 ? patients.map(p => (
                  <span key={p.id} className="text-sm text-primary">{p.patient_name}</span>
                )) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance section — read-only */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Compliance & Status</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="divide-y divide-border">
            <InfoRow label="HIPAA BAA on File" value={provider.hipaa_baa_on_file ? 'Yes' : 'No'} />
            <InfoRow label="Interpreter Available" value={provider.interpreter_available ? 'Yes' : 'No'} />
            <InfoRow label="Credentialing Expiry" value={provider.credentialing_expiry || '—'} />
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-muted-foreground w-36 shrink-0 text-right pr-6">Status</span>
              <Badge variant={provider.status === 'Active' ? 'default' : 'secondary'} className="text-xs">{provider.status}</Badge>
            </div>
            <InfoRow label="Rating" value={provider.rating ? `${provider.rating} / 5` : 'Not rated'} />
            <InfoRow label="Locations" value={String(provider.locations || 1)} />
          </div>
        </div>
      </div>

      {/* Notes — read-only */}
      {provider.notes && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{provider.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, suffix, renderValue }: {
  label: string;
  value: string;
  suffix?: React.ReactNode;
  renderValue?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm text-muted-foreground w-36 shrink-0 text-right pr-6">{label}</span>
      <div className="flex-1 flex items-center">
        <div className="text-sm">
          {renderValue || (
            <span className={value && value !== '—' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              {value || '—'}
            </span>
          )}
        </div>
        {suffix}
      </div>
    </div>
  );
}
