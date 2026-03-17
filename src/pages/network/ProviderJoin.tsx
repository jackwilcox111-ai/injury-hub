import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { US_STATES, SPECIALTIES } from '@/lib/us-states';
import { CheckCircle, Stethoscope } from 'lucide-react';

export default function ProviderJoin() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    practice_name: '', contact_name: '', specialty: '', email: '', phone: '',
    locations: 1, state: '', license_number: '', lien_experience: false, hipaa_baa_agreed: false,
    referral_source: '',
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hipaa_baa_agreed) { toast.error('You must agree to the HIPAA BAA'); return; }
    setLoading(true);
    const { data: appData, error } = await supabase.from('provider_applications').insert({
      practice_name: form.practice_name, contact_name: form.contact_name,
      specialty: form.specialty, email: form.email, phone: form.phone,
      locations: form.locations, state: form.state,
      license_number: form.license_number || null,
      lien_experience: form.lien_experience, hipaa_baa_agreed: form.hipaa_baa_agreed,
    }).select('id').single();
    if (error) toast.error(error.message);
    else {
      if (form.referral_source && appData?.id) {
        await supabase.from('referral_sources').insert({
          entity_id: appData.id,
          entity_type: 'provider_application',
          source_type: form.referral_source,
        });
      }
      setSubmitted(true); toast.success('Application submitted');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-6 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-success/8 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Application Received</h2>
          <p className="text-muted-foreground text-sm">Thank you. Our network team will review your application and contact you within 2 business days.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="text-xs font-medium uppercase tracking-widest text-success mb-3 block">Provider Network</span>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Join the Network</h2>
          <p className="text-sm text-muted-foreground">Apply to treat PI patients on lien through CareLink.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Practice Name *</Label><Input value={form.practice_name} onChange={e => set('practice_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>Specialty *</Label>
                <Select value={form.specialty} onValueChange={v => set('specialty', v)}>
                  <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                  <SelectContent>{SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Number of Locations</Label><Input type="number" min={1} value={form.locations} onChange={e => set('locations', parseInt(e.target.value) || 1)} /></div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Select value={form.state} onValueChange={v => set('state', v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>License Number</Label><Input value={form.license_number} onChange={e => set('license_number', e.target.value)} /></div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>How did you hear about CareLink?</Label>
            <Select value={form.referral_source} onValueChange={v => set('referral_source', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['Attorney Referral', 'Google', 'Conference', 'Social Media', 'Colleague', 'Other'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox checked={form.lien_experience} onCheckedChange={v => set('lien_experience', !!v)} id="lien" />
              <Label htmlFor="lien" className="text-sm">I have treated PI patients on lien before</Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox checked={form.hipaa_baa_agreed} onCheckedChange={v => set('hipaa_baa_agreed', !!v)} id="baa" />
              <Label htmlFor="baa" className="text-sm leading-relaxed">
                I agree to execute a HIPAA Business Associate Agreement with CareLink *
              </Label>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg">
            {loading ? 'Submitting...' : 'Apply to Join Network'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
