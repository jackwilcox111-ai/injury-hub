import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderLiensTab() {
  const { data: liens, isLoading } = useQuery({
    queryKey: ['provider-liens'],
    queryFn: async () => {
      const { data } = await supabase.from('liens')
        .select('*, cases!liens_case_id_fkey(case_number, patient_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;


  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Reduction</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Paid Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {liens?.map(l => (
              <tr key={l.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary">{(l as any).cases?.case_number}</td>
                <td className="px-4 py-3 text-xs">{(l as any).cases?.patient_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-right tabular-nums">${Number(l.amount).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-right tabular-nums text-amber-600">
                  {l.reduction_amount ? `-$${Number(l.reduction_amount).toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={l.status === 'Paid' ? 'default' : l.status === 'Active' ? 'outline' : 'secondary'} className="text-[10px]">
                    {l.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{l.payment_date || '—'}</td>
              </tr>
            ))}
            {(!liens || liens.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No liens found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
