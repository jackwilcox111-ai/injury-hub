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
import { AlertTriangle, TrendingUp, Users, Stethoscope, FolderOpen, Plus, ArrowRight, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const { data: cases, isLoading } = useQuery({
    queryKey: ['dashboard-cases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases_with_counts')
        .select('*, attorneys!cases_attorney_id_fkey(firm_name), providers!cases_provider_id_fkey(name)')
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
  const intakeCases = cases?.filter(c => c.status === 'Intake') || [];
  const inTreatment = cases?.filter(c => c.status === 'In Treatment') || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Good morning{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening with your cases today.</p>
        </div>
        <Button onClick={() => navigate('/cases')} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New Case
        </Button>
      </div>

      {/* KPI Cards */}
      <div className={`grid gap-5 ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => navigate('/cases')}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-[18px] h-[18px] text-primary" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{activeCases.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Active Cases</p>
          <div className="flex gap-3 mt-3 text-[11px]">
            <span className="text-blue-600">{intakeCases.length} intake</span>
            <span className="text-emerald-600">{inTreatment.length} treating</span>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => navigate('/liens')}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-[18px] h-[18px] text-emerald-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">${totalLien.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Lien Exposure</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => navigate('/providers')}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <Stethoscope className="w-[18px] h-[18px] text-violet-600" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{providerCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Active Providers</p>
        </div>

        <div className={`bg-card border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow ${flaggedCases.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${flaggedCases.length > 0 ? 'bg-red-100' : 'bg-emerald-50'}`}>
              <AlertTriangle className={`w-[18px] h-[18px] ${flaggedCases.length > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            {flaggedCases.length > 0 && <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Action needed</span>}
          </div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{flaggedCases.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Active Alerts</p>
        </div>
      </div>

      {/* Alert Banner */}
      {flaggedCases.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">Cases Requiring Attention</h3>
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium ml-1">{flaggedCases.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[170px]" />
                <col className="w-[160px]" />
                <col className="w-[110px]" />
                {isAdmin && <col className="w-[70px]" />}
                <col className="w-[60px]" />
                <col className="w-[110px]" />
                <col className="w-[100px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Attorney</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  {isAdmin && <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Lien</th>}
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">SoL</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Alert</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Progress</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flaggedCases.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
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
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{(c as any).attorneys?.firm_name || '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={c.status || ''} /></td>
                    {isAdmin && <td className="px-5 py-3.5"><FinancialValue value={c.lien_amount} /></td>}
                    <td className="px-5 py-3.5">
                      <SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap"><FlagBadge flag={c.flag} /></td>
                    <td className="px-5 py-3.5">
                      <ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Cases Table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent Cases</h3>
          <Button variant="ghost" size="sm" className="text-primary text-xs font-medium gap-1" onClick={() => navigate('/cases')}>
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[110px]" />
              <col className="w-[170px]" />
              <col className="w-[160px]" />
              <col className="w-[110px]" />
              {isAdmin && <col className="w-[70px]" />}
              <col className="w-[60px]" />
              <col className="w-[110px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Attorney</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                {isAdmin && <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Lien</th>}
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">SoL</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Alert</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Progress</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cases?.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-primary font-medium">{c.case_number}</td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.patient_name}</p>
                      {c.patient_phone ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />{c.patient_phone}
                        </span>
                      ) : (
                        <p className="text-xs text-muted-foreground">{c.specialty || ''}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">{(c as any).attorneys?.firm_name || '—'}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={c.status || ''} /></td>
                  {isAdmin && <td className="px-5 py-3.5"><FinancialValue value={c.lien_amount} /></td>}
                  <td className="px-5 py-3.5">
                    <SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} />
                  </td>
                  <td className="px-5 py-3.5">{c.flag ? <FlagBadge flag={c.flag} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-3.5">
                    <ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              ))}
              {(!cases || cases.length === 0) && (
                <tr><td colSpan={isAdmin ? 8 : 7} className="px-5 py-16 text-center text-muted-foreground text-sm">No cases found. Create your first case to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
