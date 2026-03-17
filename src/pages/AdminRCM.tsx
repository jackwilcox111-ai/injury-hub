import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Landmark, Plus } from 'lucide-react';
import { useState } from 'react';

const STATUS_OPTIONS = ['Not Submitted', 'Submitted', 'Pending', 'Approved', 'Denied', 'Appealed', 'Paid', 'Adjusted'];
const statusColors: Record<string, string> = {
  'Not Submitted': 'bg-muted text-muted-foreground',
  Submitted: 'bg-blue-100 text-blue-700',
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Denied: 'bg-red-100 text-red-700',
  Appealed: 'bg-violet-100 text-violet-700',
  Paid: 'bg-emerald-200 text-emerald-800',
  Adjusted: 'bg-amber-200 text-amber-800',
};

export default function AdminRCM() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('All');
  const [tab, setTab] = useState('cases');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    provider_id: '', patient_name: '', date_of_service: '', cpt_codes: '', icd_codes: '',
    billed_amount: '', insurance_carrier: '', claim_number: '', submission_status: 'Not Submitted',
    notes: '',
  });

  const { data: rcmCases, isLoading } = useQuery({
    queryKey: ['admin-rcm'],
    queryFn: async () => {
      const { data } = await supabase.from('rcm_cases')
        .select('*, providers!rcm_cases_provider_id_fkey(name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: providers } = useQuery({
    queryKey: ['providers-for-rcm'],
    queryFn: async () => {
      const { data } = await supabase.from('providers').select('id, name').eq('status', 'Active');
      return data || [];
    },
  });

  const addCase = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('rcm_cases').insert({
        provider_id: form.provider_id,
        patient_name: form.patient_name,
        date_of_service: form.date_of_service,
        cpt_codes: form.cpt_codes.split(',').map(s => s.trim()).filter(Boolean),
        icd_codes: form.icd_codes.split(',').map(s => s.trim()).filter(Boolean),
        billed_amount: parseFloat(form.billed_amount) || 0,
        insurance_carrier: form.insurance_carrier || null,
        claim_number: form.claim_number || null,
        submission_status: form.submission_status,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rcm'] });
      setShowAdd(false);
      toast.success('RCM case added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from('rcm_cases').update({
        submission_status: 'Paid',
        paid_amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rcm'] });
      toast.success('Marked as paid');
    },
  });

  const submitAppeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rcm_cases').update({
        appeal_submitted: true,
        appeal_date: new Date().toISOString().split('T')[0],
        submission_status: 'Appealed',
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rcm'] });
      toast.success('Appeal submitted');
    },
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">RCM</h2><Skeleton className="h-96 rounded-xl" /></div>;

  const totalBilled = rcmCases?.reduce((s, c) => s + (c.billed_amount || 0), 0) || 0;
  const totalCollected = rcmCases?.reduce((s, c) => s + (c.paid_amount || 0), 0) || 0;
  const collectionRate = totalBilled > 0 ? Math.round(totalCollected / totalBilled * 100) : 0;
  const submitted = rcmCases?.filter(c => c.submission_status !== 'Not Submitted') || [];
  const arDays = submitted.length > 0 ? Math.round(submitted.reduce((s, c) => {
    const dos = new Date(c.date_of_service);
    const end = c.payment_date ? new Date(c.payment_date) : new Date();
    return s + Math.ceil((end.getTime() - dos.getTime()) / 86400000);
  }, 0) / submitted.length) : 0;

  const denials = rcmCases?.filter(c => c.submission_status === 'Denied' && !c.appeal_submitted) || [];

  const filtered = filter === 'All' ? rcmCases : rcmCases?.filter(c => c.submission_status === filter);

  // A/R Aging
  const arBuckets = { '0-30': [] as any[], '31-60': [] as any[], '61-90': [] as any[], '91-120': [] as any[], '120+': [] as any[] };
  rcmCases?.filter(c => c.submission_status !== 'Paid' && c.submission_status !== 'Not Submitted').forEach(c => {
    const dos = new Date(c.submission_date || c.date_of_service);
    const days = Math.ceil((new Date().getTime() - dos.getTime()) / 86400000);
    if (days <= 30) arBuckets['0-30'].push(c);
    else if (days <= 60) arBuckets['31-60'].push(c);
    else if (days <= 90) arBuckets['61-90'].push(c);
    else if (days <= 120) arBuckets['91-120'].push(c);
    else arBuckets['120+'].push(c);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2"><Landmark className="w-6 h-6 text-primary" /> Revenue Cycle Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Billing and claims management for network providers</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add RCM Case</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Billed', value: `$${totalBilled.toLocaleString()}`, color: 'text-blue-600' },
          { label: 'Total Collected', value: `$${totalCollected.toLocaleString()}`, color: 'text-emerald-600' },
          { label: 'Collection Rate', value: `${collectionRate}%`, color: 'text-violet-600' },
          { label: 'Avg A/R Days', value: arDays, color: 'text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <p className={`text-3xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="cases" className="text-xs">All Claims</TabsTrigger>
          <TabsTrigger value="denials" className="text-xs">Denials ({denials.length})</TabsTrigger>
          <TabsTrigger value="aging" className="text-xs">A/R Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['All', ...STATUS_OPTIONS].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>{s}</button>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">DOS</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">CPT</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Billed</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Paid</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered?.map(c => (
                  <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 text-xs">{(c as any).providers?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs">{c.patient_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.date_of_service}</td>
                    <td className="px-4 py-3 font-mono text-[10px]">{(c.cpt_codes as string[])?.join(', ')}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">${c.billed_amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${statusColors[c.submission_status] || ''}`}>{c.submission_status}</Badge></td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{c.paid_amount != null ? `$${c.paid_amount.toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="denials" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Denial Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Code</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Billed</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {denials.map(d => (
                  <tr key={d.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3 text-xs">{d.patient_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.denial_reason || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.denial_code || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">${d.billed_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => submitAppeal.mutate(d.id)}>Submit Appeal</Button>
                    </td>
                  </tr>
                ))}
                {denials.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No pending denials</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="aging" className="mt-4">
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(arBuckets).map(([bucket, items]) => (
              <div key={bucket} className={`bg-card border rounded-xl p-4 ${bucket === '120+' ? 'border-red-200' : 'border-border'}`}>
                <p className="text-xs text-muted-foreground">{bucket} days</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${bucket === '120+' ? 'text-red-600' : 'text-foreground'}`}>{items.length}</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">${items.reduce((s: number, c: any) => s + (c.billed_amount || 0), 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add RCM Case</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addCase.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Provider *</Label>
              <Select value={form.provider_id} onValueChange={v => setForm(p => ({ ...p, provider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{providers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Patient Name *</Label><Input value={form.patient_name} onChange={e => setForm(p => ({ ...p, patient_name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label className="text-xs">DOS *</Label><Input type="date" value={form.date_of_service} onChange={e => setForm(p => ({ ...p, date_of_service: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">CPT Codes (comma-separated)</Label><Input value={form.cpt_codes} onChange={e => setForm(p => ({ ...p, cpt_codes: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">ICD Codes (comma-separated)</Label><Input value={form.icd_codes} onChange={e => setForm(p => ({ ...p, icd_codes: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Billed Amount *</Label><Input type="number" step="0.01" value={form.billed_amount} onChange={e => setForm(p => ({ ...p, billed_amount: e.target.value }))} required /></div>
              <div className="space-y-2"><Label className="text-xs">Insurance Carrier</Label><Input value={form.insurance_carrier} onChange={e => setForm(p => ({ ...p, insurance_carrier: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addCase.isPending || !form.provider_id}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
