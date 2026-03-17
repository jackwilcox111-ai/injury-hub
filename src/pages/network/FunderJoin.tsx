import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

export default function FunderJoin() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '',
    funding_min: '', funding_max: '', accredited: '', experience: '',
    referral_source: '',
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accredited) { toast.error('Please indicate accredited investor status'); return; }
    setLoading(true);
    const { error } = await supabase.from('funder_applications').insert({
      company_name: form.company_name,
      contact_name: form.contact_name,
      email: form.email,
      phone: form.phone || null,
      funding_capacity_min: form.funding_min ? parseFloat(form.funding_min) : null,
      funding_capacity_max: form.funding_max ? parseFloat(form.funding_max) : null,
      accredited_investor: form.accredited === 'yes',
      experience_notes: form.experience || null,
    });
    setLoading(false);
    if (error) { toast.error('Submission failed. Please try again.'); return; }
    setSubmitted(true);
    toast.success('Interest form submitted');
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-6 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-settled/8 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-settled" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Thank You</h2>
          <p className="text-muted-foreground text-sm">A member of our investment team will contact you shortly.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Funder Interest Form</h2>
        <p className="text-sm text-muted-foreground mb-8">Join our pre-settlement funding network. Complete the form below to express interest.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={e => set('company_name', e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
          </div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Min Funding Capacity ($)</Label><Input type="number" value={form.funding_min} onChange={e => set('funding_min', e.target.value)} /></div>
            <div className="space-y-2"><Label>Max Funding Capacity ($)</Label><Input type="number" value={form.funding_max} onChange={e => set('funding_max', e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Accredited Investor? *</Label>
            <Select value={form.accredited} onValueChange={v => set('accredited', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Experience / Notes</Label><Textarea value={form.experience} onChange={e => set('experience', e.target.value)} rows={3} placeholder="Tell us about your lending experience..." /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Submitting...' : 'Submit Interest Form'}</Button>
        </form>
      </div>
    </PublicLayout>
  );
}
