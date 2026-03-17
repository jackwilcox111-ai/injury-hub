import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar, FileText, DollarSign, Plus, Upload } from 'lucide-react';

const CPT_CHIPS = [
  { code: '99213', desc: 'Office visit (est.)' },
  { code: '99203', desc: 'Office visit (new)' },
  { code: '97110', desc: 'Therapeutic exercises' },
  { code: '97140', desc: 'Manual therapy' },
  { code: '98941', desc: 'Chiropractic manipulation' },
  { code: '72148', desc: 'MRI lumbar' },
];

export default function ProviderPortal() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [charge, setCharge] = useState({ cpt_code: '', cpt_description: '', service_date: '', charge_amount: '', units: '1' });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['provider-portal-appointments'],
    queryFn: async () => {
      const { data } = await supabase.from('appointments')
        .select('*, cases!appointments_case_id_fkey(id, case_number, patient_name, status)')
        .order('scheduled_date', { ascending: false });
      return data || [];
    },
  });

  const { data: charges } = useQuery({
    queryKey: ['provider-charges'],
    queryFn: async () => {
      const { data } = await supabase.from('charges')
        .select('*, cases!charges_case_id_fkey(case_number, patient_name)')
        .order('service_date', { ascending: false });
      return data || [];
    },
  });

  const { data: records } = useQuery({
    queryKey: ['provider-records'],
    queryFn: async () => {
      const { data } = await supabase.from('records')
        .select('*, cases!records_case_id_fkey(case_number, patient_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const updateAppt = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-portal-appointments'] });
      toast.success('Appointment updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addCharge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('charges').insert({
        case_id: selectedCaseId,
        provider_id: profile?.provider_id || null,
        cpt_code: charge.cpt_code,
        cpt_description: charge.cpt_description || null,
        service_date: charge.service_date,
        charge_amount: parseFloat(charge.charge_amount) || 0,
        units: parseInt(charge.units) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-charges'] });
      setShowAddCharge(false);
      setCharge({ cpt_code: '', cpt_description: '', service_date: '', charge_amount: '', units: '1' });
      toast.success('Charge submitted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const caseMap = new Map<string, any>();
  appointments?.forEach(a => {
    const c = (a as any).cases;
    if (c?.id) caseMap.set(c.id, c);
  });
  const uniqueCases = [...caseMap.values()];

  const totalCharges = charges?.reduce((sum, c) => sum + (c.charge_amount || 0), 0) || 0;
  const totalPaid = charges?.reduce((sum, c) => sum + (c.paid_amount || 0), 0) || 0;

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-xl">Provider Portal</h2><Skeleton className="h-96 rounded" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Provider Portal</h2>
      <p className="text-sm text-muted-foreground">Manage your appointments, submit charges, and track records.</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{appointments?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{charges?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Charges</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 tabular-nums">${totalCharges.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Billed</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 tabular-nums">${totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Collected</p>
        </div>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Appointments</TabsTrigger>
          <TabsTrigger value="charges" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Charges</TabsTrigger>
          <TabsTrigger value="records" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Records</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {appointments?.map(a => (
                  <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{(a as any).cases?.case_number}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{(a as any).cases?.patient_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 flex gap-1">
                      {a.status === 'Scheduled' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-600"
                            onClick={() => updateAppt.mutate({ id: a.id, status: 'Completed' })}>Complete</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500"
                            onClick={() => updateAppt.mutate({ id: a.id, status: 'No-Show' })}>No-Show</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {(!appointments || appointments.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No appointments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="charges" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddCharge(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Submit Charge</Button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">CPT</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {charges?.map(c => (
                  <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{(c as any).cases?.case_number}</td>
                    <td className="px-4 py-3 text-xs"><span className="font-mono">{c.cpt_code}</span> {c.cpt_description && <span className="text-muted-foreground ml-1">— {c.cpt_description}</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.service_date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-right">${c.charge_amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant={c.status === 'Paid' ? 'default' : 'outline'} className="text-[10px]">{c.status}</Badge></td>
                  </tr>
                ))}
                {(!charges || charges.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No charges submitted</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="records" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Received</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Delivered to Atty</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {records?.map(r => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{(r as any).cases?.case_number}</td>
                    <td className="px-4 py-3 text-xs">{r.record_type || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.received_date || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.delivered_to_attorney_date || '—'}</td>
                  </tr>
                ))}
                {(!records || records.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Charge Dialog */}
      <Dialog open={showAddCharge} onOpenChange={setShowAddCharge}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Charge</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addCharge.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Case *</Label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger><SelectValue placeholder="Select case..." /></SelectTrigger>
                <SelectContent>{uniqueCases.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.case_number} — {c.patient_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quick CPT Select</Label>
              <div className="flex flex-wrap gap-1.5">
                {CPT_CHIPS.map(c => (
                  <button key={c.code} type="button"
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      charge.cpt_code === c.code ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => setCharge(p => ({ ...p, cpt_code: c.code, cpt_description: c.desc }))}>
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CPT Code *</Label><Input value={charge.cpt_code} onChange={e => setCharge(p => ({ ...p, cpt_code: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={charge.cpt_description} onChange={e => setCharge(p => ({ ...p, cpt_description: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Service Date *</Label><Input type="date" value={charge.service_date} onChange={e => setCharge(p => ({ ...p, service_date: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Amount *</Label><Input type="number" step="0.01" value={charge.charge_amount} onChange={e => setCharge(p => ({ ...p, charge_amount: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Units</Label><Input type="number" min={1} value={charge.units} onChange={e => setCharge(p => ({ ...p, units: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddCharge(false)}>Cancel</Button>
              <Button type="submit" disabled={addCharge.isPending || !selectedCaseId}>Submit</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
