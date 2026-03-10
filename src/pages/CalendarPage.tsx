import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export default function CalendarPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const canNavigateCases = profile?.role === 'admin' || profile?.role === 'care_manager';

  const { data: appointments } = useQuery({
    queryKey: ['upcoming-appointments'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
      const { data } = await supabase.from('appointments')
        .select('*, cases!appointments_case_id_fkey(case_number, patient_name), providers(name)')
        .gte('scheduled_date', now)
        .lte('scheduled_date', thirtyDays.toISOString())
        .order('scheduled_date', { ascending: true });
      return data || [];
    },
  });

  const grouped: Record<string, typeof appointments> = {};
  appointments?.forEach(a => {
    const dateKey = a.scheduled_date ? format(new Date(a.scheduled_date), 'yyyy-MM-dd') : 'Unknown';
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey]!.push(a);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground">Calendar</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Scheduling and appointments overview</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-display text-lg text-foreground">Full Calendar Coming Soon</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">A complete scheduling view with drag-and-drop, recurring appointments, and provider availability is planned for Phase 2.</p>
      </div>

      {Object.keys(grouped).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Upcoming 30 Days</h3>
          {Object.entries(grouped).map(([date, appts]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-primary mb-2">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</p>
              <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {appts?.map(a => (
                      <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground w-20">
                          {a.scheduled_date ? format(new Date(a.scheduled_date), 'HH:mm') : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium">
                          {canNavigateCases ? (
                            <button onClick={() => navigate(`/cases/${a.case_id}`)} className="text-primary hover:underline">{(a as any).cases?.patient_name}</button>
                          ) : <span>{(a as any).cases?.patient_name}</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{(a as any).providers?.name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{a.specialty || '—'}</td>
                        <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
