import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderPatientsTab() {
  const { data: cases, isLoading } = useQuery({
    queryKey: ['provider-patients'],
    queryFn: async () => {
      const { data } = await supabase.from('cases')
        .select('id, case_number, patient_name, status, specialty, opened_date, accident_date, lien_amount')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-accent/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case #</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Opened</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Lien</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cases?.map(c => (
            <tr key={c.id} className="hover:bg-accent/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">{c.case_number}</td>
              <td className="px-4 py-3 text-xs text-foreground">{c.patient_name}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{c.specialty || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3 font-mono text-xs">{c.opened_date}</td>
              <td className="px-4 py-3 font-mono text-xs text-right tabular-nums">${Number(c.lien_amount || 0).toLocaleString()}</td>
            </tr>
          ))}
          {(!cases || cases.length === 0) && (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No patients assigned</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
