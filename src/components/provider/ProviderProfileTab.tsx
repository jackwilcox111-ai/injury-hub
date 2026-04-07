import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Phone as PhoneIcon, Globe, ExternalLink, Pencil, Save, X } from 'lucide-react';
import { SPECIALTIES } from '@/lib/us-states';
import { LANGUAGES } from '@/lib/languages';

const AVAILABLE_SERVICES = [
  'Chiropractic', 'Physical Therapy', 'Pain Management', 'Imaging',
  'Orthopedic Surgery', 'Neurology', 'Radiology', 'General Practice', 'Surgery', 'Other',
];

export function ProviderProfileTab() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});

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

  const { data: locations } = useQuery({
    queryKey: ['provider-locations', profile?.provider_id],
    queryFn: async () => {
      const { data } = await supabase.from('provider_locations')
        .select('*')
        .eq('provider_id', profile!.provider_id!)
        .order('is_primary', { ascending: false });
      return data || [];
    },
    enabled: !!profile?.provider_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from('providers')
        .update(updates)
        .eq('id', profile!.provider_id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      toast.success('Practice information updated');
      setEditing(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const startEditing = () => {
    if (!provider) return;
    setDraft({
      clinic_owner: (provider as any).clinic_owner || '',
      name: provider.name || '',
      phone: provider.phone || '',
      website_url: provider.website_url || '',
      email: (provider as any).email || '',
      secondary_email: (provider as any).secondary_email || '',
      fax: (provider as any).fax || '',
      services_offered: (provider as any).services_offered || [],
      languages_spoken: provider.languages_spoken || [],
      extended_hours: (provider as any).extended_hours || false,
      offers_transportation: (provider as any).offers_transportation || false,
      offers_virtual: (provider as any).offers_virtual || false,
      interpreter_available: provider.interpreter_available || false,
    });
    setEditing(true);
  };

  const handleSave = () => {
    saveMutation.mutate(draft);
  };

  const set = (k: string, v: any) => setDraft(prev => ({ ...prev, [k]: v }));

  const toggleArrayItem = (key: string, item: string) => {
    setDraft(prev => {
      const arr: string[] = prev[key] || [];
      return { ...prev, [key]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] };
    });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!provider) return <p className="text-muted-foreground text-sm py-8 text-center">No provider profile linked to your account.</p>;

  const servicesOffered = (provider as any).services_offered || [];

  return (
    <div className="space-y-6">
      {/* Header with edit button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
          <Globe className="w-3.5 h-3.5" />
          <span>{editing ? 'Edit your practice details below. Click Save when done.' : 'You can update your practice information using the Edit button.'}</span>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5 shrink-0 ml-3">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Clinic Information */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Clinic Information</h3>
        </div>

        {editing ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldInput label="Clinic Owner" value={draft.clinic_owner} onChange={v => set('clinic_owner', v)} />
            <FieldInput label="Clinic Name" value={draft.name} onChange={v => set('name', v)} />
            <FieldInput label="Phone" value={draft.phone} onChange={v => set('phone', v)} type="tel" />
            <FieldInput label="Website" value={draft.website_url} onChange={v => set('website_url', v)} />
            <FieldInput label="Email" value={draft.email} onChange={v => set('email', v)} type="email" />
            <FieldInput label="Secondary Email" value={draft.secondary_email} onChange={v => set('secondary_email', v)} type="email" />
            <FieldInput label="Fax" value={draft.fax} onChange={v => set('fax', v)} type="tel" />

            {/* Languages multi-select */}
            <div className="space-y-2 col-span-full">
              <Label className="text-sm">Languages</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <label key={lang} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={(draft.languages_spoken || []).includes(lang)}
                      onCheckedChange={() => toggleArrayItem('languages_spoken', lang)}
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </div>

            {/* Services multi-select */}
            <div className="space-y-2 col-span-full">
              <Label className="text-sm">Services Offered</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SERVICES.map(svc => (
                  <label key={svc} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={(draft.services_offered || []).includes(svc)}
                      onCheckedChange={() => toggleArrayItem('services_offered', svc)}
                    />
                    {svc}
                  </label>
                ))}
              </div>
            </div>

            {/* Boolean toggles */}
            <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <ToggleField label="Extended Hours" checked={draft.extended_hours} onChange={v => set('extended_hours', v)} />
              <ToggleField label="Transportation" checked={draft.offers_transportation} onChange={v => set('offers_transportation', v)} />
              <ToggleField label="Offers Virtual" checked={draft.offers_virtual} onChange={v => set('offers_virtual', v)} />
              <ToggleField label="Interpreter Available" checked={draft.interpreter_available} onChange={v => set('interpreter_available', v)} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="divide-y divide-border">
              <InfoRow label="Clinic Owner" value={(provider as any).clinic_owner || ''} />
              <InfoRow label="Clinic Name" value={provider.name} />
              <InfoRow label="Phone" value={provider.phone || ''}
                suffix={provider.phone ? <a href={`tel:${provider.phone}`} className="text-success ml-2"><PhoneIcon className="w-4 h-4" /></a> : undefined} />
              <InfoRow label="Website" value={provider.website_url || ''}
                renderValue={provider.website_url ? (
                  <a href={provider.website_url.startsWith('http') ? provider.website_url : `https://${provider.website_url}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm break-all flex items-center gap-1">
                    {provider.website_url} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : undefined} />
              <InfoRow label="Services Offered" value={servicesOffered.length > 0 ? servicesOffered.join('; ') : '—'} />
              <InfoRow label="Extended Hours" value={(provider as any).extended_hours ? 'Yes' : 'No'} />
              <InfoRow label="Transportation" value={(provider as any).offers_transportation ? 'Yes' : 'No'} />
            </div>
            <div className="divide-y divide-border">
              <InfoRow label="Email" value={(provider as any).email || ''}
                renderValue={(provider as any).email ? <a href={`mailto:${(provider as any).email}`} className="text-primary hover:underline text-sm">{(provider as any).email}</a> : undefined} />
              <InfoRow label="Secondary Email" value={(provider as any).secondary_email || ''}
                renderValue={(provider as any).secondary_email ? <a href={`mailto:${(provider as any).secondary_email}`} className="text-primary hover:underline text-sm">{(provider as any).secondary_email}</a> : undefined} />
              <InfoRow label="Fax" value={(provider as any).fax || ''}
                suffix={(provider as any).fax ? <a href={`tel:${(provider as any).fax}`} className="text-success ml-2"><PhoneIcon className="w-4 h-4" /></a> : undefined} />
              <InfoRow label="Languages" value={(provider.languages_spoken || []).length > 0 ? provider.languages_spoken.join('; ') : '—'} />
              <InfoRow label="Offers Virtual" value={(provider as any).offers_virtual ? 'Yes' : 'No'} />
            </div>
          </div>
        )}
      </div>

      {/* Locations — read-only */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Locations ({locations?.length || 0})</h3>
        </div>
        {locations && locations.length > 0 ? (
          <div className="divide-y divide-border">
            {locations.map((loc: any) => (
              <div key={loc.id} className="px-6 py-4 flex items-start gap-3">
                <PhoneIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{loc.label || 'Office'}</span>
                    {loc.is_primary && <span className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">Primary</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[loc.address_street, loc.address_city, loc.address_state, loc.address_zip].filter(Boolean).join(', ') || 'No address on file'}
                  </p>
                  {(loc.phone || loc.fax) && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {loc.phone && `☎ ${loc.phone}`}{loc.phone && loc.fax && ' · '}{loc.fax && `Fax: ${loc.fax}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">No locations on file</div>
        )}
      </div>

      {/* Compliance — read-only */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Compliance</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="divide-y divide-border">
            <InfoRow label="HIPAA BAA on File" value={provider.hipaa_baa_on_file ? 'Yes' : 'No'} />
            <InfoRow label="Interpreter Available" value={provider.interpreter_available ? 'Yes' : 'No'} />
          </div>
          <div className="divide-y divide-border">
            <InfoRow label="Credentialing Expiry" value={provider.credentialing_expiry || '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function FieldInput({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} className="h-9" />
    </div>
  );
}

function ToggleField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function InfoRow({ label, value, suffix, renderValue }: {
  label: string; value: string; suffix?: React.ReactNode; renderValue?: React.ReactNode;
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
