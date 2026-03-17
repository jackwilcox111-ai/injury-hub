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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Clock, FileText, DollarSign, Activity, Send, ShieldCheck, Brain, Heart, Bell, ListTodo } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { InsuranceEligibilityTab } from '@/components/cases/InsuranceEligibilityTab';
import { BillingChargesTab } from '@/components/cases/BillingChargesTab';
import { RecordsManagementTab } from '@/components/cases/RecordsManagementTab';
import { WorkPlanTab } from '@/components/cases/WorkPlanTab';
import { AIToolsTab } from '@/components/cases/AIToolsTab';
import { PatientEngagementTab } from '@/components/cases/PatientEngagementTab';
import { SoLAlertsTab } from '@/components/cases/SoLAlertsTab';
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
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;
  }

  const c = caseData;
  const solDays = c.sol_date ? Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="text-muted-foreground -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Cases
      </Button>

      {/* Case Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-mono text-primary font-medium">{c.case_number}</p>
            <h2 className="font-display text-2xl text-foreground mt-1">{c.patient_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{c.specialty || '—'} · {(c as any).attorneys?.firm_name || 'No attorney'} · {(c as any).providers?.name || 'No provider'}</p>
          </div>
          <div className="flex items-center gap-2">
            <FlagBadge flag={c.flag} />
            <StatusBadge status={c.status || ''} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={c.status || ''} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{caseStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Flag</Label>
            <Select value={c.flag || 'none'} onValueChange={v => updateCase.mutate({ flag: v === 'none' ? null : v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{flagOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Provider</Label>
            <Select value={c.provider_id || ''} onValueChange={v => updateCase.mutate({ provider_id: v || null })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Attorney</Label>
            <Select value={c.attorney_id || ''} onValueChange={v => updateCase.mutate({ attorney_id: v || null })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{allAttorneys?.map(a => <SelectItem key={a.id} value={a.id}>{a.firm_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Three-column panels */}
      <div className="grid grid-cols-3 gap-5">
        {/* SoL Panel */}
        <div className={`bg-card border rounded-xl p-5 shadow-card ${solDays != null && solDays < 180 ? 'border-red-200' : solDays != null && solDays < 365 ? 'border-amber-200' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Statute of Limitations</h3>
          </div>
          {c.sol_date ? (
            <>
              <p className={`text-4xl font-semibold tabular-nums ${solDays! > 365 ? 'text-emerald-600' : solDays! >= 180 ? 'text-amber-600' : 'text-red-600'}`}>{solDays}</p>
              <p className="text-xs text-muted-foreground mt-1">days remaining</p>
              <div className="mt-4 space-y-1 text-xs">
                <p className="font-mono text-foreground">{format(new Date(c.sol_date), 'MMMM d, yyyy')}</p>
                <p className="text-muted-foreground">{c.accident_state || '—'} — {c.sol_period_days} day period</p>
              </div>
              {solDays != null && solDays < 180 && (
                <div className="flex items-center gap-1.5 text-red-600 text-xs mt-4 bg-red-50 rounded-lg p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Under 180 days. Contact attorney immediately.</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Set accident date to calculate deadline</p>
          )}
        </div>

        {/* Treatment Progress */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Treatment</h3>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
              if (c.status === 'Settled') { toast.error('Cannot add appointments to a settled case.'); return; }
              setShowAddAppt(true);
            }}>+ Appointment</Button>
          </div>
          <ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} />
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-accent rounded-lg p-2.5">
              <p className="text-lg font-semibold text-foreground tabular-nums">{c.appointments_total || 0}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5">
              <p className="text-lg font-semibold text-emerald-600 tabular-nums">{c.appointments_completed || 0}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5">
              <p className="text-lg font-semibold text-amber-600 tabular-nums">{(c.appointments_total || 0) - (c.appointments_completed || 0)}</p>
              <p className="text-[10px] text-muted-foreground">Remaining</p>
            </div>
          </div>
        </div>

        {/* Financials (admin only) */}
        {isAdmin ? (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Financial Summary</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Lien Amount', value: c.lien_amount, color: 'text-emerald-600' },
                { label: 'Est. Settlement', value: c.settlement_estimate, color: 'text-blue-600' },
                { label: 'Final Settlement', value: c.settlement_final, color: 'text-violet-600' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`font-mono font-medium tabular-nums ${item.color}`}>
                    {item.value != null ? `$${item.value.toLocaleString()}` : '—'}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between items-center text-sm">
                <span className="text-foreground font-medium">Net to Client</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {c.settlement_estimate && c.lien_amount != null ? `$${(c.settlement_estimate - c.lien_amount).toLocaleString()}` : '—'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Records</h3>
              <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" onClick={() => setShowAddRecord(true)}>+ Record</Button>
            </div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{records?.length || 0}</p>
            <p className="text-xs text-muted-foreground">records on file</p>
          </div>
        )}
      </div>

      {/* Appointments Table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Appointments</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Notes</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {appointments?.map(a => (
              <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-5 py-3 font-mono text-xs">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy HH:mm') : '—'}</td>
                <td className="px-5 py-3 text-xs font-medium">{(a as any).providers?.name || '—'}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{a.specialty || '—'}</td>
                <td className="px-5 py-3">
                  <Select value={a.status} onValueChange={v => updateApptStatus.mutate({ apptId: a.id, status: v })}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Scheduled','Completed','No-Show','Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{a.notes || '—'}</td>
              </tr>
            ))}
            {(!appointments || appointments.length === 0) && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">No appointments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Records */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Records</h3>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddRecord(true)}>+ Record</Button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Received</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Delivered to Attorney</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">HIPAA</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {records?.map(r => (
              <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-5 py-3 text-xs font-medium">{r.record_type || '—'}</td>
                <td className="px-5 py-3 text-xs">{(r as any).providers?.name || '—'}</td>
                <td className="px-5 py-3 font-mono text-xs">{r.received_date || '—'}</td>
                <td className="px-5 py-3 font-mono text-xs">{r.delivered_to_attorney_date || '—'}</td>
                <td className="px-5 py-3 text-xs">{r.hipaa_auth_on_file ? <span className="text-emerald-600">✓ On file</span> : <span className="text-red-500">✗ Missing</span>}</td>
              </tr>
            ))}
            {(!records || records.length === 0) && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">No records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lien Register (admin only) */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Lien Register</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddLien(true)}>+ Lien</Button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Reduction</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Net Lien</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Payment</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {liens?.map(l => (
                <tr key={l.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-3 text-xs font-medium">{(l as any).providers?.name || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-emerald-600 tabular-nums">${l.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs text-amber-600 tabular-nums">${l.reduction_amount.toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs text-foreground font-medium tabular-nums">${(l.amount - l.reduction_amount).toLocaleString()}</td>
                  <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{l.payment_date || '—'}</td>
                </tr>
              ))}
              {(!liens || liens.length === 0) && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">No liens recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabbed Module Panels */}
      <Tabs defaultValue="activity" className="bg-card border border-border rounded-xl shadow-card">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent px-2 pt-2">
          <TabsTrigger value="activity" className="text-xs gap-1.5"><Send className="w-3.5 h-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Insurance</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Billing</TabsTrigger>
          <TabsTrigger value="records" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Records</TabsTrigger>
          <TabsTrigger value="workplan" className="text-xs gap-1.5"><ListTodo className="w-3.5 h-3.5" /> Work Plan</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs gap-1.5"><Heart className="w-3.5 h-3.5" /> Engagement</TabsTrigger>
          {isAdmin && <TabsTrigger value="ai" className="text-xs gap-1.5"><Brain className="w-3.5 h-3.5" /> AI Tools</TabsTrigger>}
          <TabsTrigger value="sol-alerts" className="text-xs gap-1.5"><Bell className="w-3.5 h-3.5" /> SoL Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="p-5">
          {/* Activity Feed */}
          <h3 className="text-sm font-semibold text-foreground mb-4">Activity</h3>
          <div className="flex gap-2 mb-5">
            <Input value={updateMsg} onChange={e => setUpdateMsg(e.target.value)} placeholder="Add a note or update..." className="h-10"
              onKeyDown={e => { if (e.key === 'Enter' && updateMsg) addUpdate.mutate(updateMsg); }} />
            <Button size="sm" className="h-10 px-4" onClick={() => updateMsg && addUpdate.mutate(updateMsg)} disabled={!updateMsg || addUpdate.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-4 max-h-72 overflow-y-auto">
            {updates?.map(u => (
              <div key={u.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0 mt-0.5">
                  {((u as any).profiles?.full_name || 'S').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{(u as any).profiles?.full_name || 'System'}</span>
                    <span className="text-xs text-muted-foreground">{u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : ''}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{u.message}</p>
                </div>
              </div>
            ))}
            {(!updates || updates.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>}
          </div>
        </TabsContent>

        <TabsContent value="insurance" className="p-5">
          <InsuranceEligibilityTab caseId={id!} />
        </TabsContent>

        <TabsContent value="billing" className="p-5">
          <BillingChargesTab caseId={id!} providers={allProviders || []} />
        </TabsContent>

        <TabsContent value="records" className="p-5">
          <RecordsManagementTab caseId={id!} specialty={c.specialty} providers={allProviders || []} />
        </TabsContent>

        <TabsContent value="workplan" className="p-5">
          <WorkPlanTab caseId={id!} caseStatus={c.status || ''} />
        </TabsContent>

        <TabsContent value="engagement" className="p-5">
          <PatientEngagementTab caseId={id!} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="ai" className="p-5">
            <AIToolsTab caseId={id!} caseData={c} records={records || []} appointments={appointments || []} liens={liens || []} />
          </TabsContent>
        )}

        <TabsContent value="sol-alerts" className="p-5">
          <SoLAlertsTab caseId={id!} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showAddAppt} onOpenChange={setShowAddAppt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Appointment</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addAppointment.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Provider</Label>
              <Select value={newAppt.provider_id} onValueChange={v => setNewAppt(p => ({...p, provider_id: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Date & Time</Label><Input type="datetime-local" value={newAppt.scheduled_date} onChange={e => setNewAppt(p => ({...p, scheduled_date: e.target.value}))} className="h-10" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Specialty</Label><Input value={newAppt.specialty} onChange={e => setNewAppt(p => ({...p, specialty: e.target.value}))} className="h-10" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Notes</Label><Textarea value={newAppt.notes} onChange={e => setNewAppt(p => ({...p, notes: e.target.value}))} /></div>
            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAddAppt(false)}>Cancel</Button><Button type="submit" disabled={addAppointment.isPending}>Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Record</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addRecord.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Record Type</Label>
              <Select value={newRecord.record_type} onValueChange={v => setNewRecord(p => ({...p, record_type: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{['Treatment Notes','Billing','Imaging','Surgical Report','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Provider</Label>
              <Select value={newRecord.provider_id} onValueChange={v => setNewRecord(p => ({...p, provider_id: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Received</Label><Input type="date" value={newRecord.received_date} onChange={e => setNewRecord(p => ({...p, received_date: e.target.value}))} className="h-10" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Delivered to Atty</Label><Input type="date" value={newRecord.delivered_to_attorney_date} onChange={e => setNewRecord(p => ({...p, delivered_to_attorney_date: e.target.value}))} className="h-10" /></div>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAddRecord(false)}>Cancel</Button><Button type="submit" disabled={addRecord.isPending}>Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <Dialog open={showAddLien} onOpenChange={setShowAddLien}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Lien</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); addLienMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Provider</Label>
                <Select value={newLien.provider_id} onValueChange={v => setNewLien(p => ({...p, provider_id: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">Amount</Label><Input type="number" value={newLien.amount} onChange={e => setNewLien(p => ({...p, amount: Number(e.target.value)}))} className="h-10" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium">Reduction</Label><Input type="number" value={newLien.reduction_amount} onChange={e => setNewLien(p => ({...p, reduction_amount: Number(e.target.value)}))} className="h-10" /></div>
              </div>
              <div className="space-y-2"><Label className="text-sm font-medium">Status</Label>
                <Select value={newLien.status} onValueChange={v => setNewLien(p => ({...p, status: v}))}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{['Active','Reduced','Paid','Waived'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAddLien(false)}>Cancel</Button><Button type="submit" disabled={addLienMutation.isPending}>Add</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
