import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { GitBranch, CheckCircle, Circle } from 'lucide-react';

const patientLabels: Record<string, string> = {
  'Intake': 'Your Case Has Been Opened',
  'Provider Matched': 'You've Been Matched with Medical Providers',
  'First Appointment': 'Your First Appointments Are Scheduled',
  'Appointment Completed': 'Your First Appointments Are Completed',
  'In Treatment': 'You Are Currently in Treatment',
  'Treatment Completed': 'Your Treatment Is Complete',
  'Records Received': 'Your Medical Records Are Being Reviewed',
  'Settlement Reached': 'Your Attorney Is Working on Finalizing Your Case',
};

const milestones = ['Intake', 'Provider Matched', 'First Appointment', 'Appointment Completed', 'In Treatment', 'Treatment Completed', 'Records Received', 'Settlement Reached'];

export default function PatientTimeline() {
  const { profile } = useAuth();

  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-tl', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from('patient_profiles').select('case_id').eq('profile_id', profile!.id).maybeSingle();
      return data;
    },
  });

  const caseId = patientProfile?.case_id;

  const { data: events, isLoading } = useQuery({
    queryKey: ['patient-timeline', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase.from('case_timelines')
        .select('*')
        .eq('case_id', caseId!)
        .order('event_date', { ascending: true });
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Timeline</h2><Skeleton className="h-96 rounded-xl" /></div>;

  const completedMilestones = events?.filter(e => milestones.includes(e.event_type)).map(e => e.event_type) || [];
  const progress = milestones.length > 0 ? Math.round(completedMilestones.length / milestones.length * 100) : 0;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-foreground flex items-center gap-2"><GitBranch className="w-6 h-6 text-primary" /> Your Case Timeline</h2>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{progress}% complete</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between">
          {milestones.map((m, i) => {
            const done = completedMilestones.includes(m);
            const current = !done && i === completedMilestones.length;
            return (
              <div key={m} className="flex flex-col items-center gap-1">
                {done ? <CheckCircle className="w-4 h-4 text-primary" /> : <Circle className={`w-4 h-4 ${current ? 'text-primary animate-pulse' : 'text-muted-foreground/30'}`} />}
                <span className={`text-[9px] text-center max-w-[60px] ${done ? 'text-foreground font-medium' : current ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {patientLabels[m] || m}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {events?.map((e, i) => (
          <div key={e.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-1.5" />
              {i < (events?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-border" />}
            </div>
            <div className="pb-6">
              <p className="text-xs font-mono text-muted-foreground">{format(new Date(e.event_date), 'MMM d, yyyy')}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{patientLabels[e.event_type] || e.event_title}</p>
              {e.event_detail && <p className="text-xs text-muted-foreground mt-0.5">{e.event_detail}</p>}
            </div>
          </div>
        ))}
        {(!events || events.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-8">Your timeline will appear here as your case progresses.</p>
        )}
      </div>
    </div>
  );
}
