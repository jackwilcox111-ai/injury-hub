import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { US_STATES } from '@/lib/us-states';

const CHANNELS = ['Digital Ads', 'Social Media', 'SEO/Content', 'Direct Outreach', 'Referral Network', 'Billboard/OOH', 'Radio/TV', 'Other'];

export default function MarketerSettings() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: mp, isLoading } = useQuery({
    queryKey: ['marketer-profile', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_profiles') as any).select('*').eq('profile_id', profile!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });

  useEffect(() => {
    if (mp) setForm({
      company_name: mp.company_name || '',
      marketing_channels: mp.marketing_channels || [],
      geographic_focus: mp.geographic_focus || [],
      payout_method: mp.payout_method || '',
      payout_details: mp.payout_details || {},
    });
  }, [mp]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('marketer_profiles') as any).update({
        company_name: form.company_name || null,
        marketing_channels: form.marketing_channels,
        geographic_focus: form.geographic_focus,
        payout_method: form.payout_method || null,
        payout_details: form.payout_details,
      }).eq('id', mp.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketer-profile'] }); toast.success('Settings saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const changePw = async () => {
    if (pw.newPw !== pw.confirm) { toast.error('Passwords do not match'); return; }
    const { error } = await supabase.auth.updateUser({ password: pw.newPw });
    if (error) toast.error(error.message); else { toast.success('Password updated'); setPw({ current: '', newPw: '', confirm: '' }); }
  };

  const toggleChannel = (ch: string) => setForm((p: any) => ({
    ...p, marketing_channels: p.marketing_channels?.includes(ch) ? p.marketing_channels.filter((c: string) => c !== ch) : [...(p.marketing_channels || []), ch],
  }));

  const toggleState = (st: string) => setForm((p: any) => ({
    ...p, geographic_focus: p.geographic_focus?.includes(st) ? p.geographic_focus.filter((s: string) => s !== st) : [...(p.geographic_focus || []), st],
  }));

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="font-display text-xl text-foreground">Settings</h2>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Profile</h3>
        <div className="space-y-2"><Label>Name</Label><Input value={profile?.full_name || ''} disabled /></div>
        <div className="space-y-2"><Label>Company</Label><Input value={form.company_name || ''} onChange={e => setForm((p: any) => ({ ...p, company_name: e.target.value }))} /></div>

        <div className="space-y-2">
          <Label>Marketing Channels</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CHANNELS.map(ch => (
              <label key={ch} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={form.marketing_channels?.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />{ch}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Geographic Focus</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto">
            {US_STATES.map(s => (
              <label key={s.value} className="flex items-center gap-1 text-[10px] cursor-pointer">
                <Checkbox checked={form.geographic_focus?.includes(s.value)} onCheckedChange={() => toggleState(s.value)} />{s.value}
              </label>
            ))}
          </div>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Profile'}</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Payout Method</h3>
        <Select value={form.payout_method || ''} onValueChange={v => setForm((p: any) => ({ ...p, payout_method: v }))}>
          <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ACH">ACH</SelectItem>
            <SelectItem value="Check">Check</SelectItem>
            <SelectItem value="Wire">Wire</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => save.mutate()} variant="outline" disabled={save.isPending}>Update Payout</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Change Password</h3>
        <div className="space-y-2"><Label>New Password</Label><Input type="password" value={pw.newPw} onChange={e => setPw(p => ({ ...p, newPw: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
        <Button variant="outline" onClick={changePw}>Update Password</Button>
      </div>
    </div>
  );
}
