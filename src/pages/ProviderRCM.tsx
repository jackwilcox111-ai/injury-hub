import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CreditCard, Plus } from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  'Not Submitted': 'bg-muted text-muted-foreground',
  Submitted: 'bg-blue-100 text-blue-700',
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Denied: 'bg-red-100 text-red-700',
  Appealed: 'bg-violet-100 text-violet-700',
  Paid: 'bg-emerald-200 text-emerald-800',
};

export default function ProviderRCM() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_name: '', date_of_service: '', cpt_codes: '', icd_codes: '', billed_amount: '', insurance_carrier: '' });

  const { data: rcmCases, isLoading } = useQuery({
    queryKey: ['provider-rcm'],
    queryFn: async () => {
      const { data } = await supabase.from('rcm_cases')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const addClaim = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('rcm_cases').insert({
        provider_id: profile!.provider_id!,
        patient_name: form.patient_name,
        date_of_service: form.date_of_service,
        cpt_codes: form.cpt_codes.split(',').map(s => s.trim()).filter(Boolean),
        icd_codes: form.icd_codes.split(',').map(s => s.trim()).filter(Boolean),
        billed_amount: parseFloat(form.billed_amount) || 0,
        insurance_carrier: form.insurance_carrier || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-rcm'] });
      setShowAdd(false);
      setForm({ patient_name: '', date_of_service: '', cpt_codes: '', icd_codes: '', billed_amount: '', insurance_carrier: '' });
      toast.success('Claim submitted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-xl">RCM Billing</h2><Skeleton className="h-96 rounded-xl" /></div>;

  const totalSubmitted = rcmCases?.filter(c => c.submission_status !== 'Not Submitted').length || 0;
  const pending = rcmCases?.filter(c => ['Submitted', 'Pending'].includes(c.submission_status)).length || 0;
  const paidThisMonth = rcmCases?.filter(c => c.submission_status === 'Paid' && c.payment_date && new Date(c.payment_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s, c) => s + (c.paid_amount || 0), 0) || 0;
  const denied = rcmCases?.filter(c => c.submission_status === 'Denied').length || 0;
  const denialRate = rcmCases && rcmCases.length > 0 ? Math.round(denied / rcmCases.length * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-foreground flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> RCM Billing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your claims managed by CareLink</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Submit Claim</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Submitted', value: totalSubmitted, color: 'text-blue-600' },
          { label: 'Pending', value: pending, color: 'text-amber-600' },
          { label: 'Collected This Month', value: `$${paidThisMonth.toLocaleString()}`, color: 'text-emerald-600' },
          { label: 'Denial Rate', value: `${denialRate}%`, color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">DOS</th>
             <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">CPT</th>
             <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">ICD</th>
             <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Billed</th>
             <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
             <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Denial</th>
             <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Paid</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {rcmCases?.map(c => (
              <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 text-xs">{c.patient_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.date_of_service}</td>
                 <td className="px-4 py-3 font-mono text-[10px]">{(c.cpt_codes as string[])?.join(', ')}</td>
                 <td className="px-4 py-3 font-mono text-[10px]">{(c.icd_codes as string[])?.join(', ') || '—'}</td>
                 <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">${c.billed_amount.toLocaleString()}</td>
                 <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${statusColors[c.submission_status] || ''}`}>{c.submission_status}</Badge></td>
                 <td className="px-4 py-3 text-xs text-muted-foreground">{c.denial_reason || '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{c.paid_amount != null ? `$${c.paid_amount.toLocaleString()}` : '—'}</td>
              </tr>
            ))}
             {(!rcmCases || rcmCases.length === 0) && (
               <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No claims submitted yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit New Claim</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addClaim.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Patient Name *</Label><Input value={form.patient_name} onChange={e => setForm(p => ({ ...p, patient_name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label className="text-xs">DOS *</Label><Input type="date" value={form.date_of_service} onChange={e => setForm(p => ({ ...p, date_of_service: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">CPT Codes (comma-separated) *</Label><Input value={form.cpt_codes} onChange={e => setForm(p => ({ ...p, cpt_codes: e.target.value }))} required /></div>
              <div className="space-y-2"><Label className="text-xs">ICD Codes (comma-separated)</Label><Input value={form.icd_codes} onChange={e => setForm(p => ({ ...p, icd_codes: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Billed Amount *</Label><Input type="number" step="0.01" value={form.billed_amount} onChange={e => setForm(p => ({ ...p, billed_amount: e.target.value }))} required /></div>
              <div className="space-y-2"><Label className="text-xs">Insurance Carrier</Label><Input value={form.insurance_carrier} onChange={e => setForm(p => ({ ...p, insurance_carrier: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addClaim.isPending}>Submit</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
