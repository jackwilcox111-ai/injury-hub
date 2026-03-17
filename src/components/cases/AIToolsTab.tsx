import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Brain, FileText, BarChart3, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface AIToolsTabProps {
  caseId: string;
  caseData: any;
  records: any[];
  appointments: any[];
  liens: any[];
}

export function AIToolsTab({ caseId, caseData, records, appointments, liens }: AIToolsTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: summaries } = useQuery({
    queryKey: ['ai-summaries', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('ai_summaries')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const chronology = summaries?.find((s: any) => s.summary_type === 'medical_chronology');
  const demandReport = summaries?.find((s: any) => s.summary_type === 'demand_readiness');

  const generateSummary = async (type: string) => {
    setGenerating(type);
    try {
      const { data, error } = await supabase.functions.invoke('ai-case-analysis', {
        body: {
          case_id: caseId,
          summary_type: type,
          case_data: {
            patient_name: caseData?.patient_name,
            specialty: caseData?.specialty,
            accident_date: caseData?.accident_date,
            accident_state: caseData?.accident_state,
            status: caseData?.status,
            sol_date: caseData?.sol_date,
            lien_amount: caseData?.lien_amount,
            settlement_estimate: caseData?.settlement_estimate,
            records_count: records?.length || 0,
            records_types: records?.map((r: any) => r.record_type).filter(Boolean),
            appointments_total: appointments?.length || 0,
            appointments_completed: appointments?.filter((a: any) => a.status === 'Completed').length || 0,
            liens_total: liens?.reduce((s: number, l: any) => s + Number(l.amount || 0), 0) || 0,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ['ai-summaries', caseId] });
      toast.success(`${type === 'medical_chronology' ? 'Medical Chronology' : 'Demand Readiness Report'} generated`);
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const readinessColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const readinessBadge = (score: number) => {
    if (score >= 80) return { label: 'Ready', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (score >= 50) return { label: 'Almost Ready', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Not Ready', color: 'bg-red-50 text-red-700 border-red-200' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Case Tools</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Medical Chronology */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-foreground">Medical Chronology</h4>
            </div>
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => generateSummary('medical_chronology')}
              disabled={generating === 'medical_chronology'}
            >
              {generating === 'medical_chronology' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : chronology ? 'Regenerate' : 'Generate'}
            </Button>
          </div>
          {chronology ? (
            <div className="text-xs text-muted-foreground space-y-2 max-h-64 overflow-y-auto">
              {((chronology.content as any)?.entries || []).map((entry: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="font-mono-data text-primary shrink-0">{entry.date || '—'}</span>
                  <span>{entry.description}</span>
                </div>
              ))}
              {((chronology.content as any)?.summary) && (
                <p className="pt-2 border-t border-border text-foreground">{(chronology.content as any).summary}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Generates a timeline of medical events from case records and appointments.</p>
          )}
        </div>

        {/* Demand Readiness Report */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-600" />
              <h4 className="text-sm font-semibold text-foreground">Demand Readiness</h4>
            </div>
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => generateSummary('demand_readiness')}
              disabled={generating === 'demand_readiness'}
            >
              {generating === 'demand_readiness' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : demandReport ? 'Regenerate' : 'Generate'}
            </Button>
          </div>
          {demandReport ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold font-mono-data tabular-nums ${readinessColor(demandReport.readiness_score || 0)}`}>
                  {demandReport.readiness_score}
                </span>
                <div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${readinessBadge(demandReport.readiness_score || 0).color}`}>
                    {readinessBadge(demandReport.readiness_score || 0).label}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">out of 100</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1.5 max-h-48 overflow-y-auto">
                {((demandReport.content as any)?.checklist || []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.met ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span>{item.item}</span>
                  </div>
                ))}
                {((demandReport.content as any)?.recommendation) && (
                  <p className="pt-2 border-t border-border text-foreground">{(demandReport.content as any).recommendation}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Analyzes case readiness for demand with a 0–100 score and action checklist.</p>
          )}
        </div>
      </div>
    </div>
  );
}
