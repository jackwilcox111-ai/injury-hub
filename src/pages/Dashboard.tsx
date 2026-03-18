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
import { AlertTriangle, TrendingUp, Stethoscope, FolderOpen, Plus, ArrowRight, Phone, Clock, FileWarning, Scale, Timer } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, differenceInCalendarDays } from 'date-fns';
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
        .neq('status', 'Settled')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: pendingRecords } = useQuery({
    queryKey: ['dashboard-pending-records'],
    queryFn: async () => {
      const { data } = await supabase
        .from('records')
        .select('*, cases!records_case_id_fkey(case_number, patient_name, status, attorney_id, attorneys!cases_attorney_id_fkey(firm_name)), providers!records_provider_id_fkey(name)')
        .is('received_date', null)
        .order('created_at', { ascending: true })
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

  const activeCases = cases || [];
  const totalLien = activeCases.reduce((sum, c) => sum + (c.lien_amount || 0), 0);
  const flaggedCases = activeCases.filter(c => c.flag);
  const intakeCases = activeCases.filter(c => c.status === 'Intake');
  const inTreatment = activeCases.filter(c => c.status === 'In Treatment');

  // SoL Alerts: cases with SoL date within 180 days
  const now = new Date();
  const solAlertCases = activeCases
    .filter(c => {
      if (!c.sol_date) return false;
      const daysLeft = differenceInCalendarDays(new Date(c.sol_date), now);
      return daysLeft > 0 && daysLeft <= 180;
    })
    .sort((a, b) => {
      const dA = differenceInCalendarDays(new Date(a.sol_date!), now);
      const dB = differenceInCalendarDays(new Date(b.sol_date!), now);
      return dA - dB;
    });

  // Stale cases: no update in 14+ days, not settled
  const staleCases = activeCases
    .filter(c => {
      if (!c.updated_at) return true;
      return differenceInDays(now, new Date(c.updated_at)) >= 14;
    })
    .sort((a, b) => {
      const dA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dA - dB; // oldest first
    });

  const getSolTier = (solDate: string) => {
    const days = differenceInCalendarDays(new Date(solDate), now);
    if (days <= 30) return { label: 'CRITICAL', color: 'bg-red-100 text-red-700 border-red-200' };
    if (days <= 60) return { label: 'HIGH', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (days <= 90) return { label: 'WARNING', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'MONITOR', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  };

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
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  // Shared table row renderer
  const renderCaseRow = (c: any, extra?: React.ReactNode) => (
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
      <td className="px-5 py-3.5 text-muted-foreground text-xs">{c.attorneys?.firm_name || '—'}</td>
      <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={c.status || ''} /></td>
      {isAdmin && <td className="px-5 py-3.5"><FinancialValue value={c.lien_amount} /></td>}
      <td className="px-5 py-3.5">
        <SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} />
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">{c.flag ? <FlagBadge flag={c.flag} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
      {extra}
    </tr>
  );

  const colgroup = (extraCols: number) => (
    <colgroup>
      <col className="w-[120px]" />
      <col className="w-[180px]" />
      <col className="w-[160px]" />
      <col className="w-[120px]" />
      {isAdmin && <col className="w-[80px]" />}
      <col className="w-[70px]" />
      <col className="w-[120px]" />
      {Array.from({ length: extraCols }).map((_, i) => <col key={i} />)}
    </colgroup>
  );

  const tableHeaders = (extras: string[]) => (
    <thead>
      <tr className="border-b border-border bg-accent/50">
        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Attorney</th>
        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
        {isAdmin && <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Lien</th>}
        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">SoL</th>
        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Alert</th>
        {extras.map(h => (
          <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
        ))}
      </tr>
    </thead>
  );

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

        <div className={`bg-card border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow ${solAlertCases.length > 0 ? 'border-orange-200 bg-orange-50/30' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${solAlertCases.length > 0 ? 'bg-orange-100' : 'bg-emerald-50'}`}>
              <Timer className={`w-[18px] h-[18px] ${solAlertCases.length > 0 ? 'text-orange-600' : 'text-emerald-600'}`} />
            </div>
            {solAlertCases.length > 0 && <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">At risk</span>}
          </div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{solAlertCases.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">SoL Approaching</p>
        </div>

        <div className={`bg-card border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow ${flaggedCases.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${flaggedCases.length > 0 ? 'bg-red-100' : 'bg-emerald-50'}`}>
              <AlertTriangle className={`w-[18px] h-[18px] ${flaggedCases.length > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            {flaggedCases.length > 0 && <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Action needed</span>}
          </div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{flaggedCases.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Flagged Cases</p>
        </div>
      </div>

      {/* Section 1: SoL Countdown Alerts */}
      {solAlertCases.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Timer className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-foreground">Statute of Limitations — Approaching Deadlines</h3>
            <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium ml-1">{solAlertCases.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {colgroup(1)}
              {tableHeaders(['Urgency'])}
              <tbody className="divide-y divide-border">
                {solAlertCases.map(c => {
                  const tier = getSolTier(c.sol_date!);
                  return renderCaseRow(c,
                    <td key="urgency" className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tier.color}`}>{tier.label}</span>
                    </td>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Cases Requiring Attention (flagged) */}
      {flaggedCases.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">Cases Requiring Attention</h3>
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium ml-1">{flaggedCases.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {colgroup(1)}
              {tableHeaders(['Progress'])}
              <tbody className="divide-y divide-border">
                {flaggedCases.map(c => renderCaseRow(c,
                  <td key="progress" className="px-5 py-3.5">
                    <ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} />
                  </td>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Stale / Inactive Cases */}
      {staleCases.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Stale Cases — No Activity in 14+ Days</h3>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium ml-1">{staleCases.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {colgroup(1)}
              {tableHeaders(['Inactive'])}
              <tbody className="divide-y divide-border">
                {staleCases.map(c => {
                  const stale = getStaleLabel(c.updated_at);
                  return renderCaseRow(c,
                    <td key="inactive" className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        stale.days >= 30 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>{stale.label}</span>
                    </td>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Pending Records & Liens */}
      {((pendingRecords && pendingRecords.length > 0) || (unpaidLiens && unpaidLiens.length > 0)) && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">Pending Records & Outstanding Liens</h3>
          </div>

          {/* Pending Records */}
          {pendingRecords && pendingRecords.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-accent/30 border-b border-border flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Awaiting Records</span>
                <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium">{pendingRecords.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-[110px]" />
                    <col className="w-[170px]" />
                    <col className="w-[160px]" />
                    <col className="w-[140px]" />
                    <col className="w-[140px]" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-accent/50">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Case</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Patient</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Record Type</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Requested</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Waiting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingRecords.map((r: any) => (
                      <tr
                        key={r.id}
                        onClick={() => r.case_id && navigate(`/cases/${r.case_id}`)}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-primary font-medium">{r.cases?.case_number || '—'}</td>
                        <td className="px-5 py-3 text-sm text-foreground">{r.cases?.patient_name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{r.providers?.name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{r.record_type || '—'}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : '—'}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {r.created_at && (() => {
                            const days = differenceInDays(now, new Date(r.created_at));
                            return (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                days >= 30 ? 'bg-red-100 text-red-700 border-red-200' :
                                days >= 14 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-muted text-muted-foreground border-border'
                              }`}>{days}d</span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Outstanding Liens */}
          {isAdmin && unpaidLiens && unpaidLiens.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-accent/30 border-b border-border flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outstanding Liens</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{unpaidLiens.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-[110px]" />
                    <col className="w-[170px]" />
                    <col className="w-[160px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-accent/50">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Case</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Patient</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Lien Amount</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Reduction</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unpaidLiens.map((l: any) => (
                      <tr
                        key={l.id}
                        onClick={() => l.case_id && navigate(`/cases/${l.case_id}`)}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-primary font-medium">{l.cases?.case_number || '—'}</td>
                        <td className="px-5 py-3 text-sm text-foreground">{l.cases?.patient_name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{l.providers?.name || '—'}</td>
                        <td className="px-5 py-3"><FinancialValue value={l.amount} /></td>
                        <td className="px-5 py-3"><FinancialValue value={l.reduction_amount} /></td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {l.created_at ? formatDistanceToNow(new Date(l.created_at), { addSuffix: true }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {activeCases.length === 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card p-16 text-center">
          <p className="text-muted-foreground text-sm">No active cases found. Create your first case to get started.</p>
        </div>
      )}
    </div>
  );
}
