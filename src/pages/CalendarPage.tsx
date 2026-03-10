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

  // Group by date
  const grouped: Record<string, typeof appointments> = {};
  appointments?.forEach(a => {
    const dateKey = a.scheduled_date ? format(new Date(a.scheduled_date), 'yyyy-MM-dd') : 'Unknown';
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey]!.push(a);
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Calendar</h2>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-display text-lg text-foreground">Calendar</h3>
        <p className="text-sm text-muted-foreground mt-1">Full scheduling view coming in Phase 2.</p>
      </div>

      {/* Upcoming appointments */}
      {Object.keys(grouped).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Upcoming 30 Days</h3>
          {Object.entries(grouped).map(([date, appts]) => (
            <div key={date}>
              <p className="text-xs font-mono text-primary mb-2">{format(new Date(date), 'EEEE, MMM d, yyyy')}</p>
              <div className="bg-card border border-border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {appts?.map((a, i) => (
                      <tr key={a.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground w-20">
                          {a.scheduled_date ? format(new Date(a.scheduled_date), 'HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {canNavigateCases ? (
                            <button onClick={() => navigate(`/cases/${(a as any).cases?.case_number ? a.case_id : ''}`)} className="text-primary hover:underline">
                              {(a as any).cases?.patient_name}
                            </button>
                          ) : (
                            <span>{(a as any).cases?.patient_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{(a as any).providers?.name || '—'}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{a.specialty || '—'}</td>
                        <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
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
