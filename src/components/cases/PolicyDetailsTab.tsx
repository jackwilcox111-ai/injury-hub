import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function PolicyDetailsTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy-details', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('policy_details').select('*').eq('case_id', caseId).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (policy) setForm(policy);
    else setForm({ case_id: caseId });
  }, [policy, caseId]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, case_id: caseId };
      if (policy?.id) {
        const { error } = await supabase.from('policy_details').update(payload).eq('id', policy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('policy_details').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['policy-details', caseId] }); toast.success('Policy details saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const f = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-foreground">Policy & Coverage Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label className="text-xs">Insurance Carrier</Label><Input value={form.insurance_carrier || ''} onChange={e => f('insurance_carrier', e.target.value)} /></div>
        <div className="space-y-2"><Label className="text-xs">Claim Number</Label><Input value={form.claim_number || ''} onChange={e => f('claim_number', e.target.value)} /></div>
        <div className="space-y-2"><Label className="text-xs">Adjuster Name</Label><Input value={form.adjuster_name || ''} onChange={e => f('adjuster_name', e.target.value)} /></div>
        <div className="space-y-2"><Label className="text-xs">Adjuster Phone</Label><Input value={form.adjuster_phone || ''} onChange={e => f('adjuster_phone', e.target.value)} /></div>
        <div className="space-y-2 col-span-2"><Label className="text-xs">Adjuster Email</Label><Input value={form.adjuster_email || ''} onChange={e => f('adjuster_email', e.target.value)} /></div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Coverage Limits</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2"><Label className="text-xs">Bodily Injury (per person)</Label><Input type="number" step="0.01" value={form.policy_limit_bodily_injury ?? ''} onChange={e => f('policy_limit_bodily_injury', e.target.value ? parseFloat(e.target.value) : null)} /></div>
          <div className="space-y-2"><Label className="text-xs">Per Accident</Label><Input type="number" step="0.01" value={form.policy_limit_per_accident ?? ''} onChange={e => f('policy_limit_per_accident', e.target.value ? parseFloat(e.target.value) : null)} /></div>
          <div className="space-y-2"><Label className="text-xs">UM/UIM Limit</Label><Input type="number" step="0.01" value={form.um_uim_limit ?? ''} onChange={e => f('um_uim_limit', e.target.value ? parseFloat(e.target.value) : null)} /></div>
          <div className="space-y-2"><Label className="text-xs">MedPay Limit</Label><Input type="number" step="0.01" value={form.medpay_limit ?? ''} onChange={e => f('medpay_limit', e.target.value ? parseFloat(e.target.value) : null)} /></div>
          <div className="space-y-2"><Label className="text-xs">PIP Limit</Label><Input type="number" step="0.01" value={form.pip_limit ?? ''} onChange={e => f('pip_limit', e.target.value ? parseFloat(e.target.value) : null)} /></div>
          <div className="flex items-center gap-2 pt-5"><Switch checked={form.pip_exhausted || false} onCheckedChange={v => f('pip_exhausted', v)} /><Label className="text-xs">PIP Exhausted</Label></div>
        </div>
      </div>

      <div className="border-t border-border pt-4 flex items-center gap-3">
        <Switch checked={form.coverage_disputed || false} onCheckedChange={v => f('coverage_disputed', v)} />
        <Label className="text-xs font-medium">Coverage Disputed</Label>
      </div>
      {form.coverage_disputed && (
        <Textarea value={form.coverage_dispute_notes || ''} onChange={e => f('coverage_dispute_notes', e.target.value)} placeholder="Dispute details..." rows={2} />
      )}

      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Retainer</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2"><Switch checked={form.retainer_signed || false} onCheckedChange={v => f('retainer_signed', v)} /><Label className="text-xs">Retainer Signed</Label></div>
          <div className="space-y-2"><Label className="text-xs">Retainer Date</Label><Input type="date" value={form.retainer_date || ''} onChange={e => f('retainer_date', e.target.value || null)} /></div>
          <div className="space-y-2"><Label className="text-xs">Attorney Fee %</Label><Input type="number" step="0.01" value={form.retainer_fee_percent ?? 33.33} onChange={e => f('retainer_fee_percent', parseFloat(e.target.value) || 33.33)} /></div>
        </div>
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Policy Details'}</Button>
    </div>
  );
}
