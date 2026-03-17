import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ColossusScoreBadge } from '@/components/global/ColossusScoreBadge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { FileSignature, Plus, Eye, Pencil } from 'lucide-react';

export function DemandLettersTab({ caseId, onGenerate }: { caseId: string; onGenerate?: () => void }) {
  const { data: letters, isLoading } = useQuery({
    queryKey: ['demand-letters', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('demand_letters')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statusColor: Record<string, string> = {
    Draft: 'bg-indigo-100 text-indigo-700',
    Reviewed: 'bg-amber-100 text-amber-700',
    Finalized: 'bg-emerald-100 text-emerald-700',
    Sent: 'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-primary" /> Demand Letters
        </h3>
        {onGenerate && (
          <Button size="sm" className="h-8 text-xs" onClick={onGenerate}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Generate New Letter
          </Button>
        )}
      </div>

      {letters.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No demand letters generated yet</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Version</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Total Demand</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Colossus</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {letters.map(l => (
                <tr key={l.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">v{l.version}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] ${statusColor[l.status] || ''}`}>{l.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                    {l.total_demand != null ? `$${Number(l.total_demand).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {l.colossus_score != null ? <ColossusScoreBadge score={l.colossus_score} /> : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {l.created_at ? formatDistanceToNow(new Date(l.created_at), { addSuffix: true }) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
