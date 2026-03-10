import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function ProviderPortal() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['provider-portal-appointments'],
    queryFn: async () => {
      const { data } = await supabase.from('appointments')
        .select('*, cases!appointments_case_id_fkey(case_number, patient_name)')
        .order('scheduled_date', { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-xl">Your Appointments</h2><Skeleton className="h-96 rounded" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Provider Portal</h2>
      <p className="text-sm text-muted-foreground">Read-only view of your assigned appointments.</p>

      <div className="bg-card border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Case #</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Specialty</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Date</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Status</th>
          </tr></thead>
          <tbody>
            {appointments?.map((a, i) => (
              <tr key={a.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}>
                <td className="px-4 py-3 font-mono text-xs text-primary">{(a as any).cases?.case_number}</td>
                <td className="px-4 py-3 text-foreground">{(a as any).cases?.patient_name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.specialty || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy HH:mm') : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
            {(!appointments || appointments.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No appointments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
