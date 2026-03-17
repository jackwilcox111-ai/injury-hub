import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShieldCheck, MapPin, Phone, Globe, Star, Pencil } from 'lucide-react';

const SPECIALTIES = [
  'Chiropractic', 'Orthopedic', 'Pain Management', 'Physical Therapy',
  'Neurology', 'Radiology', 'General Practice', 'Surgery', 'Other',
];

export function ProviderProfileTab() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

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

  const updateField = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!profile?.provider_id) throw new Error('No provider linked');
      const { error } = await supabase.from('providers')
        .update(updates)
        .eq('id', profile.provider_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      toast.success('Profile updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const save = (field: string, value: unknown) => {
    if (!provider) return;
    if ((provider as any)[field] === value) return;
    updateField.mutate({ [field]: value });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!provider) return <p className="text-muted-foreground text-sm py-8 text-center">No provider profile linked to your account.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Pencil className="w-3.5 h-3.5" />
        <span>Click any field to edit. Changes save automatically.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Practice Info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Practice Information</h3>
          <div className="space-y-3">
            <EditableRow
              icon={<MapPin className="w-4 h-4" />}
              label="Practice Name"
              defaultValue={provider.name}
              onSave={(v) => save('name', v)}
            />
            <EditableRow
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              defaultValue={provider.phone || ''}
              placeholder="Enter phone..."
              onSave={(v) => save('phone', v || null)}
            />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Specialty</span>
              <Select
                defaultValue={provider.specialty || ''}
                onValueChange={(v) => save('specialty', v)}
              >
                <SelectTrigger className="h-7 w-40 text-xs border-dashed">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <EditableRow
              label="Locations"
              defaultValue={String(provider.locations || 1)}
              type="number"
              onSave={(v) => save('locations', parseInt(v) || 1)}
            />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Star className="w-4 h-4" /> Rating
              </span>
              <span className="text-xs font-medium text-foreground">
                {provider.rating ? `${provider.rating} / 5` : 'Not rated'}
              </span>
            </div>
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
              <Switch
                checked={provider.hipaa_baa_on_file ?? false}
                onCheckedChange={(v) => save('hipaa_baa_on_file', v)}
              />
            </div>
            <EditableRow
              label="Credentialing Expiry"
              defaultValue={provider.credentialing_expiry || ''}
              type="date"
              placeholder="YYYY-MM-DD"
              onSave={(v) => save('credentialing_expiry', v || null)}
            />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Interpreter Available</span>
              <Switch
                checked={provider.interpreter_available}
                onCheckedChange={(v) => save('interpreter_available', v)}
              />
            </div>
            <div className="flex items-start justify-between py-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> Languages
              </span>
              <LanguageEditor
                languages={provider.languages_spoken || []}
                onSave={(v) => save('languages_spoken', v)}
              />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge variant={provider.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">{provider.status}</Badge>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-xl p-6 md:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
          <EditableTextarea
            defaultValue={provider.notes || ''}
            placeholder="Add notes about your practice..."
            onSave={(v) => save('notes', v || null)}
          />
        </div>
      </div>
    </div>
  );
}

function EditableRow({ icon, label, defaultValue, placeholder, type = 'text', onSave }: {
  icon?: React.ReactNode;
  label: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground flex items-center gap-2">{icon}{label}</span>
      <Input
        className="h-7 w-40 text-xs text-right border-dashed"
        type={type}
        value={value}
        placeholder={placeholder || '—'}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
      />
    </div>
  );
}

function EditableTextarea({ defaultValue, placeholder, onSave }: {
  defaultValue: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Textarea
      className="text-sm border-dashed min-h-[60px]"
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
    />
  );
}

function LanguageEditor({ languages, onSave }: { languages: string[]; onSave: (v: string[]) => void }) {
  const [newLang, setNewLang] = useState('');

  const addLanguage = () => {
    const trimmed = newLang.trim();
    if (trimmed && !languages.includes(trimmed)) {
      onSave([...languages, trimmed]);
      setNewLang('');
    }
  };

  const removeLanguage = (lang: string) => {
    onSave(languages.filter(l => l !== lang));
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap gap-1 justify-end">
        {languages.map((l) => (
          <Badge
            key={l}
            variant="outline"
            className="text-[10px] cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => removeLanguage(l)}
            title="Click to remove"
          >
            {l} ×
          </Badge>
        ))}
      </div>
      <Input
        className="h-6 w-28 text-[10px] border-dashed"
        placeholder="Add language..."
        value={newLang}
        onChange={(e) => setNewLang(e.target.value)}
        onBlur={addLanguage}
        onKeyDown={(e) => e.key === 'Enter' && addLanguage()}
      />
    </div>
  );
}
