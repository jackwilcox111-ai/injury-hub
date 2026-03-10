import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { ProgressBar } from '@/components/global/ProgressBar';
import { FlagBadge } from '@/components/global/FlagBadge';
import { FinancialValue } from '@/components/global/FinancialValue';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const caseStatuses = ['Intake', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];
const flagOptions = [{ value: 'none', label: 'None' }, { value: 'noshow', label: 'No-Show Risk' }, { value: 'records', label: 'Records Due' }, { value: 'urgent', label: 'Urgent' }];

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddLien, setShowAddLien] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [newAppt, setNewAppt] = useState({ provider_id: '', scheduled_date: '', specialty: '', notes: '' });
  const [newRecord, setNewRecord] = useState({ record_type: '', provider_id: '', received_date: '', delivered_to_attorney_date: '', hipaa_auth_on_file: false, notes: '' });
  const [newLien, setNewLien] = useState({ provider_id: '', amount: 0, status: 'Active', reduction_amount: 0, payment_date: '', notes: '' });

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case-detail', id],
    queryFn: async () => {
      const { data } = await supabase.from('cases_with_counts')
        .select('*, attorneys!cases_attorney_id_fkey(id, firm_name), providers!cases_provider_id_fkey(id, name)')
        .eq('id', id!).single();
      return data;
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ['case-appointments', id],
    queryFn: async () => {
      const { data } = await supabase.from('appointments').select('*, providers(name)')
        .eq('case_id', id!).order('scheduled_date', { ascending: false });
      return data || [];
    },
  });

  const { data: records } = useQuery({
    queryKey: ['case-records', id],
    queryFn: async () => {
      const { data } = await supabase.from('records').select('*, providers(name)')
        .eq('case_id', id!).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: liens } = useQuery({
    queryKey: ['case-liens', id],
    queryFn: async () => {
      const { data } = await supabase.from('liens').select('*, providers(name)')
        .eq('case_id', id!).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: updates } = useQuery({
    queryKey: ['case-updates', id],
    queryFn: async () => {
      const { data } = await supabase.from('case_updates').select('*, profiles(full_name)')
        .eq('case_id', id!).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: allProviders } = useQuery({
    queryKey: ['providers-active'],
    queryFn: async () => {
      const { data } = await supabase.from('providers').select('id, name').eq('status', 'Active');
      return data || [];
    },
  });

  const { data: allAttorneys } = useQuery({
    queryKey: ['attorneys-active'],
    queryFn: async () => {
      const { data } = await supabase.from('attorneys').select('id, firm_name').eq('status', 'Active');
      return data || [];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['case-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['case-appointments', id] });
    queryClient.invalidateQueries({ queryKey: ['case-records', id] });
    queryClient.invalidateQueries({ queryKey: ['case-liens', id] });
    queryClient.invalidateQueries({ queryKey: ['case-updates', id] });
  };

  const updateCase = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from('cases').update(updates).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Case updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addUpdate = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from('case_updates').insert({ case_id: id!, author_id: user?.id, message });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setUpdateMsg(''); },
    onError: (e: any) => toast.error(e.message),
  });

  const addAppointment = useMutation({
    mutationFn: async () => {
      if (caseData?.status === 'Settled') throw new Error('Cannot add appointments to a settled case.');
      const { error } = await supabase.from('appointments').insert({
        case_id: id!, provider_id: newAppt.provider_id || null,
        scheduled_date: newAppt.scheduled_date || null, specialty: newAppt.specialty || null, notes: newAppt.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setShowAddAppt(false); setNewAppt({ provider_id: '', scheduled_date: '', specialty: '', notes: '' }); toast.success('Appointment added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateApptStatus = useMutation({
    mutationFn: async ({ apptId, status }: { apptId: string; status: string }) => {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', apptId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (e: any) => toast.error(e.message),
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('records').insert({
        case_id: id!, provider_id: newRecord.provider_id || null,
        record_type: newRecord.record_type || null, received_date: newRecord.received_date || null,
        delivered_to_attorney_date: newRecord.delivered_to_attorney_date || null,
        hipaa_auth_on_file: newRecord.hipaa_auth_on_file, notes: newRecord.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setShowAddRecord(false); toast.success('Record added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addLienMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('liens').insert({
        case_id: id!, provider_id: newLien.provider_id || null,
        amount: newLien.amount, status: newLien.status,
        reduction_amount: newLien.reduction_amount, payment_date: newLien.payment_date || null, notes: newLien.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setShowAddLien(false); toast.success('Lien added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleStatusChange = async (newStatus: string) => {
    const currentIdx = caseStatuses.indexOf(caseData?.status || '');
    const newIdx = caseStatuses.indexOf(newStatus);
    if (newIdx < currentIdx) {
      if (!confirm(`Moving this case back to ${newStatus}. Are you sure?`)) return;
    }
    if (newStatus === 'Settled' && !caseData?.settlement_final) {
      if (!confirm('No final settlement amount entered. Continue anyway?')) return;
    }
    await updateCase.mutateAsync({ status: newStatus });
    await addUpdate.mutateAsync(`Status changed to ${newStatus} by ${profile?.full_name}`);
  };

  if (isLoading || !caseData) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;
  }

  const c = caseData;
  const solDays = c.sol_date ? Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
      </Button>

      {/* Panel 1: Header */}
      <div className="bg-card border border-border rounded p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-mono text-primary">{c.case_number}</p>
            <h2 className="font-display text-xl text-foreground mt-1">{c.patient_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{c.specialty || '—'} · {(c as any).attorneys?.firm_name || 'No attorney'} · {(c as any).providers?.name || 'No provider'}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status || ''} />
            <FlagBadge flag={c.flag} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-mono text-muted-foreground">Status</Label>
            <Select value={c.status || ''} onValueChange={handleStatusChange}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {caseStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono text-muted-foreground">Flag</Label>
            <Select value={c.flag || 'none'} onValueChange={v => updateCase.mutate({ flag: v === 'none' ? null : v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {flagOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono text-muted-foreground">Provider</Label>
            <Select value={c.provider_id || ''} onValueChange={v => updateCase.mutate({ provider_id: v || null })}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono text-muted-foreground">Attorney</Label>
            <Select value={c.attorney_id || ''} onValueChange={v => updateCase.mutate({ attorney_id: v || null })}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {allAttorneys?.map(a => <SelectItem key={a.id} value={a.id}>{a.firm_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Panel 2: Financials (admin only) */}
        {isAdmin && (
          <div className="bg-card border border-border rounded p-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground">Lien & Financial</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-mono">Lien Amount</span>
                <FinancialValue value={c.lien_amount} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-mono">Est. Settlement</span>
                <FinancialValue value={c.settlement_estimate} colorClass="text-primary" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-mono">Final Settlement</span>
                <FinancialValue value={c.settlement_final} colorClass="text-settled" />
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-xs">
                <span className="text-muted-foreground font-mono">Net to Client</span>
                <FinancialValue value={c.settlement_estimate && c.lien_amount != null ? c.settlement_estimate - c.lien_amount : null} colorClass="text-warning" />
              </div>
            </div>
          </div>
        )}

        {/* Panel 3: SoL */}
        <div className="bg-card border border-border rounded p-6 space-y-3" style={solDays != null && solDays < 180 ? { borderLeftColor: 'hsl(var(--destructive))', borderLeftWidth: '2px' } : solDays != null && solDays < 365 ? { borderLeftColor: 'hsl(var(--warning))', borderLeftWidth: '2px' } : {}}>
          <h3 className="text-sm font-medium text-foreground">Statute of Limitations</h3>
          {c.sol_date ? (
            <>
              <p className={`text-5xl font-mono font-medium ${solDays! > 365 ? 'text-success' : solDays! >= 180 ? 'text-warning' : 'text-destructive'}`}>
                {solDays}
              </p>
              <p className="text-xs text-muted-foreground">days remaining</p>
              <p className="text-xs font-mono text-foreground">{format(new Date(c.sol_date), 'MMM d, yyyy')}</p>
              <p className="text-xs text-muted-foreground">{c.accident_state || '—'} — {c.sol_period_days} days</p>
              {solDays != null && solDays < 180 && (
                <div className="flex items-center gap-1 text-destructive text-xs mt-2">
                  <AlertTriangle className="w-3 h-3" /> SoL deadline in under 180 days. Contact attorney immediately.
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Set accident date and SoL period to calculate deadline</p>
          )}
        </div>

        {/* Panel 4: Treatment Progress */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Treatment Progress</h3>
            <Button size="sm" variant="outline" onClick={() => {
              if (c.status === 'Settled') { toast.error('Cannot add appointments to a settled case.'); return; }
              setShowAddAppt(true);
            }}>+ Appt</Button>
          </div>
          <ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded p-2">
              <p className="font-mono text-lg text-foreground">{c.appointments_total || 0}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-background rounded p-2">
              <p className="font-mono text-lg text-success">{c.appointments_completed || 0}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </div>
            <div className="bg-background rounded p-2">
              <p className="font-mono text-lg text-warning">{(c.appointments_total || 0) - (c.appointments_completed || 0)}</p>
              <p className="text-[10px] text-muted-foreground">Remaining</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 5: Appointments Table */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-medium text-foreground">Appointments</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Date</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Provider</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Specialty</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Notes</th>
          </tr></thead>
          <tbody>
            {appointments?.map((a, i) => (
              <tr key={a.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}>
                <td className="px-4 py-2 font-mono text-xs">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy HH:mm') : '—'}</td>
                <td className="px-4 py-2 text-xs">{(a as any).providers?.name || '—'}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{a.specialty || '—'}</td>
                <td className="px-4 py-2">
                  <Select value={a.status} onValueChange={v => updateApptStatus.mutate({ apptId: a.id, status: v })}>
                    <SelectTrigger className="h-7 text-xs bg-background border-border w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Scheduled','Completed','No-Show','Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{a.notes || '—'}</td>
              </tr>
            ))}
            {(!appointments || appointments.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No appointments</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panel 6: Records */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Records</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddRecord(true)}>+ Record</Button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Type</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Provider</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Received</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Delivered to Atty</th>
            <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">HIPAA Auth</th>
          </tr></thead>
          <tbody>
            {records?.map((r, i) => (
              <tr key={r.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}>
                <td className="px-4 py-2 text-xs">{r.record_type || '—'}</td>
                <td className="px-4 py-2 text-xs">{(r as any).providers?.name || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.received_date || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.delivered_to_attorney_date || '—'}</td>
                <td className="px-4 py-2 text-xs">{r.hipaa_auth_on_file ? '✅' : '❌'}</td>
              </tr>
            ))}
            {(!records || records.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panel 7: Lien Register (admin only) */}
      {isAdmin && (
        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Lien Register</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddLien(true)}>+ Lien</Button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Reduction</th>
              <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Net</th>
              <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Payment</th>
            </tr></thead>
            <tbody>
              {liens?.map((l, i) => (
                <tr key={l.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}>
                  <td className="px-4 py-2 text-xs">{(l as any).providers?.name || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-success">${l.amount.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs text-warning">${l.reduction_amount.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs text-primary">${(l.amount - l.reduction_amount).toLocaleString()}</td>
                  <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-2 font-mono text-xs">{l.payment_date || '—'}</td>
                </tr>
              ))}
              {(!liens || liens.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">No liens recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Panel 8: Activity Feed */}
      <div className="bg-card border border-border rounded p-6 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Activity Feed</h3>
        <div className="flex gap-2">
          <Input value={updateMsg} onChange={e => setUpdateMsg(e.target.value)} placeholder="Add update..." className="bg-background border-border" />
          <Button size="sm" onClick={() => updateMsg && addUpdate.mutate(updateMsg)} disabled={!updateMsg || addUpdate.isPending}>Submit</Button>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {updates?.map(u => (
            <div key={u.id} className="border-l-2 border-border pl-3 py-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-foreground font-medium">{(u as any).profiles?.full_name || 'System'}</span>
                <span className="text-muted-foreground font-mono">{u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : ''}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{u.message}</p>
            </div>
          ))}
          {(!updates || updates.length === 0) && <p className="text-xs text-muted-foreground">No activity yet</p>}
        </div>
      </div>

      {/* Add Appointment Modal */}
      <Dialog open={showAddAppt} onOpenChange={setShowAddAppt}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display">Add Appointment</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addAppointment.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Provider</Label>
              <Select value={newAppt.provider_id} onValueChange={v => setNewAppt(p => ({...p, provider_id: v}))}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Date & Time</Label>
              <Input type="datetime-local" value={newAppt.scheduled_date} onChange={e => setNewAppt(p => ({...p, scheduled_date: e.target.value}))} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Specialty</Label>
              <Input value={newAppt.specialty} onChange={e => setNewAppt(p => ({...p, specialty: e.target.value}))} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Notes</Label>
              <Textarea value={newAppt.notes} onChange={e => setNewAppt(p => ({...p, notes: e.target.value}))} className="bg-background border-border" />
            </div>
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddAppt(false)}>Cancel</Button>
              <Button type="submit" disabled={addAppointment.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Record Modal */}
      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display">Add Record</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addRecord.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Record Type</Label>
              <Select value={newRecord.record_type} onValueChange={v => setNewRecord(p => ({...p, record_type: v}))}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {['Treatment Notes','Billing','Imaging','Surgical Report','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Provider</Label>
              <Select value={newRecord.provider_id} onValueChange={v => setNewRecord(p => ({...p, provider_id: v}))}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Received Date</Label>
                <Input type="date" value={newRecord.received_date} onChange={e => setNewRecord(p => ({...p, received_date: e.target.value}))} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Delivered to Attorney</Label>
                <Input type="date" value={newRecord.delivered_to_attorney_date} onChange={e => setNewRecord(p => ({...p, delivered_to_attorney_date: e.target.value}))} className="bg-background border-border" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddRecord(false)}>Cancel</Button>
              <Button type="submit" disabled={addRecord.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Lien Modal */}
      {isAdmin && (
        <Dialog open={showAddLien} onOpenChange={setShowAddLien}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">Add Lien</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); addLienMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Provider</Label>
                <Select value={newLien.provider_id} onValueChange={v => setNewLien(p => ({...p, provider_id: v}))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Amount</Label>
                  <Input type="number" value={newLien.amount} onChange={e => setNewLien(p => ({...p, amount: Number(e.target.value)}))} className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Reduction</Label>
                  <Input type="number" value={newLien.reduction_amount} onChange={e => setNewLien(p => ({...p, reduction_amount: Number(e.target.value)}))} className="bg-background border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Status</Label>
                <Select value={newLien.status} onValueChange={v => setNewLien(p => ({...p, status: v}))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Active','Reduced','Paid','Waived'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddLien(false)}>Cancel</Button>
                <Button type="submit" disabled={addLienMutation.isPending}>Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
