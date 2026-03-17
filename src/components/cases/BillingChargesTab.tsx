import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, Plus } from 'lucide-react';

const COMMON_CPT = [
  { code: '99213', desc: 'Office Visit — Established (Moderate)' },
  { code: '99214', desc: 'Office Visit — Established (High)' },
  { code: '99203', desc: 'Office Visit — New (Moderate)' },
  { code: '97140', desc: 'Manual Therapy' },
  { code: '97110', desc: 'Therapeutic Exercise' },
  { code: '97112', desc: 'Neuromuscular Re-education' },
  { code: '72148', desc: 'MRI Lumbar Spine w/o Contrast' },
  { code: '72141', desc: 'MRI Cervical Spine w/o Contrast' },
  { code: '20610', desc: 'Injection — Major Joint' },
  { code: '64483', desc: 'Epidural Steroid Injection — Lumbar' },
  { code: '27447', desc: 'Total Knee Replacement' },
  { code: '98940', desc: 'Chiropractic Manipulation — Spinal (1-2 regions)' },
  { code: '98941', desc: 'Chiropractic Manipulation — Spinal (3-4 regions)' },
];

const BILLING_PATHS = ['Lien', 'PIP', 'MedPay', 'Insurance'];
const STATUSES = ['Pending', 'Submitted', 'Paid', 'Denied', 'Adjusted'];

export function BillingChargesTab({ caseId, providers }: { caseId: string; providers: { id: string; name: string }[] }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const isAdminOrCM = profile?.role === 'admin' || profile?.role === 'care_manager';

  const { data: charges, isLoading } = useQuery({
    queryKey: ['charges', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('charges')
        .select('*, providers(name)')
        .eq('case_id', caseId)
        .order('service_date', { ascending: false });
      return data || [];
    },
  });

  const [form, setForm] = useState({
    provider_id: '', service_date: '', cpt_code: '', cpt_description: '',
    units: '1', charge_amount: '', billing_path: 'Lien', notes: '',
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('charges').insert({
        case_id: caseId,
        provider_id: form.provider_id || null,
        service_date: form.service_date,
        cpt_code: form.cpt_code,
        cpt_description: form.cpt_description || null,
        units: Number(form.units) || 1,
        charge_amount: Number(form.charge_amount) || 0,
        billing_path: form.billing_path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges', caseId] });
      setShowAdd(false);
      setForm({ provider_id: '', service_date: '', cpt_code: '', cpt_description: '', units: '1', charge_amount: '', billing_path: 'Lien', notes: '' });
      toast.success('Charge added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('charges').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charges', caseId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const totalCharges = charges?.reduce((s, c: any) => s + Number(c.charge_amount || 0), 0) || 0;
  const totalPaid = charges?.reduce((s, c: any) => s + Number(c.paid_amount || 0), 0) || 0;
  const totalAR = totalCharges - totalPaid;

  // Per-provider summary
  const providerSummary = charges?.reduce((acc: any, c: any) => {
    const name = c.providers?.name || 'Unknown';
    if (!acc[name]) acc[name] = { charges: 0, paid: 0, count: 0 };
    acc[name].charges += Number(c.charge_amount || 0);
    acc[name].paid += Number(c.paid_amount || 0);
    acc[name].count++;
    return acc;
  }, {}) || {};

  const selectCpt = (code: string) => {
    const match = COMMON_CPT.find(c => c.code === code);
    setForm(f => ({ ...f, cpt_code: code, cpt_description: match?.desc || '' }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Billing & Charges</h3>
        </div>
        {isAdminOrCM && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Charge
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold font-mono-data text-foreground tabular-nums">${totalCharges.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Charges</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold font-mono-data text-emerald-600 tabular-nums">${totalPaid.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Paid</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold font-mono-data text-amber-600 tabular-nums">${totalAR.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Outstanding A/R</p>
        </div>
      </div>

      {/* Provider A/R Summary */}
      {Object.keys(providerSummary).length > 0 && (
        <div className="bg-accent/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">Provider A/R Summary</p>
          <div className="space-y-1">
            {Object.entries(providerSummary).map(([name, s]: any) => (
              <div key={name} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{name} ({s.count} charges)</span>
                <span className="font-mono-data text-foreground">${(s.charges - s.paid).toLocaleString()} A/R</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charges Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : !charges?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">No charges recorded</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">CPT</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Path</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {charges.map((c: any) => (
                <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono-data text-xs">{c.service_date}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium text-foreground">{c.cpt_code}</span>
                    {c.cpt_description && <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{c.cpt_description}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{c.providers?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.billing_path}</td>
                  <td className="px-4 py-2.5 text-right font-mono-data text-xs tabular-nums">${Number(c.charge_amount).toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    {isAdminOrCM ? (
                      <Select value={c.status} onValueChange={v => updateStatus.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={c.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Charge Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Charge</DialogTitle></DialogHeader>
          <form onSubmit={ev => { ev.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            {/* CPT Quick-Select Chips */}
            <div className="space-y-2">
              <Label>Quick-Select CPT</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_CPT.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCpt(c.code)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                      form.cpt_code === c.code ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CPT Code *</Label><Input value={form.cpt_code} onChange={e => setForm(f => ({ ...f, cpt_code: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Service Date *</Label><Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} required /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.cpt_description} onChange={e => setForm(f => ({ ...f, cpt_description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Amount ($) *</Label><Input type="number" value={form.charge_amount} onChange={e => setForm(f => ({ ...f, charge_amount: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Units</Label><Input type="number" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Billing Path</Label>
                <Select value={form.billing_path} onValueChange={v => setForm(f => ({ ...f, billing_path: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BILLING_PATHS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={form.provider_id} onValueChange={v => setForm(f => ({ ...f, provider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending || !form.cpt_code || !form.service_date}>Add Charge</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
