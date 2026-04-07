import { useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { format, formatDistanceToNow, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { PHIBanner } from '@/components/global/PHIBanner';
import {
  Calendar, FileText, DollarSign, Plus, Users, Building2, Link2, MessageCircle, Upload,
  TrendingUp, CheckCircle, Clock, AlertTriangle, FileCheck, FolderOpen, ArrowRight,
  Phone, Search, ArrowUp, ArrowDown, X, Send
} from 'lucide-react';
import { ProviderProfileTab } from '@/components/provider/ProviderProfileTab';
import { ProviderLiensTab } from '@/components/provider/ProviderLiensTab';
import { ProviderDocumentsTab } from '@/components/provider/ProviderDocumentsTab';
import { ProviderMessagesTab } from '@/components/provider/ProviderMessagesTab';
import { SPECIALTIES } from '@/lib/specialties';
import { Textarea } from '@/components/ui/textarea';
import { ProviderReferralsTab } from '@/components/provider/ProviderReferralsTab';

const BILLING_PATHS = ['Lien', 'PIP', 'MedPay', 'Insurance'];
const APPT_STATUSES = ['Scheduled', 'Completed', 'No-Show', 'Cancelled', 'Rescheduled'];

type SortField = 'patient_name' | 'updated_at' | 'lien_amount' | 'status' | 'case_number';
type SortDir = 'asc' | 'desc';

export default function ProviderPortal() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const queryClient = useQueryClient();
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showEditCharge, setShowEditCharge] = useState(false);
  const [editingCharge, setEditingCharge] = useState<any>(null);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [charge, setCharge] = useState({ description: '', service_date: '', charge_amount: '', units: '1', billing_path: 'Lien', notes: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [showEditAppt, setShowEditAppt] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Cases
  const { data: cases, isLoading } = useQuery({
    queryKey: ['provider-cases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases')
        .select('id, case_number, patient_name, patient_phone, patient_email, status, specialty, opened_date, accident_date, lien_amount, updated_at, sol_date, flag, attorneys!cases_attorney_id_fkey(firm_name)')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: appointments } = useQuery({
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

  const { data: unreadMessages } = useQuery({
    queryKey: ['provider-unread-count'],
    queryFn: async () => {
      const { count } = await supabase.from('video_messages')
        .select('*', { count: 'exact', head: true })
        .eq('viewed', false);
      return count || 0;
    },
  });

  const { data: liens } = useQuery({
    queryKey: ['provider-liens-metrics'],
    queryFn: async () => {
      const { data } = await supabase.from('liens').select('amount, reduction_amount, status, payment_date');
      return data || [];
    },
  });

  const { data: documents } = useQuery({
    queryKey: ['provider-documents-metrics'],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('id, signed, document_type');
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

  const updateApptFull = useMutation({
    mutationFn: async () => {
      if (!editingAppt) return;
      const { error } = await supabase.from('appointments').update({
        scheduled_date: editingAppt.scheduled_date,
        specialty: editingAppt.specialty || null,
        status: editingAppt.status,
        notes: editingAppt.notes || null,
      }).eq('id', editingAppt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-portal-appointments'] });
      setShowEditAppt(false);
      setEditingAppt(null);
      toast.success('Appointment updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addCharge = useMutation({
    mutationFn: async () => {
      let documentId: string | null = null;

      if (selectedFile) {
        const filePath = `charges/${selectedCaseId}/${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        const { data: docData, error: docError } = await supabase.from('documents').insert({
          case_id: selectedCaseId,
          file_name: selectedFile.name,
          storage_path: filePath,
          document_type: 'bill',
          uploader_id: profile?.id,
        }).select('id').single();
        if (docError) throw docError;
        documentId = docData.id;
      }

      const { error } = await supabase.from('charges').insert({
        case_id: selectedCaseId,
        provider_id: profile?.provider_id || null,
        cpt_code: charge.description || 'BILL',
        cpt_description: charge.description || null,
        service_date: charge.service_date,
        charge_amount: parseFloat(charge.charge_amount) || 0,
        units: parseInt(charge.units) || 1,
        billing_path: charge.billing_path,
        document_id: documentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-charges'] });
      setShowAddCharge(false);
      setSelectedFile(null);
      setCharge({ description: '', service_date: '', charge_amount: '', units: '1', billing_path: 'Lien', notes: '' });
      toast.success('Charge submitted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCharge = useMutation({
    mutationFn: async () => {
      if (!editingCharge) return;
      const { error } = await supabase.from('charges').update({
        cpt_code: editingCharge.cpt_description || editingCharge.cpt_code || 'BILL',
        cpt_description: editingCharge.cpt_description || null,
        service_date: editingCharge.service_date,
        charge_amount: parseFloat(editingCharge.charge_amount) || 0,
        units: parseInt(editingCharge.units) || 1,
        billing_path: editingCharge.billing_path || 'Lien',
      }).eq('id', editingCharge.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-charges'] });
      setShowEditCharge(false);
      setEditingCharge(null);
      toast.success('Charge updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Build unique case list from provider's assigned cases for charge selector
  const uniqueCases = (cases || []).map(c => ({ id: c.id, case_number: c.case_number, patient_name: c.patient_name }));

  // Metrics
  const now = new Date();
  const activeCases = cases || [];
  const totalCharges = charges?.reduce((sum, c) => sum + (c.charge_amount || 0), 0) || 0;
  const totalPaid = charges?.reduce((sum, c) => sum + (c.paid_amount || 0), 0) || 0;
  const completed = appointments?.filter(a => a.status === 'Completed').length || 0;
  const scheduled = appointments?.filter(a => a.status === 'Scheduled').length || 0;
  const noShowAppts = appointments?.filter(a => a.status === 'No-Show') || [];
  const totalAppts = appointments?.length || 0;
  const completionRate = totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0;
  const inTreatment = activeCases.filter(c => c.status === 'In Treatment').length;
  const pendingCharges = charges?.filter(c => c.status === 'Pending').length || 0;
  const totalLienAmount = liens?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0;
  const pendingLiens = liens?.filter(l => l.status === 'Pending').length || 0;
  const paidLiens = liens?.filter(l => l.status === 'Paid').length || 0;
  const totalReductions = liens?.reduce((sum, l) => sum + (l.reduction_amount || 0), 0) || 0;
  const totalDocs = documents?.length || 0;
  const signedDocs = documents?.filter(d => d.signed).length || 0;
  const unsignedDocs = totalDocs - signedDocs;
  const totalRecords = records?.length || 0;
  const flaggedCases = activeCases.filter(c => c.flag);
  const totalLien = activeCases.reduce((sum, c) => sum + (c.lien_amount || 0), 0);

  // Stale cases: no update in 14+ days
  const staleCases = activeCases
    .filter(c => {
      if (!c.updated_at) return true;
      return differenceInDays(now, new Date(c.updated_at)) >= 14;
    })
    .sort((a, b) => {
      const dA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dA - dB;
    });

  // Appointment stats per case
  const apptStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; next: string | null }> = {};
    appointments?.forEach(a => {
      if (!map[a.case_id]) map[a.case_id] = { total: 0, completed: 0, next: null };
      map[a.case_id].total++;
      if (a.status === 'Completed') map[a.case_id].completed++;
      if (a.status === 'Scheduled' && a.scheduled_date) {
        const d = a.scheduled_date;
        if (!map[a.case_id].next || d < map[a.case_id].next!) {
          map[a.case_id].next = d;
        }
      }
    });
    return map;
  }, [appointments]);

  // Dashboard filtered + sorted patient list
  const STATUS_FILTERS = ['All', 'Intake', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];
  const filtered = useMemo(() => {
    let result = activeCases;
    if (statusFilter !== 'All') result = result.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.patient_name?.toLowerCase().includes(q) ||
        c.case_number?.toLowerCase().includes(q) ||
        c.patient_phone?.includes(q) ||
        c.specialty?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCases, search, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === 'updated_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filtered, sortField, sortDir]);

  const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'patient_name', label: 'Patient Name' },
    { value: 'case_number', label: 'Case Number' },
    { value: 'lien_amount', label: 'Lien Amount' },
    { value: 'status', label: 'Status' },
  ];

  const getStaleLabel = (updatedAt: string | null) => {
    if (!updatedAt) return { label: 'Never updated', days: 999 };
    const days = differenceInDays(now, new Date(updatedAt));
    return { label: `${days}d inactive`, days };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
        </div>
        <div className="grid grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  const tabTitles: Record<string, string> = {
    referrals: 'Referrals',
    appointments: 'Appointments',
    'records-bills': 'Records & Bills',
    liens: 'Liens',
    messages: 'Messages',
    profile: 'My Practice',
  };

  const tabDescriptions: Record<string, string> = {
    referrals: 'Review and respond to incoming patient referrals.',
    appointments: 'Track upcoming, completed, and missed appointments.',
    'records-bills': 'Manage charges, medical records, and uploaded documents.',
    liens: 'Track lien amounts, reductions, and payments.',
    messages: 'View and respond to secure messages.',
    profile: 'Update your practice information.',
  };

  // Section-specific KPI cards for non-dashboard tabs
  const KpiCard = ({ icon: Icon, value, label, color = 'text-foreground', bg = 'bg-card border-border' }: { icon: any; value: string | number; label: string; color?: string; bg?: string }) => (
    <div className={`${bg} border rounded-xl p-4 text-center`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );

  const sectionKpis: Record<string, React.ReactNode> = {
    appointments: (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Calendar} value={totalAppts} label="Total Appts" />
        <KpiCard icon={CheckCircle} value={completed} label="Completed" color="text-success" />
        <KpiCard icon={Clock} value={scheduled} label="Scheduled" color="text-primary" />
        <KpiCard icon={AlertTriangle} value={noShowAppts.length} label="No-Shows" color="text-destructive" />
      </div>
    ),
    'records-bills': (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard icon={FileText} value={charges?.length || 0} label="Charges" />
        <KpiCard icon={DollarSign} value={`$${totalCharges.toLocaleString()}`} label="Total Billed" color="text-success" bg="bg-success/5 border-success/20" />
        <KpiCard icon={FolderOpen} value={totalRecords + totalDocs} label="Records & Docs" />
      </div>
    ),
    liens: (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} value={`$${totalLienAmount.toLocaleString()}`} label="Total Liens" />
        <KpiCard icon={Clock} value={pendingLiens} label="Pending" color="text-warning" />
        <KpiCard icon={CheckCircle} value={paidLiens} label="Paid" color="text-success" />
        <KpiCard icon={DollarSign} value={`$${totalReductions.toLocaleString()}`} label="Reductions" color="text-primary" />
      </div>
    ),
    messages: (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard icon={MessageCircle} value={unreadMessages || 0} label="Unread" color="text-destructive" />
      </div>
    ),
  };

  // Dashboard view (default)
  const isDashboard = activeTab === 'dashboard';

  return (
    <div className="space-y-6">
      <PHIBanner />

      {isDashboard ? (
        <>
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl text-foreground">
                Good morning{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening with your patients today.</p>
            </div>
          </div>

          {/* Dashboard KPI Cards */}
          <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
            {/* Active Patients */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-[18px] h-[18px] text-primary" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{activeCases.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active Patients</p>
              <div className="flex gap-3 mt-3 text-[11px]">
                <span className="text-primary">{activeCases.filter(c => c.status === 'Intake').length} intake</span>
                <span className="text-success">{inTreatment} treating</span>
              </div>
            </div>

            {/* Total Billed */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-[18px] h-[18px] text-success" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">${totalCharges.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Billed</p>
              <div className="flex gap-3 mt-3 text-[11px]">
                <span className="text-success">${totalPaid.toLocaleString()} collected</span>
                <span className="text-muted-foreground">{pendingCharges} pending</span>
              </div>
            </div>

            {/* Appointment Completion */}
            <div className={`bg-card border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow ${noShowAppts.length > 0 ? 'border-warning/30 bg-warning/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${noShowAppts.length > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
                  <Calendar className={`w-[18px] h-[18px] ${noShowAppts.length > 0 ? 'text-warning' : 'text-success'}`} />
                </div>
                {noShowAppts.length > 0 && <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">No-shows</span>}
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{completionRate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Completion Rate</p>
              <div className="flex gap-3 mt-3 text-[11px]">
                <span className="text-success">{completed} completed</span>
                <span className="text-destructive">{noShowAppts.length} no-show</span>
              </div>
            </div>

            {/* Flagged / Alerts */}
            <div className={`bg-card border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow ${(flaggedCases.length > 0 || (unreadMessages || 0) > 0) ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${flaggedCases.length > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <AlertTriangle className={`w-[18px] h-[18px] ${flaggedCases.length > 0 ? 'text-destructive' : 'text-success'}`} />
                </div>
                {flaggedCases.length > 0 && <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Action needed</span>}
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{flaggedCases.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Flagged Cases</p>
              <div className="flex gap-3 mt-3 text-[11px]">
                {(unreadMessages || 0) > 0 && <span className="text-destructive">{unreadMessages} unread msg</span>}
                {unsignedDocs > 0 && <span className="text-warning">{unsignedDocs} unsigned docs</span>}
              </div>
            </div>
          </div>

          {/* Patient Pipeline Table */}
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">Patient Pipeline</h3>
              <div className="flex items-center gap-2 ml-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search patients, case #, phone..."
                    className="pl-8 h-8 w-52 text-xs"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-accent transition-colors"
                >
                  {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <span className="text-xs text-muted-foreground">{sorted.length} patient{sorted.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case #</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Visits</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Next Appt</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Lien</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map(c => {
                    const stats = apptStats[c.id];
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className="hover:bg-accent/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.patient_name}</p>
                            {c.flag && <span className="text-[10px] text-destructive font-medium">{c.flag}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-primary">{c.case_number}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{c.specialty || '—'}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={c.status || ''} /></td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {c.patient_phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {c.patient_phone}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-xs tabular-nums">
                          {stats ? `${stats.completed}/${stats.total}` : '0'}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {stats?.next ? (
                            <span className="text-primary font-medium">{format(new Date(stats.next), 'MMM d')}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-right tabular-nums">${Number(c.lien_amount || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-[11px] text-muted-foreground text-right whitespace-nowrap">
                          {c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-muted-foreground">No patients found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stale Cases */}
          {staleCases.length > 0 && (
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Stale Cases — No Activity in 14+ Days</h3>
                <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium ml-1">{staleCases.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent/50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Lien</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Inactive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staleCases.map(c => {
                      const stale = getStaleLabel(c.updated_at);
                      return (
                        <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs text-primary font-medium">{c.case_number}</td>
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="text-sm font-medium text-foreground">{c.patient_name}</p>
                              {c.patient_phone && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />{c.patient_phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><StatusBadge status={c.status || ''} /></td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">{c.specialty || '—'}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-right tabular-nums">${Number(c.lien_amount || 0).toLocaleString()}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              stale.days >= 30 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20'
                            }`}>{stale.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No-Show Alert */}
          {noShowAppts.length > 0 && (
            <div className="bg-card border border-destructive/20 rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-semibold text-foreground">Recent No-Shows</h3>
                <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">{noShowAppts.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent/50">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Case #</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Patient</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {noShowAppts.slice(0, 10).map(a => (
                      <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-primary">{(a as any).cases?.case_number}</td>
                        <td className="px-5 py-3 text-xs text-foreground">{(a as any).cases?.patient_name}</td>
                        <td className="px-5 py-3 font-mono text-xs">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Non-dashboard tab views */}
          <div>
            <h2 className="font-display text-xl">{tabTitles[activeTab] || 'Dashboard'}</h2>
            <p className="text-sm text-muted-foreground">{tabDescriptions[activeTab] || ''}</p>
          </div>

          {sectionKpis[activeTab] || null}
        </>
      )}

      <Tabs value={activeTab}>
        {/* Appointments Tab */}
        <TabsContent value="appointments" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {appointments?.map(a => (
                  <tr key={a.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => {
                    setEditingAppt({
                      id: a.id,
                      scheduled_date: a.scheduled_date ? new Date(a.scheduled_date).toISOString().slice(0, 16) : '',
                      specialty: a.specialty || '',
                      status: a.status,
                      notes: a.notes || '',
                      case_number: (a as any).cases?.case_number,
                      patient_name: (a as any).cases?.patient_name,
                    });
                    setShowEditAppt(true);
                  }}>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{(a as any).cases?.case_number}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{(a as any).cases?.patient_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.specialty || '—'}</td>
                    <td className="px-4 py-3">
                      <Select value={a.status} onValueChange={v => { updateAppt.mutate({ id: a.id, status: v }); }}>
                        <SelectTrigger className="h-7 w-28 text-[10px]" onClick={e => e.stopPropagation()}><SelectValue /></SelectTrigger>
                        <SelectContent>{APPT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
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

        {/* Records & Bills Tab (merged Charges + Records + Documents) */}
        <TabsContent value="records-bills" className="mt-4">
          <Tabs defaultValue="charges" className="space-y-4">
            <TabsList className="bg-accent/30 border border-border">
              <TabsTrigger value="charges" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Charges</TabsTrigger>
              <TabsTrigger value="records" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Records</TabsTrigger>
            </TabsList>

            <TabsContent value="charges" className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAddCharge(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Submit Charge</Button>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-accent/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Charge Description</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {charges?.map(c => (
                      <tr key={c.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => {
                        if (c.status === 'Pending') {
                          setEditingCharge({
                            id: c.id,
                            cpt_code: c.cpt_code,
                            cpt_description: c.cpt_description || '',
                            service_date: c.service_date,
                            charge_amount: String(c.charge_amount),
                            units: String(c.units || 1),
                            billing_path: c.billing_path || 'Lien',
                            case_number: (c as any).cases?.case_number,
                          });
                          setShowEditCharge(true);
                        }
                      }}>
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

            <TabsContent value="records">
              <ProviderDocumentsTab cases={uniqueCases} records={records || []} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Liens Tab */}
        <TabsContent value="liens" className="mt-4">
          <ProviderLiensTab />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-4">
          <ProviderMessagesTab />
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="mt-4">
          <ProviderReferralsTab />
        </TabsContent>

        {/* My Practice Tab */}
        <TabsContent value="profile" className="mt-4">
          <ProviderProfileTab />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Service Date *</Label><Input type="date" value={charge.service_date} onChange={e => setCharge(p => ({ ...p, service_date: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Billing Path</Label>
                <Select value={charge.billing_path} onValueChange={v => setCharge(p => ({ ...p, billing_path: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BILLING_PATHS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={charge.description} onChange={e => setCharge(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Office visit, MRI, Injection..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount ($) *</Label><Input type="number" step="0.01" value={charge.charge_amount} onChange={e => setCharge(p => ({ ...p, charge_amount: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Units</Label><Input type="number" min={1} value={charge.units} onChange={e => setCharge(p => ({ ...p, units: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={charge.notes || ''} onChange={e => setCharge(p => ({ ...p, notes: e.target.value }))} /></div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label>Attach Bill (PDF)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 bg-accent/30 rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{selectedFile.name}</span>
                  <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full h-9 text-xs" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Choose PDF...
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddCharge(false)}>Cancel</Button>
              <Button type="submit" disabled={addCharge.isPending || !selectedCaseId || !charge.service_date}>Submit</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditAppt} onOpenChange={v => { setShowEditAppt(v); if (!v) setEditingAppt(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Appointment — {editingAppt?.case_number}</DialogTitle></DialogHeader>
          {editingAppt && (
            <form onSubmit={e => { e.preventDefault(); updateApptFull.mutate(); }} className="space-y-4">
              <div className="text-sm text-muted-foreground">Patient: <span className="text-foreground font-medium">{editingAppt.patient_name}</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date & Time</Label><Input type="datetime-local" value={editingAppt.scheduled_date} onChange={e => setEditingAppt((p: any) => ({ ...p, scheduled_date: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editingAppt.status} onValueChange={v => setEditingAppt((p: any) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{APPT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Select value={editingAppt.specialty} onValueChange={v => setEditingAppt((p: any) => ({ ...p, specialty: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select specialty..." /></SelectTrigger>
                  <SelectContent>{SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={editingAppt.notes} onChange={e => setEditingAppt((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowEditAppt(false); setEditingAppt(null); }}>Cancel</Button>
                <Button type="submit" disabled={updateApptFull.isPending}>Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Charge Dialog */}
      <Dialog open={showEditCharge} onOpenChange={v => { setShowEditCharge(v); if (!v) setEditingCharge(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Charge — {editingCharge?.case_number}</DialogTitle></DialogHeader>
          {editingCharge && (
            <form onSubmit={e => { e.preventDefault(); updateCharge.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Service Date *</Label><Input type="date" value={editingCharge.service_date} onChange={e => setEditingCharge((p: any) => ({ ...p, service_date: e.target.value }))} required /></div>
                <div className="space-y-2">
                  <Label>Billing Path</Label>
                  <Select value={editingCharge.billing_path} onValueChange={v => setEditingCharge((p: any) => ({ ...p, billing_path: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BILLING_PATHS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={editingCharge.cpt_description} onChange={e => setEditingCharge((p: any) => ({ ...p, cpt_description: e.target.value }))} placeholder="e.g. Office visit, MRI, Injection..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Amount ($) *</Label><Input type="number" step="0.01" value={editingCharge.charge_amount} onChange={e => setEditingCharge((p: any) => ({ ...p, charge_amount: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Units</Label><Input type="number" min={1} value={editingCharge.units} onChange={e => setEditingCharge((p: any) => ({ ...p, units: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowEditCharge(false); setEditingCharge(null); }}>Cancel</Button>
                <Button type="submit" disabled={updateCharge.isPending}>Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="text-[10px] text-muted-foreground text-center py-2 border-t border-border mt-8">
        This portal contains Protected Health Information (PHI). Access is restricted to authorized personnel only. All activity is logged in compliance with HIPAA regulations.
      </div>
    </div>
  );
}
