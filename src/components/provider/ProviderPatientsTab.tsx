import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUp, ArrowDown, Phone, Calendar, DollarSign, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const STATUS_FILTERS = ['All', 'Intake', 'Referrals Sent', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];

type SortField = 'patient_name' | 'updated_at' | 'lien_amount' | 'status' | 'case_number';
type SortDir = 'asc' | 'desc';

export function ProviderPatientsTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: cases, isLoading } = useQuery({
    queryKey: ['provider-patients-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases')
        .select('id, case_number, patient_name, patient_phone, patient_email, status, specialty, opened_date, accident_date, lien_amount, updated_at, sol_date, attorneys!cases_attorney_id_fkey(firm_name)')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ['provider-patient-appointments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('case_id, status, scheduled_date')
        .order('scheduled_date', { ascending: false });
      return data || [];
    },
  });

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

  const filtered = useMemo(() => {
    let result = cases || [];
    if (statusFilter !== 'All') {
      result = result.filter(c => c.status === statusFilter);
    }
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
  }, [cases, search, statusFilter]);

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

  const totalPatients = cases?.length || 0;
  const inTreatment = cases?.filter(c => c.status === 'In Treatment').length || 0;
  const totalLien = cases?.reduce((sum, c) => sum + (c.lien_amount || 0), 0) || 0;
  const scheduledAppts = appointments?.filter(a => a.status === 'Scheduled').length || 0;

  const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'patient_name', label: 'Patient Name' },
    { value: 'case_number', label: 'Case Number' },
    { value: 'lien_amount', label: 'Lien Amount' },
    { value: 'status', label: 'Status' },
  ];

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs font-medium">Total Patients</span>
          </div>
          <p className="text-2xl font-display font-bold tabular-nums">{totalPatients}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium">In Treatment</span>
          </div>
          <p className="text-2xl font-display font-bold tabular-nums">{inTreatment}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium">Upcoming Appts</span>
          </div>
          <p className="text-2xl font-display font-bold tabular-nums">{scheduledAppts}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Total Liens</span>
          </div>
          <p className="text-2xl font-display font-bold tabular-nums">${totalLien.toLocaleString()}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients, case #, phone..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
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
        <span className="text-xs text-muted-foreground ml-auto">{sorted.length} patient{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Patient Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case #</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Visits</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Next Appt</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Lien</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Updated</th>
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
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{c.patient_name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-primary">{c.case_number}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.specialty || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status || ''} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.patient_phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {c.patient_phone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {stats ? `${stats.completed}/${stats.total}` : '0'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {stats?.next ? (
                      <span className="text-primary font-medium">{format(new Date(stats.next), 'MMM d')}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-right tabular-nums">${Number(c.lien_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground text-right whitespace-nowrap">
                    {c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">No patients found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
