import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { ProgressBar } from '@/components/global/ProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function AttorneyPortal() {
  const { profile } = useAuth();

  const { data: cases, isLoading } = useQuery({
    queryKey: ['attorney-portal-cases'],
    queryFn: async () => {
      const { data } = await supabase.from('cases_with_counts')
        .select('*, providers!cases_provider_id_fkey(name)')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-xl">Your Cases</h2><Skeleton className="h-96 rounded" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Attorney Portal</h2>
      <p className="text-sm text-muted-foreground">Read-only view of your firm's cases.</p>

      <div className="bg-card border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Case #</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Specialty</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Provider</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">SoL</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Progress</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Updated</th>
          </tr></thead>
          <tbody>
            {cases?.map((c, i) => (
              <tr key={c.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}>
                <td className="px-4 py-3 font-mono text-xs text-primary">{c.case_number}</td>
                <td className="px-4 py-3 text-foreground">{c.patient_name}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status || ''} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.specialty || '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{(c as any).providers?.name || '—'}</td>
                <td className="px-4 py-3"><SoLCountdown sol_date={c.sol_date} /></td>
                <td className="px-4 py-3"><ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : '—'}</td>
              </tr>
            ))}
            {(!cases || cases.length === 0) && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No cases found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
