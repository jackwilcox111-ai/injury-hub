import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { logPHIAccess } from '@/lib/audit-logger';
import { PHIBanner } from '@/components/global/PHIBanner';
import { SPECIALTIES } from '@/lib/specialties';

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
import { ArrowLeft, AlertTriangle, Clock, FileText, DollarSign, Activity, Send, ShieldCheck, Heart, Bell, ListTodo, FileSignature, GitBranch, Radar, Shield, Languages, Info, Phone, MessageCircle, FolderOpen, Download, MapPin, User, Calendar } from 'lucide-react';
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
import { ProviderReferralsModule } from '@/components/cases/ProviderReferralsModule';
import { CaseTimelineSidebar } from '@/components/cases/CaseTimelineSidebar';
import { CaseProgressStepper } from '@/components/cases/CaseProgressStepper';
import { CaseTasksSection } from '@/components/cases/CaseTasksSection';
import { AttorneyCaseActions } from '@/components/cases/AttorneyCaseActions';


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

const caseStatuses = ['Intake', 'Referrals Sent', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];
const flagOptions = [{ value: 'none', label: 'None' }, { value: 'noshow', label: 'No-Show Risk' }, { value: 'records', label: 'Records Due' }, { value: 'urgent', label: 'Urgent' }];

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const isAttorney = profile?.role === 'attorney';
  const isProvider = profile?.role === 'provider';
  const isStaff = isAdmin || profile?.role === 'care_manager';
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [showAddLien, setShowAddLien] = useState(false);
  const [showEditCharge, setShowEditCharge] = useState(false);
  const [editCharge, setEditCharge] = useState<any>(null);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [newCharge, setNewCharge] = useState({ cpt_description: '', service_date: '', charge_amount: 0, status: 'Pending', billing_path: '', notes: '', provider_id: '' });
  const [showEditLien, setShowEditLien] = useState(false);
  const [editLien, setEditLien] = useState<any>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [estimateValue, setEstimateValue] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const [newAppt, setNewAppt] = useState({ provider_id: '', scheduled_date: '', specialty: '', notes: '', interpreter_confirmed: false });
  const [showEditAppt, setShowEditAppt] = useState(false);
  const [editAppt, setEditAppt] = useState<any>(null);
  const [newRecord, setNewRecord] = useState({ record_type: '', provider_id: '', received_date: '', delivered_to_attorney_date: '', hipaa_auth_on_file: false, notes: '' });
  const [recordFile, setRecordFile] = useState<File | null>(null);
  const [editRecordFile, setEditRecordFile] = useState<File | null>(null);
  const [newLien, setNewLien] = useState({ provider_id: '', amount: 0, status: 'Active', reduction_amount: 0, payment_date: '', notes: '' });

  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-for-case', id],
    queryFn: async () => {
      const { data } = await supabase.from('patient_profiles')
        .select('needs_interpreter, preferred_language, address, city, state, zip, date_of_birth, insurance_status, hipaa_auth_signed, assignment_of_benefits_signed')
        .eq('case_id', id!).maybeSingle();
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

  const { data: charges } = useQuery({
    queryKey: ['case-charges-inline', id],
    queryFn: async () => {
      const { data } = await supabase.from('charges').select('*, providers!charges_provider_id_fkey(name)')
        .eq('case_id', id!).order('service_date', { ascending: false });
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
    enabled: isAdmin || isProvider,
  });

  const { data: providerReferrals } = useQuery({
    queryKey: ['provider-referral-requests', id],
    queryFn: async () => {
      const { data } = await supabase.from('case_tasks')
        .select('id, title, description, status, created_at')
        .eq('case_id', id!)
        .like('title', 'Assign % provider')
        .order('created_at', { ascending: false });
      return (data || []).map(t => ({
        id: t.id,
        specialty: t.title.replace('Assign ', '').replace(' provider', ''),
        status: t.status,
        notes: t.description,
        created_at: t.created_at,
      }));
    },
    enabled: isProvider,
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
    queryClient.invalidateQueries({ queryKey: ['case-charges-inline', id] });
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

  const updateAppointment = useMutation({
    mutationFn: async (appt: any) => {
      const { error } = await supabase.from('appointments').update({
        provider_id: appt.provider_id || null,
        scheduled_date: appt.scheduled_date || null,
        specialty: appt.specialty || null,
        notes: appt.notes || null,
        status: appt.status,
        interpreter_confirmed: appt.interpreter_confirmed || false,
      }).eq('id', appt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setShowEditAppt(false);
      setEditAppt(null);
      toast.success('Appointment updated');
    },
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

  const updateChargeMutation = useMutation({
    mutationFn: async (charge: any) => {
      const { error } = await supabase.from('charges').update({
        cpt_description: charge.cpt_description, service_date: charge.service_date,
        charge_amount: charge.charge_amount, status: charge.status, notes: charge.notes || null,
        billing_path: charge.billing_path || null,
      }).eq('id', charge.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setShowEditCharge(false); setEditCharge(null); toast.success('Charge updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addChargeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('charges').insert({
        case_id: id!, cpt_code: 'MISC', cpt_description: newCharge.cpt_description,
        service_date: newCharge.service_date, charge_amount: newCharge.charge_amount,
        status: newCharge.status, billing_path: newCharge.billing_path || null,
        notes: newCharge.notes || null, provider_id: newCharge.provider_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setShowAddCharge(false);
      setNewCharge({ cpt_description: '', service_date: '', charge_amount: 0, status: 'Pending', billing_path: '', notes: '', provider_id: '' });
      toast.success('Charge added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLienMutation = useMutation({
    mutationFn: async (lien: any) => {
      const { error } = await supabase.from('liens').update({
        amount: lien.amount, reduction_amount: lien.reduction_amount,
        status: lien.status, notes: lien.notes || null, payment_date: lien.payment_date || null,
      }).eq('id', lien.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setShowEditLien(false); setEditLien(null); toast.success('Lien updated'); },
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
        <Button variant="link" size="sm" onClick={() => navigate(isProvider ? '/provider/dashboard' : '/dashboard')} className="text-muted-foreground px-1">
          Dashboard
        </Button>
        <span>/</span>
        {!isProvider && (
          <>
            <Button variant="link" size="sm" onClick={() => navigate('/cases')} className="text-muted-foreground px-1">
              Cases
            </Button>
            <span>/</span>
          </>
        )}
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
              {!isProvider && (
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowReferral(true)}>
                  <Send className="w-3 h-3" /> Send Referral
                </Button>
              )}
            </div>
            
          </div>
          <div className="flex items-center gap-2">
            <FlagBadge flag={c.flag} />
            <StatusBadge status={c.status || ''} />
          </div>
        </div>

        {/* Pipeline Progress Stepper */}
        <div className="mb-5">
          <CaseProgressStepper currentStatus={c.status || ''} />
        </div>

        {/* Controls — providers get read-only overview */}
        {isProvider ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="text-sm font-medium"><StatusBadge status={c.status || ''} /></p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">DOI (Date of Injury)</Label>
                <p className="text-sm font-medium text-foreground">{c.accident_date ? format(new Date(c.accident_date), 'MMM d, yyyy') : '—'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Attorney</Label>
                <p className="text-sm font-medium text-foreground">{(c as any).attorneys?.firm_name || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lien Amount</Label>
                <p className="text-sm font-mono font-medium tabular-nums text-foreground">${Number(c.lien_amount || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Preferred Language</Label>
                <p className="text-sm font-medium text-foreground">{(c as any).preferred_language || 'English'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Opened</Label>
                <p className="text-sm font-medium text-foreground">{c.opened_date ? format(new Date(c.opened_date), 'MMM d, yyyy') : '—'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Last Updated</Label>
                <p className="text-sm font-medium text-foreground">{c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : '—'}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-3">
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
              {isAttorney ? (
                <div className="space-y-1.5">
                  <AttorneyCaseActions
                    caseId={id!}
                    caseNumber={c.case_number}
                    patientName={c.patient_name}
                    currentFlag={c.flag}
                    providerId={c.provider_id}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Attorney</Label>
                  <Select value={c.attorney_id || ''} onValueChange={v => updateCase.mutate({ attorney_id: v || null })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{allAttorneys?.map(a => <SelectItem key={a.id} value={a.id}>{a.firm_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Case Overview */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">DOI (Date of Injury)</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={c.accident_date || ''}
                    onChange={e => updateCase.mutate({ accident_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Request Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={(c as any).request_date || ''}
                    onChange={e => updateCase.mutate({ request_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Initial Appt Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={(c as any).initial_appointment_date || ''}
                    onChange={e => updateCase.mutate({ initial_appointment_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Initial Appt Status</Label>
                  <Select value={(c as any).initial_appointment_status || 'Pending'} onValueChange={v => updateCase.mutate({ initial_appointment_status: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Pending', 'Scheduled', 'Patient Seen', 'No Show', 'Cancelled', 'Rescheduled'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Provider Referrals — hidden for providers */}
      {!isProvider && <ProviderReferralsModule caseId={id!} onSendReferral={() => setShowReferral(true)} />}

      {/* Provider: Request Specialty Referral */}
      {isProvider && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Specialty Referral Requests</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {providerReferrals?.length || 0} request{(providerReferrals?.length || 0) !== 1 ? 's' : ''} sent
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowReferral(true)}>
              <Send className="w-3 h-3" /> Request Referral
            </Button>
          </div>
          {providerReferrals && providerReferrals.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Requested Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {providerReferrals.map((r: any) => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3 text-xs font-medium">{r.specialty || '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs">{r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={`text-[10px] ${
                        r.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        r.status === 'Declined' ? 'bg-red-100 text-red-700 border-red-200' :
                        r.status === 'Expired' ? 'bg-muted text-muted-foreground border-border' :
                        'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              No referral requests yet
            </div>
          )}
        </div>
      )}

      {/* Case Tasks — hidden for providers */}
      {!isProvider && <CaseTasksSection caseId={id!} />}

      {/* Two-column: Appointments + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Notes</th>
              {needsInterpreter && <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Interp.</th>}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {appointments?.map(a => (
                <tr key={a.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => {
                  setEditAppt({
                    id: a.id,
                    provider_id: a.provider_id || '',
                    scheduled_date: a.scheduled_date ? new Date(a.scheduled_date).toISOString().slice(0, 16) : '',
                    specialty: a.specialty || '',
                    notes: a.notes || '',
                    status: a.status,
                    interpreter_confirmed: (a as any).interpreter_confirmed || false,
                  });
                  setShowEditAppt(true);
                }}>
                  <td className="px-4 py-2.5 font-mono text-[11px]">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{(a as any).providers?.name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Select value={a.status} onValueChange={v => { updateApptStatus.mutate({ apptId: a.id, status: v }); }} >
                      <SelectTrigger className="h-7 text-xs w-24" onClick={e => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>{['Scheduled','Completed','No-Show','Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{a.notes || '—'}</td>
                  {needsInterpreter && (
                    <td className="px-4 py-2.5">
                      {(a as any).interpreter_confirmed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                          <Languages className="w-3 h-3" /> ✓
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {(!appointments || appointments.length === 0) && (
                <tr><td colSpan={needsInterpreter ? 5 : 4} className="px-4 py-12 text-center text-muted-foreground text-sm">No appointments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Messages */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden p-5">
          <CaseMessagesTab caseId={id!} patientName={c.patient_name} attorneyId={c.attorney_id} providerId={c.provider_id} attorneyFirmName={(c as any).attorneys?.firm_name} />
        </div>
      </div>

      {/* Bills + Records side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Bills / Charges */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Bills</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddCharge(true)}>+ Submit Charge</Button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {charges?.map(c => (
                <tr key={c.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => { setEditCharge({ ...c }); setShowEditCharge(true); }}>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="font-medium">{c.cpt_description || c.cpt_code}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{c.service_date}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-right tabular-nums">${c.charge_amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5"><Badge variant={c.status === 'Paid' ? 'default' : c.status === 'Denied' ? 'destructive' : 'outline'} className="text-[10px]">{c.status}</Badge></td>
                </tr>
              ))}
              {(!charges || charges.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No charges</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Records */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Records</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddRecord(true)}>+ Record</Button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Document</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Received</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {records?.map(r => {
                const doc = (r as any).documents;
                return (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => { setEditRecord({ ...r, provider_id: r.provider_id || '' }); setShowEditRecord(true); }}>
                    <td className="px-4 py-2.5 text-xs font-medium text-primary">{r.record_type || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">{(r as any).providers?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {doc ? (
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 300);
                          if (error) { toast.error('Failed to get download link'); return; }
                          window.open(data.signedUrl, '_blank');
                        }} className="flex items-center gap-1 text-primary hover:underline">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{doc.file_name}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.received_date || '—'}</td>
                  </tr>
                );
              })}
              {(!records || records.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lien Register - full width */}
      {(isAdmin || isProvider) && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Lien Register</h3>
            {isAdmin && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddLien(true)}>+ Lien</Button>}
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Reduction</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Net Lien</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {liens?.map(l => (
                <tr key={l.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => { setEditLien({ ...l }); setShowEditLien(true); }}>
                  <td className="px-4 py-2.5 text-xs font-medium">{(l as any).providers?.name || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">${l.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">${l.reduction_amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground font-medium tabular-nums">${(l.amount - l.reduction_amount).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={l.status} /></td>
                </tr>
              ))}
              {(!liens || liens.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No liens recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Case Timeline — hidden for providers */}
      {!isProvider && <CaseTimelineSidebar caseId={id!} />}

      {/* Tabbed Module Panels */}
      <Tabs defaultValue="activity" className="bg-card border border-border rounded-xl shadow-card">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent px-2 pt-2 flex-wrap">
          <TabsTrigger value="activity" className="text-xs gap-1.5"><Send className="w-3.5 h-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Insurance</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Billing</TabsTrigger>
          <TabsTrigger value="records" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Records</TabsTrigger>
          {!isProvider && <TabsTrigger value="workplan" className="text-xs gap-1.5"><ListTodo className="w-3.5 h-3.5" /> Work Plan</TabsTrigger>}
          {!isProvider && <TabsTrigger value="policy" className="text-xs gap-1.5"><Shield className="w-3.5 h-3.5" /> Policy</TabsTrigger>}
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

        <TabsContent value="policy" className="p-5">
          <PolicyDetailsTab caseId={id!} />
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
            <div className="space-y-2"><Label className="text-sm font-medium">Specialty</Label>
              <Select value={newAppt.specialty} onValueChange={v => setNewAppt(p => ({...p, specialty: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select specialty..." /></SelectTrigger><SelectContent>{SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
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

      {/* Add Charge Dialog */}
      <Dialog open={showAddCharge} onOpenChange={setShowAddCharge}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Charge</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addChargeMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Service Date *</Label>
                <Input type="date" value={newCharge.service_date} onChange={e => setNewCharge(p => ({...p, service_date: e.target.value}))} required />
              </div>
              <div className="space-y-2"><Label>Billing Path</Label>
                <Select value={newCharge.billing_path} onValueChange={v => setNewCharge(p => ({...p, billing_path: v}))}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{['Insurance','Lien','Self-Pay','MedPay/PIP'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label>
              <Input value={newCharge.cpt_description} onChange={e => setNewCharge(p => ({...p, cpt_description: e.target.value}))} placeholder="e.g. Office visit, MRI, Injection..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount ($) *</Label>
                <Input type="number" min="0" step="0.01" value={newCharge.charge_amount || ''} onChange={e => setNewCharge(p => ({...p, charge_amount: Number(e.target.value)}))} required />
              </div>
              <div className="space-y-2"><Label>Provider</Label>
                <Select value={newCharge.provider_id} onValueChange={v => setNewCharge(p => ({...p, provider_id: v}))}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={newCharge.notes} onChange={e => setNewCharge(p => ({...p, notes: e.target.value}))} /></div>
            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAddCharge(false)}>Cancel</Button><Button type="submit" disabled={!newCharge.service_date || !newCharge.charge_amount || addChargeMutation.isPending}>{addChargeMutation.isPending ? 'Submitting...' : 'Submit'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditAppt} onOpenChange={v => { setShowEditAppt(v); if (!v) setEditAppt(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          {editAppt && (
            <form onSubmit={e => { e.preventDefault(); updateAppointment.mutate(editAppt); }} className="space-y-4">
              <div className="space-y-2"><Label>Provider</Label>
                <Select value={editAppt.provider_id} onValueChange={v => setEditAppt((p: any) => ({...p, provider_id: v}))}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allProviders?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Date & Time</Label>
                <Input type="datetime-local" value={editAppt.scheduled_date} onChange={e => setEditAppt((p: any) => ({...p, scheduled_date: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Specialty</Label>
                  <Input value={editAppt.specialty} onChange={e => setEditAppt((p: any) => ({...p, specialty: e.target.value}))} />
                </div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={editAppt.status} onValueChange={v => setEditAppt((p: any) => ({...p, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Scheduled','Completed','No-Show','Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Notes</Label>
                <Textarea value={editAppt.notes} onChange={e => setEditAppt((p: any) => ({...p, notes: e.target.value}))} />
              </div>
              {needsInterpreter && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={editAppt.interpreter_confirmed} onCheckedChange={v => setEditAppt((p: any) => ({...p, interpreter_confirmed: !!v}))} id="edit-interp" />
                  <Label htmlFor="edit-interp" className="text-sm font-normal">Interpreter confirmed</Label>
                </div>
              )}
              <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditAppt(false)}>Cancel</Button>
                <Button type="submit" disabled={updateAppointment.isPending}>{updateAppointment.isPending ? 'Saving...' : 'Save'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCharge} onOpenChange={v => { setShowEditCharge(v); if (!v) setEditCharge(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Charge</DialogTitle></DialogHeader>
          {editCharge && (
            <form onSubmit={e => { e.preventDefault(); updateChargeMutation.mutate(editCharge); }} className="space-y-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Description</Label>
                <Input value={editCharge.cpt_description || ''} onChange={e => setEditCharge((p: any) => ({...p, cpt_description: e.target.value}))} className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">Service Date</Label>
                  <Input type="date" value={editCharge.service_date || ''} onChange={e => setEditCharge((p: any) => ({...p, service_date: e.target.value}))} className="h-10" />
                </div>
                <div className="space-y-2"><Label className="text-sm font-medium">Amount ($)</Label>
                  <Input type="number" min="0" step="0.01" value={editCharge.charge_amount} onChange={e => setEditCharge((p: any) => ({...p, charge_amount: Number(e.target.value)}))} className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">Status</Label>
                  <Select value={editCharge.status} onValueChange={v => setEditCharge((p: any) => ({...p, status: v}))}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{['Pending','Submitted','Approved','Denied','Paid','Adjusted'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label className="text-sm font-medium">Billing Path</Label>
                  <Select value={editCharge.billing_path || ''} onValueChange={v => setEditCharge((p: any) => ({...p, billing_path: v}))}><SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{['Insurance','Lien','Self-Pay','MedPay/PIP'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="space-y-2"><Label className="text-sm font-medium">Notes</Label><Textarea value={editCharge.notes || ''} onChange={e => setEditCharge((p: any) => ({...p, notes: e.target.value}))} /></div>
              <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowEditCharge(false)}>Cancel</Button><Button type="submit" disabled={updateChargeMutation.isPending}>{updateChargeMutation.isPending ? 'Saving...' : 'Save'}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lien Dialog */}
      <Dialog open={showEditLien} onOpenChange={v => { setShowEditLien(v); if (!v) setEditLien(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Lien</DialogTitle></DialogHeader>
          {editLien && (
            <form onSubmit={e => { e.preventDefault(); updateLienMutation.mutate(editLien); }} className="space-y-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Provider</Label>
                <Input value={(editLien as any).providers?.name || '—'} disabled className="h-10 bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">Amount ($)</Label>
                  <Input type="number" min="0" step="0.01" value={editLien.amount} onChange={e => setEditLien((p: any) => ({...p, amount: Number(e.target.value)}))} className="h-10" />
                </div>
                <div className="space-y-2"><Label className="text-sm font-medium">Reduction ($)</Label>
                  <Input type="number" min="0" step="0.01" value={editLien.reduction_amount} onChange={e => setEditLien((p: any) => ({...p, reduction_amount: Number(e.target.value)}))} className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">Status</Label>
                  <Select value={editLien.status} onValueChange={v => setEditLien((p: any) => ({...p, status: v}))}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{['Active','Reduced','Paid','Waived'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label className="text-sm font-medium">Payment Date</Label>
                  <Input type="date" value={editLien.payment_date || ''} onChange={e => setEditLien((p: any) => ({...p, payment_date: e.target.value}))} className="h-10" />
                </div>
              </div>
              <div className="space-y-2"><Label className="text-sm font-medium">Notes</Label><Textarea value={editLien.notes || ''} onChange={e => setEditLien((p: any) => ({...p, notes: e.target.value}))} /></div>
              <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowEditLien(false)}>Cancel</Button><Button type="submit" disabled={updateLienMutation.isPending}>{updateLienMutation.isPending ? 'Saving...' : 'Save'}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <SendReferralDialog
        open={showReferral}
        onOpenChange={setShowReferral}
        caseId={id!}
        caseNumber={c.case_number}
        patientCity={patientProfile?.city}
        patientState={patientProfile?.state}
      />
    </div>
  );
}
