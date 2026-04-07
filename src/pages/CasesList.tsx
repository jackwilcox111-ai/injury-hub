import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { ProgressBar } from '@/components/global/ProgressBar';
import { FlagBadge } from '@/components/global/FlagBadge';
import { FinancialValue } from '@/components/global/FinancialValue';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Search, Phone, LayoutGrid, Table2 } from 'lucide-react';
import { formatPhone } from '@/lib/format-phone';
import { PHIBanner } from '@/components/global/PHIBanner';
import { US_STATES } from '@/lib/us-states';
import { SortableHeader } from '@/components/global/SortableHeader';
import { LANGUAGES } from '@/lib/languages';
import { useSortableTable } from '@/hooks/use-sortable-table';
import { CasePipeline } from '@/components/dashboard/CasePipeline';

const statuses = ['All', 'Intake', 'Referrals Sent', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];
const specialties = ['Pain Management', 'Physical Therapy', 'Orthopedic', 'Chiropractic', 'Surgical Center', 'Diagnostics', 'Other'];

export default function CasesList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [attorneyFilter, setAttorneyFilter] = useState('All');
  const [alertFilter, setAlertFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showNew, setShowNew] = useState(false);
  const [newCase, setNewCase] = useState({
    first_name: '', last_name: '', accident_date: '', accident_state: '', case_type: '',
    patient_phone: '', patient_email: '', attorney_id: '', specialty: '',
    request_date: new Date().toISOString().split('T')[0], preferred_language: 'English',
    urgent: false, law_firm_website: '', case_manager_email: '', case_manager_phone: '',
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases-list'],
    queryFn: async () => {
      const { data } = await supabase.from('cases_with_counts')
        .select('*, attorneys!cases_attorney_id_fkey(firm_name), providers!cases_provider_id_fkey(name)')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: attorneys } = useQuery({
    queryKey: ['attorneys-active'],
    queryFn: async () => {
      const { data } = await supabase.from('attorneys').select('id, firm_name').eq('status', 'Active');
      return data || [];
    },
  });

  // Fetch patient DOBs for display
  const { data: patientDobs } = useQuery({
    queryKey: ['patient-dobs', cases?.map(c => c.id)],
    enabled: !!cases && cases.length > 0,
    queryFn: async () => {
      const caseIds = cases!.map(c => c.id);
      const { data } = await supabase
        .from('patient_profiles')
        .select('case_id, date_of_birth')
        .in('case_id', caseIds)
        .not('date_of_birth', 'is', null);
      const map: Record<string, string> = {};
      data?.forEach(p => { if (p.case_id && p.date_of_birth) map[p.case_id] = p.date_of_birth; });
      return map;
    },
  });

  const createCase = useMutation({
    mutationFn: async () => {
      const insertData: any = {
        patient_name: `${newCase.first_name} ${newCase.last_name}`.trim(),
        accident_date: newCase.accident_date || null,
        accident_state: newCase.accident_state || null,
        patient_phone: newCase.patient_phone || null,
        patient_email: newCase.patient_email || null,
        attorney_id: newCase.attorney_id || null,
        specialty: newCase.specialty || null,
        request_date: newCase.request_date || null,
        preferred_language: newCase.preferred_language || 'English',
        urgent: newCase.urgent,
        law_firm_website: newCase.law_firm_website || null,
        case_manager_email: newCase.case_manager_email || null,
        case_manager_phone: newCase.case_manager_phone || null,
      };
      const { data, error } = await supabase.from('cases').insert(insertData).select('case_number').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Case ${data.case_number} created`);
      queryClient.invalidateQueries({ queryKey: ['cases-list'] });
      setShowNew(false);
      setNewCase({ first_name: '', last_name: '', accident_date: '', accident_state: '', case_type: '', patient_phone: '', patient_email: '', attorney_id: '', specialty: '', request_date: new Date().toISOString().split('T')[0], preferred_language: 'English', urgent: false, law_firm_website: '', case_manager_email: '', case_manager_phone: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (cases || []).filter(c => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (attorneyFilter !== 'All') {
        const firm = (c as any).attorneys?.firm_name || '';
        if (firm !== attorneyFilter) return false;
      }
      if (alertFilter !== 'All') {
        const flag = c.flag || '';
        if (alertFilter === 'None' && flag) return false;
        if (alertFilter !== 'None' && flag !== alertFilter) return false;
      }
      if (!search) return true;
      const s = search.toLowerCase();
      return (c.patient_name?.toLowerCase().includes(s) || c.case_number?.toLowerCase().includes(s) || (c as any).attorneys?.firm_name?.toLowerCase().includes(s) || c.patient_phone?.includes(s));
    });
  }, [cases, search, statusFilter, attorneyFilter, alertFilter]);

  const uniqueAttorneys = useMemo(() => {
    const names = new Set<string>();
    (cases || []).forEach(c => { const f = (c as any).attorneys?.firm_name; if (f) names.add(f); });
    return Array.from(names).sort();
  }, [cases]);

  const uniqueAlerts = useMemo(() => {
    const flags = new Set<string>();
    (cases || []).forEach(c => { if (c.flag) flags.add(c.flag); });
    return Array.from(flags).sort();
  }, [cases]);

  const { sortedData: sorted, sortConfig, requestSort } = useSortableTable(filtered, { key: 'updated_at', direction: 'desc' });

  if (isLoading) {
    return <div className="space-y-6"><div className="flex items-center justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-10 w-32" /></div><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <PHIBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Cases</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{cases?.length || 0} total cases</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Kanban view">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Table view">
              <Table2 className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Case
          </Button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <CasePipeline cases={cases || []} isAdmin={isAdmin} />
      ) : (
        <>
          {/* Search + Filters */}
           <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient, case #, attorney, phone..." className="pl-9 h-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {statuses.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={attorneyFilter} onValueChange={setAttorneyFilter}>
              <SelectTrigger className="h-10 w-44 text-xs"><SelectValue placeholder="Attorney" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All Attorneys</SelectItem>
                {uniqueAttorneys.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="h-10 w-36 text-xs"><SelectValue placeholder="Alert" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All Alerts</SelectItem>
                <SelectItem value="None" className="text-xs">No Alert</SelectItem>
                {uniqueAlerts.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

      {/* Cases Table */}
      {sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <p className="text-sm text-muted-foreground">No cases found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <SortableHeader label="Case" sortKey="case_number" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                <SortableHeader label="Patient" sortKey="patient_name" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                <SortableHeader label="Patient Phone" sortKey="patient_phone" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                <SortableHeader label="DOI" sortKey="accident_date" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                <SortableHeader label="Attorney" sortKey="attorneys.firm_name" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                <SortableHeader label="Status" sortKey="status" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                <SortableHeader label="Lien" sortKey="lien_amount" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                <SortableHeader label="Alert" sortKey="flag" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
                
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-mono text-primary font-medium">{c.case_number}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground text-sm">{c.patient_name}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {c.patient_phone ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {formatPhone(c.patient_phone)}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-muted-foreground">
                      {c.accident_date ? format(new Date(c.accident_date), 'MM/dd/yyyy') : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-foreground">{(c as any).attorneys?.firm_name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status || ''} />
                  </td>
                  <td className="px-5 py-3.5">
                    <FinancialValue value={c.lien_amount} />
                  </td>
                  <td className="px-5 py-3.5">
                    <FlagBadge flag={c.flag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {/* New Case Modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-lg">New Case</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createCase.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">First Name *</Label>
                <Input value={newCase.first_name} onChange={e => setNewCase(p => ({...p, first_name: e.target.value}))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Last Name *</Label>
                <Input value={newCase.last_name} onChange={e => setNewCase(p => ({...p, last_name: e.target.value}))} required className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client Phone *</Label>
                <Input value={newCase.patient_phone} onChange={e => setNewCase(p => ({...p, patient_phone: e.target.value}))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client Email *</Label>
                <Input type="email" value={newCase.patient_email} onChange={e => setNewCase(p => ({...p, patient_email: e.target.value}))} required className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date of Loss *</Label>
                <Input type="date" value={newCase.accident_date} onChange={e => setNewCase(p => ({...p, accident_date: e.target.value}))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Request Date *</Label>
                <Input type="date" value={newCase.request_date} onChange={e => setNewCase(p => ({...p, request_date: e.target.value}))} required className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preferred Language *</Label>
                <Select value={newCase.preferred_language} onValueChange={v => setNewCase(p => ({...p, preferred_language: v}))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Urgent</Label>
                <Select value={newCase.urgent ? 'Yes' : 'No'} onValueChange={v => setNewCase(p => ({...p, urgent: v === 'Yes'}))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">State *</Label>
                <Select value={newCase.accident_state} onValueChange={v => setNewCase(p => ({...p, accident_state: v}))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select state..." /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Case Type</Label>
                <Select value={newCase.case_type} onValueChange={v => setNewCase(p => ({...p, case_type: v}))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select case type..." /></SelectTrigger>
                  <SelectContent>
                    {['Personal Injury', 'Motor Vehicle Collision', 'Malpractice', 'Wrongful Death', 'Slip & Fall', 'Product Liability', 'Workers Compensation', 'Other'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Law Firm Website *</Label>
              <Input value={newCase.law_firm_website} onChange={e => setNewCase(p => ({...p, law_firm_website: e.target.value}))} required className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Case Manager Email *</Label>
                <Input type="email" value={newCase.case_manager_email} onChange={e => setNewCase(p => ({...p, case_manager_email: e.target.value}))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Case Manager Phone *</Label>
                <Input value={newCase.case_manager_phone} onChange={e => setNewCase(p => ({...p, case_manager_phone: e.target.value}))} required className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attorney</Label>
                <Select value={newCase.attorney_id} onValueChange={v => setNewCase(p => ({...p, attorney_id: v}))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {attorneys?.map(a => <SelectItem key={a.id} value={a.id}>{a.firm_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Specialty</Label>
                <Select value={newCase.specialty} onValueChange={v => setNewCase(p => ({...p, specialty: v}))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t border-border pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button type="submit" disabled={createCase.isPending}>{createCase.isPending ? 'Creating...' : 'Create Case'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
