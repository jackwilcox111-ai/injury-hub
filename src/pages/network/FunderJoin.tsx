import { useState } from 'react';
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
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accredited) { toast.error('Please indicate accredited investor status'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setSubmitted(true);
    toast.success('Interest form submitted');
    setLoading(false);
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
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="text-xs font-medium uppercase tracking-widest text-settled mb-3 block">Investment Opportunity</span>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Become a Network Funder</h2>
          <p className="text-sm text-muted-foreground">Express interest in funding PI medical liens through CareLink.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={e => set('company_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div className="space-y-2"><Label>Min Funding per Case ($)</Label><Input type="number" min={0} value={form.funding_min} onChange={e => set('funding_min', e.target.value)} placeholder="e.g., 5,000" /></div>
              <div className="space-y-2"><Label>Max Funding per Case ($)</Label><Input type="number" min={0} value={form.funding_max} onChange={e => set('funding_max', e.target.value)} placeholder="e.g., 50,000" /></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <Label>Are you an accredited investor? *</Label>
              <Select value={form.accredited} onValueChange={v => set('accredited', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tell us about your PI funding experience</Label>
              <Textarea value={form.experience} onChange={e => set('experience', e.target.value)} rows={4} placeholder="Portfolio size, deal types, etc." />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg">
            {loading ? 'Submitting...' : 'Express Interest'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
