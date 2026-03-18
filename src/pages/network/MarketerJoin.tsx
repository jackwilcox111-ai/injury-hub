import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { US_STATES } from '@/lib/us-states';
import { CheckCircle, Megaphone } from 'lucide-react';

const CHANNELS = ['Digital Ads', 'Social Media', 'SEO/Content', 'Direct Outreach', 'Referral Network', 'Billboard/OOH', 'Radio/TV', 'Other'];

export default function MarketerJoin() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', company_name: '', email: '', phone: '',
    marketing_channels: [] as string[], geographic_focus: [] as string[],
    pi_experience: false, experience_detail: '', tos_agreed: false,
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleChannel = (ch: string) => {
    setForm(prev => ({
      ...prev,
      marketing_channels: prev.marketing_channels.includes(ch)
        ? prev.marketing_channels.filter(c => c !== ch)
        : [...prev.marketing_channels, ch],
    }));
  };

  const toggleState = (st: string) => {
    setForm(prev => ({
      ...prev,
      geographic_focus: prev.geographic_focus.includes(st)
        ? prev.geographic_focus.filter(s => s !== st)
        : [...prev.geographic_focus, st],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tos_agreed) { toast.error('You must agree to the Terms of Service'); return; }
    if (form.marketing_channels.length === 0) { toast.error('Select at least one marketing channel'); return; }
    if (form.geographic_focus.length === 0) { toast.error('Select at least one state'); return; }
    setLoading(true);
    const { error } = await (supabase.from('marketer_applications') as any).insert({
      full_name: form.full_name, company_name: form.company_name || null,
      email: form.email, phone: form.phone,
      marketing_channels: form.marketing_channels, geographic_focus: form.geographic_focus,
      pi_experience: form.pi_experience,
      experience_detail: form.pi_experience ? form.experience_detail : null,
      tos_agreed: true, tos_agreed_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message);
    else { setSubmitted(true); toast.success('Application submitted'); }
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
          <p className="text-muted-foreground text-sm">Thank you. Our team will review your application and contact you within 2 business days.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="text-xs font-medium uppercase tracking-widest text-primary mb-3 block">Marketer Network</span>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Join as a Marketer</h2>
          <p className="text-sm text-muted-foreground">Apply to submit PI cases to the GHIN case marketplace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Company Name</Label><Input value={form.company_name} onChange={e => set('company_name', e.target.value)} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required /></div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-sm font-semibold">Marketing Channels *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CHANNELS.map(ch => (
                <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.marketing_channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-sm font-semibold">Geographic Focus *</Label>
            <p className="text-xs text-muted-foreground">Select all states where you market</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
              {US_STATES.map(s => (
                <label key={s.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={form.geographic_focus.includes(s.value)} onCheckedChange={() => toggleState(s.value)} />
                  {s.value}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={form.pi_experience} onCheckedChange={v => set('pi_experience', v)} />
              <Label className="text-sm">Do you have experience marketing PI cases?</Label>
            </div>
            {form.pi_experience && (
              <div className="space-y-2">
                <Label>Briefly describe your experience</Label>
                <Textarea value={form.experience_detail} onChange={e => set('experience_detail', e.target.value)} rows={3} />
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <Label className="text-sm font-semibold">Terms of Service</Label>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Marketers fund their own campaigns and marketing efforts</li>
              <li>All submitted cases pass a quality review before being listed in the marketplace</li>
              <li>Fees are paid per the published fee schedule upon qualifying trigger events</li>
            </ul>
            <div className="flex items-start gap-3">
              <Checkbox checked={form.tos_agreed} onCheckedChange={v => set('tos_agreed', !!v)} id="tos" />
              <Label htmlFor="tos" className="text-sm leading-relaxed">
                I agree to the GHIN Marketer Network Terms of Service *
              </Label>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg">
            {loading ? 'Submitting...' : 'Apply to Join as a Marketer'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
