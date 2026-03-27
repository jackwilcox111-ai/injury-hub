import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { logPHIAccess } from '@/lib/audit-logger';
import { PHIBanner } from '@/components/global/PHIBanner';

import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { ProgressBar } from '@/components/global/ProgressBar';
import { FlagBadge } from '@/components/global/FlagBadge';
import { FinancialValue } from '@/components/global/FinancialValue';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Clock, FileText, DollarSign, Activity, Send, ShieldCheck, Heart, Bell, ListTodo, FileSignature, GitBranch, Radar, Shield, Languages, Info, Phone, MessageCircle, FolderOpen, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, formatDistanceToNow } from 'date-fns';
import { InsuranceEligibilityTab } from '@/components/cases/InsuranceEligibilityTab';
import { BillingChargesTab } from '@/components/cases/BillingChargesTab';
import { RecordsManagementTab } from '@/components/cases/RecordsManagementTab';
import { WorkPlanTab } from '@/components/cases/WorkPlanTab';

import { PatientEngagementTab } from '@/components/cases/PatientEngagementTab';
import { SoLAlertsTab } from '@/components/cases/SoLAlertsTab';
import { PolicyDetailsTab } from '@/components/cases/PolicyDetailsTab';
import { TimelineTab } from '@/components/cases/TimelineTab';
import { ColossusTab } from '@/components/cases/ColossusTab';
import { DemandLettersTab } from '@/components/cases/DemandLettersTab';
import { CaseMessagesTab } from '@/components/cases/CaseMessagesTab';
import { SendReferralDialog } from '@/components/cases/SendReferralDialog';

function RecordsBillsDump({ caseId }: { caseId: string }) {
  const { data: docs, isLoading } = useQuery({
    queryKey: ['case-docs-dump', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('documents')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 60);
    if (error) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">All Documents</h3>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border bg-accent/50">
          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">File</th>
          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Uploaded</th>
          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-border">
          {docs?.map(d => (
            <tr key={d.id} className="hover:bg-accent/30 transition-colors">
              <td className="px-4 py-2.5 text-xs flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-muted-foreground" />{d.file_name}</td>
              <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">{d.document_type}</Badge></td>
              <td className="px-4 py-2.5 font-mono text-xs">{d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : '—'}</td>
              <td className="px-4 py-2.5"><Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleDownload(d.storage_path)}><Download className="w-3 h-3 mr-1" /> Download</Button></td>
            </tr>
          ))}
          {(!docs || docs.length === 0) && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No documents</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const caseStatuses = ['Intake', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];
const flagOptions = [{ value: 'none', label: 'None' }, { value: 'noshow', label: 'No-Show Risk' }, { value: 'records', label: 'Records Due' }, { value: 'urgent', label: 'Urgent' }];

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [showAddLien, setShowAddLien] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [estimateValue, setEstimateValue] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const [newAppt, setNewAppt] = useState({ provider_id: '', scheduled_date: '', specialty: '', notes: '', interpreter_confirmed: false });
  const [newRecord, setNewRecord] = useState({ record_type: '', provider_id: '', received_date: '', delivered_to_attorney_date: '', hipaa_auth_on_file: false, notes: '' });
  const [recordFile, setRecordFile] = useState<File | null>(null);
  const [editRecordFile, setEditRecordFile] = useState<File | null>(null);
  const [newLien, setNewLien] = useState({ provider_id: '', amount: 0, status: 'Active', reduction_amount: 0, payment_date: '', notes: '' });

  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-for-case', id],
    queryFn: async () => {
      const { data } = await supabase.from('patient_profiles').select('needs_interpreter, city, state').eq('case_id', id!).maybeSingle();
      return data;
    },
  });
  const needsInterpreter = patientProfile?.needs_interpreter || false;

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case-detail', id],
    queryFn: async () => {
      const { data } = await supabase.from('cases_with_counts')
        .select('*, attorneys!cases_attorney_id_fkey(id, firm_name), providers!cases_provider_id_fkey(id, name)')
        .eq('id', id!).single();
      return data;
    },
  });

  // HIPAA audit log: track PHI access
  useEffect(() => {
    if (id && caseData) {
      logPHIAccess({ action: 'view', resource_type: 'case', resource_id: id, metadata: { case_number: caseData.case_number } });
    }
  }, [id, caseData?.case_number]);

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
      const { data } = await supabase.from('records').select('*, providers(name), documents(id, file_name, storage_path)')
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
      if (needsInterpreter && !newAppt.interpreter_confirmed) throw new Error('Please confirm interpreter availability before booking.');
      const { error } = await supabase.from('appointments').insert({
        case_id: id!, provider_id: newAppt.provider_id || null,
        scheduled_date: newAppt.scheduled_date || null, specialty: newAppt.specialty || null, notes: newAppt.notes || null,
        interpreter_confirmed: newAppt.interpreter_confirmed,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setShowAddAppt(false); setNewAppt({ provider_id: '', scheduled_date: '', specialty: '', notes: '', interpreter_confirmed: false }); toast.success('Appointment added'); },
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
      const { data: recordData, error } = await supabase.from('records').insert({
        case_id: id!, provider_id: newRecord.provider_id || null,
        record_type: newRecord.record_type || null, received_date: newRecord.received_date || null,
        delivered_to_attorney_date: newRecord.delivered_to_attorney_date || null,
        hipaa_auth_on_file: newRecord.hipaa_auth_on_file, notes: newRecord.notes || null,
      }).select('id').single();
      if (error) throw error;

      if (recordFile) {
        const path = `${id}/${Date.now()}-${recordFile.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, recordFile);
        if (uploadError) throw uploadError;
        const { error: docError } = await supabase.from('documents').insert({
          case_id: id!,
          file_name: recordFile.name,
          storage_path: path,
          document_type: 'Medical Record',
          uploader_id: profile?.id,
          visible_to: ['admin', 'care_manager', 'attorney'],
        });
        if (docError) throw docError;
      }
    },
    onSuccess: () => { invalidateAll(); setShowAddRecord(false); setRecordFile(null); toast.success('Record added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRecord = useMutation({
    mutationFn: async (rec: any) => {
      let documentId = rec.document_id || null;

      // Upload new file if provided
      if (editRecordFile) {
        const path = `${id}/${Date.now()}-${editRecordFile.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, editRecordFile);
        if (uploadError) throw uploadError;
        const { data: docData, error: docError } = await supabase.from('documents').insert({
          case_id: id!,
          file_name: editRecordFile.name,
          storage_path: path,
          document_type: 'Medical Record',
          uploader_id: profile?.id,
          visible_to: ['admin', 'care_manager', 'attorney'],
        }).select('id').single();
        if (docError) throw docError;
        documentId = docData.id;
      }

      const { error } = await supabase.from('records').update({
        record_type: rec.record_type || null,
        provider_id: rec.provider_id || null,
        received_date: rec.received_date || null,
        delivered_to_attorney_date: rec.delivered_to_attorney_date || null,
        hipaa_auth_on_file: rec.hipaa_auth_on_file,
        notes: rec.notes || null,
        document_id: documentId,
      }).eq('id', rec.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setShowEditRecord(false); setEditRecord(null); setEditRecordFile(null); toast.success('Record updated'); },
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
    if (newStatus === 'Settled') {
      setSettlementAmount(caseData?.settlement_final?.toString() || '');
      setShowSettlementModal(true);
      return;
    }
    await updateCase.mutateAsync({ status: newStatus });
    await addUpdate.mutateAsync(`Status changed to ${newStatus} by ${profile?.full_name}`);
  };

  const handleSettlementConfirm = async () => {
    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid settlement amount');
      return;
    }
    await updateCase.mutateAsync({ status: 'Settled', settlement_final: amount });
    await addUpdate.mutateAsync(`Case settled for $${amount.toLocaleString()} by ${profile?.full_name}`);
    setShowSettlementModal(false);
    setSettlementAmount('');
  };

  const handleEstimateSave = async () => {
    const amount = estimateValue ? parseFloat(estimateValue) : null;
    if (estimateValue && (isNaN(amount!) || amount! < 0)) {
      toast.error('Please enter a valid amount');
      return;
    }
    await updateCase.mutateAsync({ settlement_estimate: amount });
    setEditingEstimate(false);
    toast.success('Settlement estimate updated');
  };

  if (isLoading || !caseData) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;
  }

  const c = caseData;
  const solDays = c.sol_date ? Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000) : null;


  return (
    <div className="space-y-6">
      <PHIBanner />
      <div className="flex items-center gap-1 text-sm text-muted-foreground -ml-2">
        <Button variant="link" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground px-1">
          Dashboard
        </Button>
        <span>/</span>
        <Button variant="link" size="sm" onClick={() => navigate('/cases')} className="text-muted-foreground px-1">
          Cases
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">{caseData?.case_number}</span>
      </div>

      {/* Case Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-mono text-primary font-medium">{c.case_number}</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="font-display text-2xl text-foreground">{c.patient_name}</h2>
              {c.patient_phone && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />{c.patient_phone}
                </span>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowReferral(true)}>
                <Send className="w-3 h-3" /> Send Referral
              </Button>
            </div>
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
              {/* Lien Amount - read-only, auto-calculated */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Lien Amount</span>
                <span className="font-mono font-medium tabular-nums text-emerald-600">
                  {c.lien_amount != null ? `$${Number(c.lien_amount).toLocaleString()}` : '—'}
                </span>
              </div>

              {/* Est. Settlement - editable */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Est. Settlement</span>
                {editingEstimate ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={estimateValue}
                      onChange={e => setEstimateValue(e.target.value)}
                      className="h-7 w-28 text-xs font-mono text-right"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEstimateSave();
                        if (e.key === 'Escape') setEditingEstimate(false);
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleEstimateSave}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setEditingEstimate(false)}>✕</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEstimateValue(c.settlement_estimate?.toString() || ''); setEditingEstimate(true); }}
                    className="font-mono font-medium tabular-nums text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    {c.settlement_estimate != null ? `$${Number(c.settlement_estimate).toLocaleString()}` : 'Set estimate'}
                  </button>
                )}
              </div>

              {/* Final Settlement - read-only, set via settlement modal */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Final Settlement</span>
                <span className="font-mono font-medium tabular-nums text-violet-600">
                  {c.settlement_final != null ? `$${Number(c.settlement_final).toLocaleString()}` : '—'}
                </span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between items-center text-sm">
                <span className="text-foreground font-medium">Net to Client</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {(() => {
                    const settlement = c.settlement_final ?? c.settlement_estimate;
                    return settlement != null && c.lien_amount != null
                      ? `$${(Number(settlement) - Number(c.lien_amount)).toLocaleString()}`
                      : '—';
                  })()}
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
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Appointments</h3>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
            if (c.status === 'Settled') { toast.error('Cannot add appointments to a settled case.'); return; }
            setShowAddAppt(true);
          }}>+ Appointment</Button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Notes</th>
            {needsInterpreter && <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Interpreter</th>}
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
                {needsInterpreter && (
                  <td className="px-5 py-3">
                    {(a as any).interpreter_confirmed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Languages className="w-3 h-3" /> Confirmed
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {(!appointments || appointments.length === 0) && (
              <tr><td colSpan={needsInterpreter ? 6 : 5} className="px-5 py-12 text-center text-muted-foreground text-sm">No appointments yet</td></tr>
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
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Document</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Received</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Delivered to Attorney</th>
            
          </tr></thead>
          <tbody className="divide-y divide-border">
            {records?.map(r => {
              const doc = (r as any).documents;
              return (
                <tr key={r.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => { setEditRecord({ ...r, provider_id: r.provider_id || '' }); setShowEditRecord(true); }}>
                  <td className="px-5 py-3 text-xs font-medium text-primary">{r.record_type || '—'}</td>
                  <td className="px-5 py-3 text-xs">{(r as any).providers?.name || '—'}</td>
                  <td className="px-5 py-3 text-xs">
                    {doc ? (
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 300);
                        if (error) { toast.error('Failed to get download link'); return; }
                        window.open(data.signedUrl, '_blank');
                      }} className="flex items-center gap-1 text-primary hover:underline">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">{doc.file_name}</span>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{r.received_date || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.delivered_to_attorney_date || '—'}</td>
                  
                </tr>
              );
            })}
            {(!records || records.length === 0) && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">No records</td></tr>
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
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent px-2 pt-2 flex-wrap">
          <TabsTrigger value="activity" className="text-xs gap-1.5"><Send className="w-3.5 h-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Insurance</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Billing</TabsTrigger>
          <TabsTrigger value="records" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Records</TabsTrigger>
          <TabsTrigger value="workplan" className="text-xs gap-1.5"><ListTodo className="w-3.5 h-3.5" /> Work Plan</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs gap-1.5"><Heart className="w-3.5 h-3.5" /> Engagement</TabsTrigger>
          
          <TabsTrigger value="sol-alerts" className="text-xs gap-1.5"><Bell className="w-3.5 h-3.5" /> SoL Alerts</TabsTrigger>
          <TabsTrigger value="policy" className="text-xs gap-1.5"><Shield className="w-3.5 h-3.5" /> Policy</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Timeline</TabsTrigger>
          {isAdmin && <TabsTrigger value="colossus" className="text-xs gap-1.5"><Radar className="w-3.5 h-3.5" /> Colossus</TabsTrigger>}
          <TabsTrigger value="messages" className="text-xs gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Messages</TabsTrigger>
          <TabsTrigger value="demand" className="text-xs gap-1.5"><FileSignature className="w-3.5 h-3.5" /> Demand Letters</TabsTrigger>
          <TabsTrigger value="docs-dump" className="text-xs gap-1.5"><FolderOpen className="w-3.5 h-3.5" /> Records & Bills</TabsTrigger>
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


        <TabsContent value="sol-alerts" className="p-5">
          <SoLAlertsTab caseId={id!} />
        </TabsContent>

        <TabsContent value="policy" className="p-5">
          <PolicyDetailsTab caseId={id!} />
        </TabsContent>

        <TabsContent value="timeline" className="p-5">
          <TimelineTab caseId={id!} isAdmin={isAdmin} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="colossus" className="p-5">
            <ColossusTab caseId={id!} />
          </TabsContent>
        )}

        <TabsContent value="messages" className="p-5">
          <CaseMessagesTab caseId={id!} patientName={c.patient_name} attorneyId={c.attorney_id} providerId={c.provider_id} />
        </TabsContent>

        <TabsContent value="demand" className="p-5">
          <DemandLettersTab caseId={id!} />
        </TabsContent>

        <TabsContent value="docs-dump" className="p-5">
          <RecordsBillsDump caseId={id!} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showAddAppt} onOpenChange={setShowAddAppt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Appointment</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addAppointment.mutate(); }} className="space-y-4">
            {needsInterpreter && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Languages className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">Reminder: This patient needs an interpreter. Confirm the provider can accommodate before booking.</p>
              </div>
            )}
            <div className="space-y-2"><Label className="text-sm font-medium">Provider</Label>
              <Select value={newAppt.provider_id} onValueChange={v => setNewAppt(p => ({...p, provider_id: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Date & Time</Label><Input type="datetime-local" value={newAppt.scheduled_date} onChange={e => setNewAppt(p => ({...p, scheduled_date: e.target.value}))} className="h-10" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Specialty</Label><Input value={newAppt.specialty} onChange={e => setNewAppt(p => ({...p, specialty: e.target.value}))} className="h-10" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Notes</Label><Textarea value={newAppt.notes} onChange={e => setNewAppt(p => ({...p, notes: e.target.value}))} /></div>
            {needsInterpreter && (
              <div className="flex items-start gap-2.5 pt-1">
                <Checkbox checked={newAppt.interpreter_confirmed} onCheckedChange={v => setNewAppt(p => ({...p, interpreter_confirmed: !!v}))} id="interpreter-confirm" />
                <Label htmlFor="interpreter-confirm" className="text-sm leading-relaxed">I confirm the selected provider can accommodate an interpreter for this patient *</Label>
              </div>
            )}
            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAddAppt(false)}>Cancel</Button><Button type="submit" disabled={addAppointment.isPending || (needsInterpreter && !newAppt.interpreter_confirmed)}>Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Record</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addRecord.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Record Type</Label>
              <Select value={newRecord.record_type} onValueChange={v => setNewRecord(p => ({...p, record_type: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{['Treatment Notes','Billing','Imaging','Surgical Report','Initial Evaluation','Progress Notes','X-rays','MRI Report','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Provider</Label>
              <Select value={newRecord.provider_id} onValueChange={v => setNewRecord(p => ({...p, provider_id: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Received</Label><Input type="date" value={newRecord.received_date} onChange={e => setNewRecord(p => ({...p, received_date: e.target.value}))} className="h-10" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Delivered to Atty</Label><Input type="date" value={newRecord.delivered_to_attorney_date} onChange={e => setNewRecord(p => ({...p, delivered_to_attorney_date: e.target.value}))} className="h-10" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload Document</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png,.tiff" onChange={e => setRecordFile(e.target.files?.[0] || null)} className="h-10" />
              <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG, or TIFF — max 20MB</p>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAddRecord(false)}>Cancel</Button><Button type="submit" disabled={addRecord.isPending}>{addRecord.isPending ? 'Uploading...' : 'Add'}</Button></div>
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

      {/* Edit Record Dialog */}
      <Dialog open={showEditRecord} onOpenChange={v => { setShowEditRecord(v); if (!v) { setEditRecord(null); setEditRecordFile(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Record</DialogTitle></DialogHeader>
          {editRecord && (
            <form onSubmit={e => { e.preventDefault(); updateRecord.mutate(editRecord); }} className="space-y-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Record Type</Label>
                <Select value={editRecord.record_type || ''} onValueChange={v => setEditRecord((p: any) => ({...p, record_type: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{['Treatment Notes','Billing','Imaging','Surgical Report','Initial Evaluation','Progress Notes','X-rays','MRI Report','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label className="text-sm font-medium">Provider</Label>
                <Select value={editRecord.provider_id || ''} onValueChange={v => setEditRecord((p: any) => ({...p, provider_id: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">Received Date</Label><Input type="date" value={editRecord.received_date || ''} onChange={e => setEditRecord((p: any) => ({...p, received_date: e.target.value}))} className="h-10" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium">Delivered to Attorney</Label><Input type="date" value={editRecord.delivered_to_attorney_date || ''} onChange={e => setEditRecord((p: any) => ({...p, delivered_to_attorney_date: e.target.value}))} className="h-10" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editRecord.hipaa_auth_on_file || false} onCheckedChange={v => setEditRecord((p: any) => ({...p, hipaa_auth_on_file: !!v}))} id="edit-hipaa" />
                <Label htmlFor="edit-hipaa" className="text-sm">HIPAA Authorization on file</Label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Document</Label>
                {editRecord.documents ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">{editRecord.documents.file_name}</span>
                    <span className="text-[10px]">(attached)</span>
                  </div>
                ) : null}
                <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png,.tiff" onChange={e => setEditRecordFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground">{editRecord.documents ? 'Upload to replace existing file' : 'PDF, DOC, DOCX, JPG, PNG, or TIFF'}</p>
              </div>
              <div className="space-y-2"><Label className="text-sm font-medium">Notes</Label><Textarea value={editRecord.notes || ''} onChange={e => setEditRecord((p: any) => ({...p, notes: e.target.value}))} /></div>
              <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowEditRecord(false)}>Cancel</Button><Button type="submit" disabled={updateRecord.isPending}>{updateRecord.isPending ? 'Saving...' : 'Save'}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Settlement Modal */}
      <Dialog open={showSettlementModal} onOpenChange={v => { setShowSettlementModal(v); if (!v) setSettlementAmount(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Settle Case</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the final settlement amount to mark this case as settled.</p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Final Settlement Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 25000"
                value={settlementAmount}
                onChange={e => setSettlementAmount(e.target.value)}
                className="h-10"
                autoFocus
              />
            </div>
            <div className="bg-accent/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lien Amount</span>
                <span className="font-mono tabular-nums">${Number(c.lien_amount || 0).toLocaleString()}</span>
              </div>
              {settlementAmount && !isNaN(parseFloat(settlementAmount)) && (
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-foreground font-medium">Net to Client</span>
                  <span className="font-mono font-semibold tabular-nums">
                    ${(parseFloat(settlementAmount) - Number(c.lien_amount || 0)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettlementModal(false)}>Cancel</Button>
              <Button onClick={handleSettlementConfirm} disabled={updateCase.isPending}>
                {updateCase.isPending ? 'Settling...' : 'Confirm Settlement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SendReferralDialog
        open={showReferral}
        onOpenChange={setShowReferral}
        caseId={id!}
        patientCity={patientProfile?.city}
        patientState={patientProfile?.state}
      />
    </div>
  );
}
