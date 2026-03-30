import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/global/StatusBadge';
import { toast } from 'sonner';
import { ShieldCheck, Plus, CheckCircle2 } from 'lucide-react';

const PRIMARY_BILLING_PATHS = ['Lien', 'PIP', 'MedPay'];
const SECONDARY_BILLING_PATHS = ['None', 'Lien', 'PIP', 'MedPay'];

export function InsuranceEligibilityTab({ caseId }: { caseId: string }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const isAdminOrCM = profile?.role === 'admin' || profile?.role === 'care_manager';

  const { data: eligibility, isLoading } = useQuery({
    queryKey: ['insurance-eligibility', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('insurance_eligibility')
        .select('*, verified_by_profile:profiles!insurance_eligibility_verified_by_fkey(full_name)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const [form, setForm] = useState({
    primary_billing_path: 'Lien',
    secondary_billing_path: 'None',
    policy_number: '',
    carrier_name: '',
    coverage_limit: '',
    notes: '',
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('insurance_eligibility').insert({
        case_id: caseId,
        primary_billing_path: form.primary_billing_path,
        secondary_billing_path: form.secondary_billing_path === 'None' ? null : form.secondary_billing_path,
        policy_number: form.policy_number || null,
        carrier_name: form.carrier_name || null,
        coverage_limit: form.coverage_limit ? Number(form.coverage_limit) : null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-eligibility', caseId] });
      setShowAdd(false);
      setForm({ primary_billing_path: 'Lien', secondary_billing_path: 'None', policy_number: '', carrier_name: '', coverage_limit: '', notes: '' });
      toast.success('Insurance record added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('insurance_eligibility').update({
        verified: true,
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-eligibility', caseId] });
      toast.success('Verified');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const billingPathColor = (path: string) => {
    switch (path) {
      case 'PIP': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MedPay': return 'bg-violet-50 text-violet-700 border-violet-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Insurance & Billing Path</h3>
        </div>
        {isAdminOrCM && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : !eligibility?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
          No insurance eligibility records. {isAdminOrCM && 'Add one to determine the billing path.'}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium">Billing Path</th>
                <th className="text-left px-3 py-2 font-medium">Carrier</th>
                <th className="text-left px-3 py-2 font-medium">Policy #</th>
                <th className="text-right px-3 py-2 font-medium">Coverage Limit</th>
                <th className="text-left px-3 py-2 font-medium">Notes</th>
                <th className="text-right px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {eligibility.map((e: any) => (
                <tr key={e.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium px-1.5 py-0.5 rounded-full border ${billingPathColor(e.primary_billing_path)}`}>
                        1° {e.primary_billing_path}
                      </span>
                      {e.secondary_billing_path && (
                        <span className={`font-medium px-1.5 py-0.5 rounded-full border ${billingPathColor(e.secondary_billing_path)}`}>
                          2° {e.secondary_billing_path}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-foreground">{e.carrier_name || '—'}</td>
                  <td className="px-3 py-2 font-mono text-foreground">{e.policy_number || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground tabular-nums">{e.coverage_limit ? `$${Number(e.coverage_limit).toLocaleString()}` : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{e.notes || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {e.verified ? (
                      <span className="flex items-center justify-end gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : isAdminOrCM ? (
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-primary px-2" onClick={() => verifyMutation.mutate(e.id)}>
                        Verify
                      </Button>
                    ) : (
                      <span className="text-amber-600">Unverified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Insurance Record</DialogTitle></DialogHeader>
          <form onSubmit={ev => { ev.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Billing Path</Label>
                <Select value={form.primary_billing_path} onValueChange={v => setForm(f => ({ ...f, primary_billing_path: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIMARY_BILLING_PATHS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secondary Billing Path</Label>
                <Select value={form.secondary_billing_path} onValueChange={v => setForm(f => ({ ...f, secondary_billing_path: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SECONDARY_BILLING_PATHS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Carrier Name</Label><Input value={form.carrier_name} onChange={e => setForm(f => ({ ...f, carrier_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Policy Number</Label><Input value={form.policy_number} onChange={e => setForm(f => ({ ...f, policy_number: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Coverage Limit ($)</Label><Input type="number" value={form.coverage_limit} onChange={e => setForm(f => ({ ...f, coverage_limit: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
