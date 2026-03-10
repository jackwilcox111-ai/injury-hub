import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { ProgressBar } from '@/components/global/ProgressBar';
import { FlagBadge } from '@/components/global/FlagBadge';
import { FinancialValue } from '@/components/global/FinancialValue';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const { data: cases, isLoading } = useQuery({
    queryKey: ['dashboard-cases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases_with_counts')
        .select('*, attorneys!cases_attorney_id_fkey(firm_name)')
        .order('updated_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: providerCount } = useQuery({
    queryKey: ['provider-count'],
    queryFn: async () => {
      const { count } = await supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'Active');
      return count || 0;
    },
  });

  const activeCases = cases?.filter(c => c.status !== 'Settled') || [];
  const totalLien = activeCases.reduce((sum, c) => sum + (c.lien_amount || 0), 0);
  const flaggedCases = cases?.filter(c => c.flag) || [];

  const kpis = [
    { label: 'Active Cases', value: activeCases.length, color: 'bg-primary' },
    ...(isAdmin ? [{ label: 'Total Lien Exposure', value: `$${totalLien.toLocaleString()}`, color: 'bg-success' }] : []),
    { label: 'Network Providers', value: providerCount || 0, color: 'bg-settled' },
    { label: 'Alerts', value: flaggedCases.length, color: flaggedCases.length > 0 ? 'bg-destructive' : 'bg-success' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-xl">Dashboard</h2>
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded" />)}
        </div>
        <Skeleton className="h-96 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Dashboard</h2>

      {/* KPI Cards */}
      <div className={`grid gap-6 ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${kpi.color}`} />
            <p className="text-muted-foreground text-xs font-mono uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-mono font-medium text-foreground mt-2">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Alert Banner */}
      {flaggedCases.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-medium text-foreground">Active Alerts</h3>
          </div>
          <div className="space-y-1">
            {flaggedCases.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="w-full flex items-center justify-between py-1.5 px-2 rounded text-left hover:bg-destructive/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">{c.case_number}</span>
                  <span className="text-sm text-foreground">{c.patient_name}</span>
                </div>
                <FlagBadge flag={c.flag} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Cases Table */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Recent Cases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">Case ID</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">Attorney</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">Status</th>
                {isAdmin && <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">Lien</th>}
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">SoL</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase">Updated</th>
              </tr>
            </thead>
            <tbody>
              {cases?.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className={`border-b border-border cursor-pointer hover:bg-secondary/50 transition-colors ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-primary">{c.case_number}</td>
                  <td className="px-4 py-3 text-foreground">{c.patient_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{(c as any).attorneys?.firm_name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status || ''} /></td>
                  {isAdmin && <td className="px-4 py-3"><FinancialValue value={c.lien_amount} /></td>}
                  <td className="px-4 py-3">
                    <SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} />
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              ))}
              {(!cases || cases.length === 0) && (
                <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-muted-foreground text-sm">No cases found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
