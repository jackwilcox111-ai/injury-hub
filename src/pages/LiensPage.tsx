import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { SortableHeader } from '@/components/global/SortableHeader';
import { useSortableTable } from '@/hooks/use-sortable-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportToCSV } from '@/lib/csv-export';
import { useState } from 'react';
import { Download, TrendingUp, PieChart, BarChart3, Percent, Search } from 'lucide-react';
import { format } from 'date-fns';

const lienStatuses = ['All', 'Active', 'Reduced', 'Paid', 'Waived'];

export default function LiensPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: liens, isLoading } = useQuery({
    queryKey: ['liens-full'],
    queryFn: async () => {
      const { data } = await supabase.from('liens')
        .select('*, cases!liens_case_id_fkey(id, case_number, patient_name, attorney_id, settlement_estimate, sol_date, sol_period_days, accident_state, status, attorneys!cases_attorney_id_fkey(firm_name)), providers(name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: solAlerts } = useQuery({
    queryKey: ['sol-alerts'],
    queryFn: async () => {
      const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() + 1);
      const { data } = await supabase.from('cases_with_counts')
        .select('id, case_number, patient_name, attorney_id, sol_date, sol_period_days, accident_state, status, attorneys!cases_attorney_id_fkey(firm_name)')
        .lte('sol_date', cutoff.toISOString().split('T')[0])
        .not('sol_date', 'is', null)
        .order('sol_date', { ascending: true });
      return data || [];
    },
  });

  const filtered = statusFilter === 'All' ? liens : liens?.filter(l => l.status === statusFilter);
  const activeLiens = liens?.filter(l => l.status === 'Active' || l.status === 'Reduced') || [];
  const totalExposure = activeLiens.reduce((sum, l) => sum + (l.amount - l.reduction_amount), 0);
  const settledCases = new Set((liens || []).filter(l => (l as any).cases?.status === 'Settled').map(l => (l as any).cases?.id));
  const reductions = (liens || []).filter(l => l.reduction_amount > 0);
  const avgReduction = reductions.length > 0 ? reductions.reduce((sum, l) => sum + (l.reduction_amount / (l.amount || 1)), 0) / reductions.length : 0;

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Liens & Settlements</h2><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Liens & Settlements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{liens?.length || 0} total liens</p>
        </div>
        <Button variant="outline" onClick={() => exportToCSV(filtered?.map(l => ({
          case_number: (l as any).cases?.case_number, patient: (l as any).cases?.patient_name,
          provider: (l as any).providers?.name, amount: l.amount, reduction: l.reduction_amount,
          net: l.amount - l.reduction_amount, status: l.status,
        })) || [], 'carelink-liens.csv')}>
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Total Lien Exposure', value: `$${totalExposure.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Active Liens', value: activeLiens.length, icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
          { label: 'Cases Settled', value: settledCases.size, icon: PieChart, color: 'text-violet-600 bg-violet-50' },
          { label: 'Avg Reduction Rate', value: `${(avgReduction * 100).toFixed(1)}%`, icon: Percent, color: 'text-amber-600 bg-amber-50' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-[18px] h-[18px]" /></div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {lienStatuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>{s}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Lien</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Reduction</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Net</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">SoL</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered?.map(l => (
              <tr key={l.id} className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/cases/${(l as any).cases?.id}`)}>
                <td className="px-5 py-3.5 font-mono text-xs text-primary font-medium">{(l as any).cases?.case_number}</td>
                <td className="px-5 py-3.5 text-xs font-medium">{(l as any).cases?.patient_name}</td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground">{(l as any).providers?.name || '—'}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-emerald-600 tabular-nums">${l.amount.toLocaleString()}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-amber-600 tabular-nums">${l.reduction_amount.toLocaleString()}</td>
                <td className="px-5 py-3.5 font-mono text-xs font-medium tabular-nums">${(l.amount - l.reduction_amount).toLocaleString()}</td>
                <td className="px-5 py-3.5"><SoLCountdown sol_date={(l as any).cases?.sol_date} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
            {(!filtered || filtered.length === 0) && (
              <tr><td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">No liens recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SoL Alerts */}
      {solAlerts && solAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Statute of Limitations Alerts</h3>
            <span className="text-[10px] text-muted-foreground">Automated email alerts coming in Phase 2</span>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Attorney</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Deadline</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Days</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {solAlerts.map(c => {
                  const days = c.sol_date ? Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000) : 999;
                  return (
                    <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className={`cursor-pointer hover:bg-accent/50 transition-colors ${days < 180 ? 'bg-red-50/50' : days < 365 ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-primary font-medium">{c.case_number}</td>
                      <td className="px-5 py-3 text-xs font-medium">{c.patient_name}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{(c as any).attorneys?.firm_name || '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs">{c.sol_date ? format(new Date(c.sol_date), 'MMM d, yyyy') : '—'}</td>
                      <td className="px-5 py-3"><SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} /></td>
                      <td className="px-5 py-3"><StatusBadge status={c.status || ''} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
