import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { US_STATES } from '@/lib/us-states';
import { CheckCircle } from 'lucide-react';

const REFERRAL_SOURCES = ['Referral', 'Google', 'Conference', 'Social Media', 'Other'];

export default function AttorneyJoin() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firm_name: '', contact_name: '', email: '', phone: '',
    state: '', bar_number: '', pi_case_volume_monthly: '',
    referral_source: '',
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('attorney_applications').insert({
      firm_name: form.firm_name, contact_name: form.contact_name,
      email: form.email, phone: form.phone, state: form.state,
      bar_number: form.bar_number || null,
      pi_case_volume_monthly: form.pi_case_volume_monthly ? parseInt(form.pi_case_volume_monthly) : null,
      referral_source: form.referral_source || null,
    });
    if (error) toast.error(error.message);
    else { setSubmitted(true); toast.success('Application submitted'); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-6 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Partnership Application Received</h2>
          <p className="text-muted-foreground text-sm">Thank you. A CareLink partnership coordinator will be in touch within 1 business day.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="text-xs font-medium uppercase tracking-widest text-primary mb-3 block">Attorney Partnership</span>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Partner with CareLink</h2>
          <p className="text-sm text-muted-foreground">Register your firm to access coordinated PI medical care.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Firm Name *</Label><Input value={form.firm_name} onChange={e => set('firm_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>State of Practice *</Label>
                <Select value={form.state} onValueChange={v => set('state', v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Bar Number</Label><Input value={form.bar_number} onChange={e => set('bar_number', e.target.value)} /></div>
              <div className="space-y-2"><Label>Monthly PI Case Volume</Label><Input type="number" min={0} value={form.pi_case_volume_monthly} onChange={e => set('pi_case_volume_monthly', e.target.value)} /></div>
              <div className="space-y-2">
                <Label>How did you hear about CareLink?</Label>
                <Select value={form.referral_source} onValueChange={v => set('referral_source', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{REFERRAL_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg">
            {loading ? 'Submitting...' : 'Partner with CareLink'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
