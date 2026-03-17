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
import { Plus, Search } from 'lucide-react';

const statuses = ['All', 'Intake', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];
const specialties = ['Pain Management', 'Physical Therapy', 'Orthopedic', 'Chiropractic', 'Surgical Center', 'Diagnostics', 'Other'];

export default function CasesList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const [newCase, setNewCase] = useState({
    patient_name: '', accident_date: '', accident_state: '', sol_period_days: 730,
    patient_phone: '', patient_email: '', attorney_id: '', specialty: '',
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases-list', statusFilter],
    queryFn: async () => {
      let q = supabase.from('cases_with_counts')
        .select('*, attorneys!cases_attorney_id_fkey(firm_name), providers!cases_provider_id_fkey(name)')
        .order('updated_at', { ascending: false });
      if (statusFilter !== 'All') q = q.eq('status', statusFilter);
      const { data } = await q;
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

  const createCase = useMutation({
    mutationFn: async () => {
      const insertData: any = {
        patient_name: newCase.patient_name,
        accident_date: newCase.accident_date || null,
        accident_state: newCase.accident_state || null,
        sol_period_days: newCase.sol_period_days,
        patient_phone: newCase.patient_phone || null,
        patient_email: newCase.patient_email || null,
        attorney_id: newCase.attorney_id || null,
        specialty: newCase.specialty || null,
      };
      const { data, error } = await supabase.from('cases').insert(insertData).select('case_number').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Case ${data.case_number} created`);
      queryClient.invalidateQueries({ queryKey: ['cases-list'] });
      setShowNew(false);
      setNewCase({ patient_name: '', accident_date: '', accident_state: '', sol_period_days: 730, patient_phone: '', patient_email: '', attorney_id: '', specialty: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = cases?.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.patient_name?.toLowerCase().includes(s) || c.case_number?.toLowerCase().includes(s) || (c as any).attorneys?.firm_name?.toLowerCase().includes(s));
  }) || [];

  if (isLoading) {
    return <div className="space-y-6"><div className="flex items-center justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-10 w-32" /></div><div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Cases</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{cases?.length || 0} total cases</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Case
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient, case #, or attorney..." className="pl-9 h-10" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Case Cards */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <p className="text-sm text-muted-foreground">No cases found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="bg-card border border-border rounded-xl p-5 text-left shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[11px] font-mono text-primary font-medium">{c.case_number}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">{c.patient_name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <FlagBadge flag={c.flag} />
                  <StatusBadge status={c.status || ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-xs mb-4">
                <div>
                  <span className="text-muted-foreground">Specialty: </span>
                  <span className="text-foreground font-medium">{c.specialty || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Attorney: </span>
                  <span className="text-foreground font-medium">{(c as any).attorneys?.firm_name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider: </span>
                  <span className="text-foreground font-medium">{(c as any).providers?.name || '—'}</span>
                </div>
                {isAdmin && (
                  <div>
                    <span className="text-muted-foreground">Lien: </span>
                    <FinancialValue value={c.lien_amount} />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} />
                <ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New Case Modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-lg">New Case</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createCase.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Patient Name *</Label>
              <Input value={newCase.patient_name} onChange={e => setNewCase(p => ({...p, patient_name: e.target.value}))} required className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Accident Date *</Label>
                <Input type="date" value={newCase.accident_date} onChange={e => setNewCase(p => ({...p, accident_date: e.target.value}))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Accident State *</Label>
                <Input value={newCase.accident_state} onChange={e => setNewCase(p => ({...p, accident_state: e.target.value}))} placeholder="FL" required className="h-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">SoL Period (days)</Label>
              <Input type="number" value={newCase.sol_period_days} onChange={e => setNewCase(p => ({...p, sol_period_days: Number(e.target.value)}))} className="h-10" />
              <p className="text-xs text-muted-foreground">FL/TX/CA/GA = 730, NY = 1095. Confirm with legal counsel.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone</Label>
                <Input value={newCase.patient_phone} onChange={e => setNewCase(p => ({...p, patient_phone: e.target.value}))} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <Input value={newCase.patient_email} onChange={e => setNewCase(p => ({...p, patient_email: e.target.value}))} className="h-10" />
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
