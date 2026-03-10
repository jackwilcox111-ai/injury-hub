import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/csv-export';
import { useState } from 'react';
import { Download } from 'lucide-react';
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

  // Aggregate calcs
  const activeLiens = liens?.filter(l => l.status === 'Active' || l.status === 'Reduced') || [];
  const totalExposure = activeLiens.reduce((sum, l) => sum + (l.amount - l.reduction_amount), 0);
  const settledCases = liens?.filter(l => (l as any).cases?.status === 'Settled') || [];
  const reductions = liens?.filter(l => l.reduction_amount > 0) || [];
  const avgReduction = reductions.length > 0 ? reductions.reduce((sum, l) => sum + (l.reduction_amount / (l.amount || 1)), 0) / reductions.length : 0;

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-xl">Liens & Settlements</h2><Skeleton className="h-96 rounded" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Liens & Settlements</h2>
        <Button size="sm" variant="outline" onClick={() => exportToCSV(filtered?.map(l => ({
          case_number: (l as any).cases?.case_number, patient: (l as any).cases?.patient_name,
          provider: (l as any).providers?.name, amount: l.amount, reduction: l.reduction_amount,
          net: l.amount - l.reduction_amount, status: l.status,
        })) || [], 'ghin-liens.csv')}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-success" />
          <p className="text-muted-foreground text-xs font-mono uppercase">Total Lien Exposure</p>
          <p className="text-2xl font-mono text-foreground mt-2">${totalExposure.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />
          <p className="text-muted-foreground text-xs font-mono uppercase">Est. Settlement Pool</p>
          <p className="text-2xl font-mono text-foreground mt-2">—</p>
        </div>
        <div className="bg-card border border-border rounded p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-settled" />
          <p className="text-muted-foreground text-xs font-mono uppercase">Cases Settled</p>
          <p className="text-2xl font-mono text-foreground mt-2">{new Set(settledCases.map(l => (l as any).cases?.id)).size}</p>
        </div>
        <div className="bg-card border border-border rounded p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-warning" />
          <p className="text-muted-foreground text-xs font-mono uppercase">Avg Lien Reduction</p>
          <p className="text-2xl font-mono text-foreground mt-2">{(avgReduction * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {lienStatuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-mono rounded ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Lien Register Table */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Case</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Provider</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Lien Amt</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Reduction</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Net Lien</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">SoL</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Status</th>
          </tr></thead>
          <tbody>
            {filtered?.map((l, i) => (
              <tr key={l.id} className={`border-b border-border hover:bg-secondary/50 cursor-pointer ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`} onClick={() => navigate(`/cases/${(l as any).cases?.id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-primary">{(l as any).cases?.case_number}</td>
                <td className="px-4 py-3 text-xs">{(l as any).cases?.patient_name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{(l as any).providers?.name || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-success">${l.amount.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-warning">${l.reduction_amount.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-primary">${(l.amount - l.reduction_amount).toLocaleString()}</td>
                <td className="px-4 py-3"><SoLCountdown sol_date={(l as any).cases?.sol_date} /></td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
            {(!filtered || filtered.length === 0) && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No liens recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SoL Alerts */}
      {solAlerts && solAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Statute of Limitations Alerts</h3>
          <p className="text-[10px] text-muted-foreground">Automated email alerts coming in Phase 2.</p>
          <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Case</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Attorney</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Deadline</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Days</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {solAlerts.map((c, i) => {
                  const days = c.sol_date ? Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000) : 999;
                  const rowBg = days < 180 ? 'bg-destructive/5' : days < 365 ? 'bg-warning/5' : '';
                  return (
                    <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className={`border-b border-border cursor-pointer hover:bg-secondary/50 ${rowBg}`}>
                      <td className="px-4 py-2 font-mono text-xs text-primary">{c.case_number}</td>
                      <td className="px-4 py-2 text-xs">{c.patient_name}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{(c as any).attorneys?.firm_name || '—'}</td>
                      <td className="px-4 py-2 font-mono text-xs">{c.sol_date ? format(new Date(c.sol_date), 'MMM d, yyyy') : '—'}</td>
                      <td className="px-4 py-2"><SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} /></td>
                      <td className="px-4 py-2"><StatusBadge status={c.status || ''} /></td>
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
