import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ColossusScoreBadge } from '@/components/global/ColossusScoreBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { FileSignature } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const statusColor: Record<string, string> = {
  Draft: 'bg-indigo-100 text-indigo-700',
  Reviewed: 'bg-amber-100 text-amber-700',
  Finalized: 'bg-emerald-100 text-emerald-700',
  Sent: 'bg-violet-100 text-violet-700',
};

export default function AdminDemandLetters() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');

  const { data: letters, isLoading } = useQuery({
    queryKey: ['admin-demand-letters'],
    queryFn: async () => {
      const { data } = await supabase.from('demand_letters')
        .select('*, cases!demand_letters_case_id_fkey(case_number, patient_name, attorney_id, attorneys!cases_attorney_id_fkey(firm_name))')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Demand Letters</h2><Skeleton className="h-96 rounded-xl" /></div>;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const drafts = letters?.filter(l => l.status === 'Draft').length || 0;
  const reviewed = letters?.filter(l => l.status === 'Reviewed').length || 0;
  const finalized = letters?.filter(l => l.status === 'Finalized').length || 0;
  const sentThisMonth = letters?.filter(l => l.status === 'Sent' && l.sent_at && new Date(l.sent_at) >= monthStart).length || 0;

  const filtered = filter === 'All' ? letters : letters?.filter(l => l.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2"><FileSignature className="w-6 h-6 text-primary" /> Demand Letters</h2>
          <p className="text-sm text-muted-foreground mt-0.5">AI-generated demand letters for all cases</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Draft', value: drafts, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Awaiting Review', value: reviewed, color: 'text-amber-600 bg-amber-50' },
          { label: 'Finalized', value: finalized, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Sent This Month', value: sentThisMonth, color: 'text-violet-600 bg-violet-50' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <p className={`text-3xl font-bold tabular-nums ${c.color.split(' ')[0]}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {['All', 'Draft', 'Reviewed', 'Finalized', 'Sent'].map(s => (
            <TabsTrigger key={s} value={s} className="text-xs">{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Attorney</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Ver</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Total Demand</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Colossus</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Generated</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered?.map(l => {
              const c = l.cases as any;
              return (
                <tr key={l.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${l.case_id}`)}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-primary">{c?.case_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c?.patient_name}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c?.attorneys?.firm_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">v{l.version}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${statusColor[l.status] || ''}`}>{l.status}</Badge></td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">{l.total_demand != null ? `$${Number(l.total_demand).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">{l.colossus_score != null ? <ColossusScoreBadge score={l.colossus_score} /> : '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.created_at ? formatDistanceToNow(new Date(l.created_at), { addSuffix: true }) : ''}</td>
                </tr>
              );
            })}
            {(!filtered || filtered.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No demand letters found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
