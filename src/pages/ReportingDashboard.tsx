import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { exportToCSV } from '@/lib/csv-export';
import { toast } from 'sonner';
import { BarChart3, Download, FolderOpen, DollarSign, Scale, Stethoscope, Users, AlertTriangle } from 'lucide-react';

type ReportType = 'case_volume' | 'financial' | 'attorney_performance' | 'provider_performance' | 'care_manager' | 'sol_risk';

const REPORTS: { value: ReportType; label: string; icon: any }[] = [
  { value: 'case_volume', label: 'Case Volume', icon: FolderOpen },
  { value: 'financial', label: 'Lien & Financial', icon: DollarSign },
  { value: 'attorney_performance', label: 'Attorney Performance', icon: Scale },
  { value: 'provider_performance', label: 'Provider Performance', icon: Stethoscope },
  { value: 'care_manager', label: 'Care Manager Activity', icon: Users },
  { value: 'sol_risk', label: 'SoL Risk Report', icon: AlertTriangle },
];

export default function ReportingDashboard() {
  const { profile } = useAuth();
  const [report, setReport] = useState<ReportType>('case_volume');

  const { data: cases } = useQuery({
    queryKey: ['reporting-cases'],
    queryFn: async () => {
      const { data } = await supabase.from('cases_with_counts')
        .select('*, attorneys!cases_attorney_id_fkey(firm_name), providers!cases_provider_id_fkey(name)');
      return data || [];
    },
  });

  const { data: charges } = useQuery({
    queryKey: ['reporting-charges'],
    queryFn: async () => {
      const { data } = await supabase.from('charges').select('*, providers(name)');
      return data || [];
    },
  });

  const { data: solAlerts } = useQuery({
    queryKey: ['reporting-sol-alerts'],
    queryFn: async () => {
      const { data } = await supabase.from('sol_alerts').select('*, cases!sol_alerts_case_id_fkey(case_number, patient_name)');
      return data || [];
    },
  });

  const handleExport = (data: any[], filename: string) => {
    if (!data?.length) { toast.error('No data to export'); return; }
    exportToCSV(data, filename);
    toast.success('CSV exported');
  };

  // Case Volume Report
  const statusCounts = cases?.reduce((acc: any, c: any) => {
    acc[c.status || 'Unknown'] = (acc[c.status || 'Unknown'] || 0) + 1;
    return acc;
  }, {}) || {};

  const stateCounts = cases?.reduce((acc: any, c: any) => {
    const state = c.accident_state || 'Unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {}) || {};

  // Financial Report
  const totalLien = cases?.reduce((s: number, c: any) => s + Number(c.lien_amount || 0), 0) || 0;
  const totalSettlement = cases?.reduce((s: number, c: any) => s + Number(c.settlement_final || c.settlement_estimate || 0), 0) || 0;
  const totalCharges = charges?.reduce((s: number, c: any) => s + Number(c.charge_amount || 0), 0) || 0;

  // Attorney Performance
  const attorneyStats = cases?.reduce((acc: any, c: any) => {
    const firm = (c as any).attorneys?.firm_name || 'Unassigned';
    if (!acc[firm]) acc[firm] = { cases: 0, settled: 0, lien: 0 };
    acc[firm].cases++;
    if (c.status === 'Settled') acc[firm].settled++;
    acc[firm].lien += Number(c.lien_amount || 0);
    return acc;
  }, {}) || {};

  // Provider Performance
  const providerStats = cases?.reduce((acc: any, c: any) => {
    const name = (c as any).providers?.name || 'Unassigned';
    if (!acc[name]) acc[name] = { cases: 0, completed: 0, total: 0 };
    acc[name].cases++;
    acc[name].completed += c.appointments_completed || 0;
    acc[name].total += c.appointments_total || 0;
    return acc;
  }, {}) || {};

  // SoL Risk
  const solRiskCases = cases?.filter((c: any) => {
    if (!c.sol_date || c.status === 'Settled') return false;
    const days = Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000);
    return days <= 365;
  }).sort((a: any, b: any) => new Date(a.sol_date).getTime() - new Date(b.sol_date).getTime()) || [];

  const ActiveIcon = REPORTS.find(r => r.value === report)?.icon || BarChart3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Analytics and reporting across your portfolio.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={report} onValueChange={v => setReport(v as ReportType)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{REPORTS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Case Volume */}
      {report === 'case_volume' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Case Volume Report</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleExport(cases || [], 'case-volume')}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-foreground tabular-nums">{count as number}</p>
                <p className="text-xs text-muted-foreground mt-1">{status}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-xs font-semibold text-foreground mb-3">By State</h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(stateCounts).sort((a: any, b: any) => b[1] - a[1]).map(([state, count]) => (
                <div key={state} className="flex justify-between text-xs p-2 bg-accent/30 rounded-lg">
                  <span className="text-foreground font-medium">{state}</span>
                  <span className="font-mono-data tabular-nums">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial */}
      {report === 'financial' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Lien & Financial Report</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleExport(charges || [], 'financial')}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-3xl font-bold font-mono-data text-foreground tabular-nums">${totalLien.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Lien Exposure</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-3xl font-bold font-mono-data text-foreground tabular-nums">${totalSettlement.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Settlement Value</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-3xl font-bold font-mono-data text-foreground tabular-nums">${totalCharges.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Charges</p>
            </div>
          </div>
        </div>
      )}

      {/* Attorney Performance */}
      {report === 'attorney_performance' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Scale className="w-4 h-4" /> Attorney Performance</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleExport(Object.entries(attorneyStats).map(([firm, s]: any) => ({ firm, ...s })), 'attorney-performance')}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Firm</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Cases</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Settled</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Total Lien</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {Object.entries(attorneyStats).sort((a: any, b: any) => b[1].cases - a[1].cases).map(([firm, s]: any) => (
                  <tr key={firm} className="hover:bg-accent/30">
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{firm}</td>
                    <td className="px-5 py-3 text-right font-mono-data tabular-nums">{s.cases}</td>
                    <td className="px-5 py-3 text-right font-mono-data tabular-nums text-emerald-600">{s.settled}</td>
                    <td className="px-5 py-3 text-right font-mono-data tabular-nums">${s.lien.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provider Performance */}
      {report === 'provider_performance' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Provider Performance</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleExport(Object.entries(providerStats).map(([name, s]: any) => ({ name, ...s })), 'provider-performance')}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Cases</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Appts Completed</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Completion %</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {Object.entries(providerStats).sort((a: any, b: any) => b[1].cases - a[1].cases).map(([name, s]: any) => (
                  <tr key={name} className="hover:bg-accent/30">
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{name}</td>
                    <td className="px-5 py-3 text-right font-mono-data tabular-nums">{s.cases}</td>
                    <td className="px-5 py-3 text-right font-mono-data tabular-nums">{s.completed}/{s.total}</td>
                    <td className="px-5 py-3 text-right font-mono-data tabular-nums">{s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SoL Risk */}
      {report === 'sol_risk' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> SoL Risk Report</h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleExport(solRiskCases, 'sol-risk')}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">State</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">SoL Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Days Left</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {solRiskCases.map((c: any) => {
                  const days = Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000);
                  return (
                    <tr key={c.id} className="hover:bg-accent/30">
                      <td className="px-5 py-3 font-mono-data text-xs text-primary">{c.case_number}</td>
                      <td className="px-5 py-3 text-sm font-medium text-foreground">{c.patient_name}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{c.accident_state}</td>
                      <td className="px-5 py-3 font-mono-data text-xs">{c.sol_date}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-mono-data text-sm font-bold tabular-nums ${days <= 30 ? 'text-red-600' : days <= 90 ? 'text-orange-600' : days <= 180 ? 'text-amber-600' : 'text-foreground'}`}>
                          {days}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{c.status}</td>
                    </tr>
                  );
                })}
                {solRiskCases.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">No cases with SoL risk within 365 days</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Care Manager Activity (placeholder) */}
      {report === 'care_manager' && (
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Care Manager Activity</h3>
          <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-xl">
            Activity tracking across case updates, check-ins logged, and task completions. Data populates as care managers interact with cases.
          </div>
        </div>
      )}
    </div>
  );
}
