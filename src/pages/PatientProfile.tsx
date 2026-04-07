import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { User, Shield, FileText, Phone, Mail, MapPin, Calendar, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LANGUAGES } from '@/lib/languages';
import { US_STATES } from '@/lib/us-states';
import { PHIBanner } from '@/components/global/PHIBanner';
import { logPHIAccess } from '@/lib/audit-logger';

export default function PatientProfile() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: patientProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['patient-profile-detail', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('patient_profiles')
        .select('*')
        .eq('profile_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ['patient-case-summary', patientProfile?.case_id],
    enabled: !!patientProfile?.case_id,
    queryFn: async () => {
      const { data } = await supabase.from('cases')
        .select('case_number, status, accident_date, accident_state, opened_date, patient_name, patient_phone, patient_email, preferred_language, attorney_id, provider_id, attorneys:attorney_id(firm_name), providers:provider_id(name)')
        .eq('id', patientProfile!.case_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: docCount } = useQuery({
    queryKey: ['patient-doc-count', patientProfile?.case_id],
    enabled: !!patientProfile?.case_id,
    queryFn: async () => {
      const { count } = await supabase.from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('case_id', patientProfile!.case_id!);
      return count || 0;
    },
  });

  const [form, setForm] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
    preferred_language: 'English',
    date_of_birth: '',
  });

  useEffect(() => {
    if (patientProfile) {
      setForm({
        address: patientProfile.address || '',
        city: patientProfile.city || '',
        state: patientProfile.state || '',
        zip: patientProfile.zip || '',
        preferred_language: patientProfile.preferred_language || 'English',
        date_of_birth: patientProfile.date_of_birth || '',
      });
    }
  }, [patientProfile]);

  useEffect(() => {
    logPHIAccess({ action: 'view', resource_type: 'patient_profile', resource_id: user?.id });
  }, [user?.id]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!patientProfile) throw new Error('Profile not found');
      const { error } = await supabase.from('patient_profiles')
        .update({
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          preferred_language: form.preferred_language,
          date_of_birth: form.date_of_birth || null,
        })
        .eq('id', patientProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-profile-detail'] });
      toast.success('Profile updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isLoading = loadingProfile || loadingCase;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PHIBanner />
        <h2 className="font-display text-2xl">My Profile</h2>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PHIBanner />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <User className="w-6 h-6 text-primary" /> My Profile
        </h2>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
        >
          <Save className="w-3.5 h-3.5" />
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information — Editable */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <p className="text-sm font-medium text-foreground">{profile?.full_name || '—'}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <p className="text-sm text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  {caseData?.patient_phone || '—'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {caseData?.patient_email || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Street Address</Label>
                <Input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ZIP</Label>
                  <Input
                    value={form.zip}
                    onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                    maxLength={10}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Contact Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Preferred Language</Label>
                <Select value={form.preferred_language} onValueChange={v => setForm(f => ({ ...f, preferred_language: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Interpreter Needed</Label>
                <p className="text-sm">{patientProfile?.needs_interpreter ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Read-only summaries */}
        <div className="space-y-6">
          {/* Case Summary */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Case Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Case Number</span>
                <span className="font-mono font-medium text-foreground">{caseData?.case_number || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-[10px]">{caseData?.status || '—'}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Date of Injury</span>
                <span className="text-foreground">{caseData?.accident_date ? format(new Date(caseData.accident_date), 'MMM d, yyyy') : '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">State</span>
                <span className="text-foreground">{caseData?.accident_state || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Attorney</span>
                <span className="text-foreground">{(caseData as any)?.attorneys?.firm_name || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Provider</span>
                <span className="text-foreground">{(caseData as any)?.providers?.name || '—'}</span>
              </div>
            </div>
          </div>

          {/* Insurance & Documents Status */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Insurance & Documents
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">HIPAA Authorization</span>
                {patientProfile?.hipaa_auth_signed ? (
                  <span className="text-success flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Signed</span>
                ) : (
                  <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Pending</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Assignment of Benefits</span>
                {patientProfile?.assignment_of_benefits_signed ? (
                  <span className="text-success flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Signed</span>
                ) : (
                  <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Pending</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Insurance Status</span>
                <Badge variant="outline" className="text-[10px]">{patientProfile?.insurance_status || 'Unknown'}</Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Documents on File</span>
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> {docCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
