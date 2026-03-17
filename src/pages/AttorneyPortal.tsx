import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { ProgressBar } from '@/components/global/ProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { useState } from 'react';
import { Shield, FileText, Activity } from 'lucide-react';

export default function AttorneyPortal() {
  const { profile } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { data: cases, isLoading } = useQuery({
    queryKey: ['attorney-portal-cases'],
    queryFn: async () => {
      const { data } = await supabase.from('cases_with_counts')
        .select('*, providers!cases_provider_id_fkey(name)')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: demandReport } = useQuery({
    queryKey: ['attorney-demand', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('ai_summaries')
        .select('*')
        .eq('case_id', selectedCaseId!)
        .eq('summary_type', 'demand_readiness')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: chronology } = useQuery({
    queryKey: ['attorney-chronology', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('ai_summaries')
        .select('*')
        .eq('case_id', selectedCaseId!)
        .eq('summary_type', 'medical_chronology')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: insuranceData } = useQuery({
    queryKey: ['attorney-insurance', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('insurance_eligibility')
        .select('*')
        .eq('case_id', selectedCaseId!)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-xl">Your Cases</h2><Skeleton className="h-96 rounded" /></div>;

  const selectedCase = cases?.find(c => c.id === selectedCaseId);

  const readinessScore = demandReport?.readiness_score ?? null;
  const readinessContent = demandReport?.content as any;
  const chronologyContent = chronology?.content as any;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Attorney Portal</h2>
      <p className="text-sm text-muted-foreground">Read-only view of your firm's cases. Click a case to see AI reports.</p>

      <div className="bg-card border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Case #</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Billing</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">SoL</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Progress</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Readiness</th>
          </tr></thead>
          <tbody>
            {cases?.map((c, i) => (
              <tr
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`border-b border-border cursor-pointer transition-colors ${selectedCaseId === c.id ? 'bg-primary/5' : i % 2 === 1 ? 'bg-card' : 'bg-background'} hover:bg-accent/30`}
              >
                <td className="px-4 py-3 font-mono text-xs text-primary">{c.case_number}</td>
                <td className="px-4 py-3 text-foreground">{c.patient_name}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status || ''} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">—</td>
                <td className="px-4 py-3"><SoLCountdown sol_date={c.sol_date} /></td>
                <td className="px-4 py-3"><ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} /></td>
                <td className="px-4 py-3 text-xs font-mono">—</td>
              </tr>
            ))}
            {(!cases || cases.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No cases found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCaseId && selectedCase && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">{selectedCase.patient_name} — {selectedCase.case_number}</h3>
            {insuranceData && (
              <Badge variant={insuranceData.billing_path === 'PIP/MedPay' ? 'default' : 'secondary'} className="gap-1">
                <Shield className="w-3 h-3" />
                {insuranceData.billing_path}
              </Badge>
            )}
          </div>

          <Tabs defaultValue="demand">
            <TabsList>
              <TabsTrigger value="demand" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Demand Readiness</TabsTrigger>
              <TabsTrigger value="chronology" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Medical Chronology</TabsTrigger>
            </TabsList>

            <TabsContent value="demand" className="mt-4 space-y-4">
              {readinessContent ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-bold font-mono ${
                      (readinessScore ?? 0) >= 80 ? 'text-emerald-600' :
                      (readinessScore ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {readinessScore}/100
                    </div>
                    <Badge variant={(readinessScore ?? 0) >= 80 ? 'default' : 'secondary'}>
                      {(readinessScore ?? 0) >= 80 ? 'Ready for Demand' : (readinessScore ?? 0) >= 50 ? 'Needs Work' : 'Not Ready'}
                    </Badge>
                  </div>
                  {readinessContent.checklist && (
                    <div className="space-y-2">
                      {readinessContent.checklist.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={item.met ? 'text-emerald-600' : 'text-red-500'}>{item.met ? '✓' : '✗'}</span>
                          <span className="text-foreground">{item.item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {readinessContent.recommendation && (
                    <p className="text-sm text-muted-foreground bg-accent/50 rounded-lg p-3">{readinessContent.recommendation}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">Generated {demandReport?.created_at ? formatDistanceToNow(new Date(demandReport.created_at), { addSuffix: true }) : ''}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No demand readiness report generated yet. Ask your care manager to run one.</p>
              )}
            </TabsContent>

            <TabsContent value="chronology" className="mt-4 space-y-4">
              {chronologyContent ? (
                <>
                  {chronologyContent.summary && (
                    <p className="text-sm text-muted-foreground bg-accent/50 rounded-lg p-3">{chronologyContent.summary}</p>
                  )}
                  {chronologyContent.entries && (
                    <div className="space-y-2">
                      {chronologyContent.entries.map((entry: any, i: number) => (
                        <div key={i} className="flex gap-3 text-sm border-b border-border pb-2">
                          <span className="font-mono text-xs text-primary whitespace-nowrap">{entry.date}</span>
                          <span className="text-foreground">{entry.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">Generated {chronology?.created_at ? formatDistanceToNow(new Date(chronology.created_at), { addSuffix: true }) : ''}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No medical chronology generated yet. Ask your care manager to run one.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
