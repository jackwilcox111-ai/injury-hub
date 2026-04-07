import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { GitBranch, CheckCircle, Circle, Info, Clock, Stethoscope, FileText, Scale, HelpCircle } from 'lucide-react';

const patientLabels: Record<string, string> = {
  'Intake': 'Your Case Has Been Opened',
  'Provider Matched': "You've Been Matched with Medical Providers",
  'First Appointment': 'Your First Appointments Are Scheduled',
  'Appointment Completed': 'Your First Appointments Are Completed',
  'In Treatment': 'You Are Currently in Treatment',
  'Treatment Completed': 'Your Treatment Is Complete',
  'Records Received': 'Your Medical Records Are Being Reviewed',
  'Settlement Reached': 'Your Attorney Is Working on Finalizing Your Case',
};

const milestones = ['Intake', 'Provider Matched', 'First Appointment', 'Appointment Completed', 'In Treatment', 'Treatment Completed', 'Records Received', 'Settlement Reached'];

const milestoneEducation: Record<string, { icon: React.ReactNode; what: string; expect: string }> = {
  'Intake': {
    icon: <Info className="w-4 h-4 text-primary" />,
    what: 'Your case has been created and our care coordination team is reviewing your information.',
    expect: 'We will reach out within 1-2 business days to confirm your details and begin matching you with the right medical providers.',
  },
  'Provider Matched': {
    icon: <Stethoscope className="w-4 h-4 text-primary" />,
    what: 'We have identified medical providers who specialize in treating your type of injury.',
    expect: 'Our team will schedule your first appointments. You may receive a call or text to confirm times that work for you.',
  },
  'First Appointment': {
    icon: <Clock className="w-4 h-4 text-primary" />,
    what: 'Your initial medical appointments have been scheduled with your care providers.',
    expect: 'Please arrive 15 minutes early and bring a valid photo ID. If you need transportation or an interpreter, let us know.',
  },
  'Appointment Completed': {
    icon: <CheckCircle className="w-4 h-4 text-primary" />,
    what: 'You have completed your initial evaluation. Your provider is developing a treatment plan.',
    expect: 'Follow-up appointments will be scheduled based on your provider\'s recommendations. Continue attending all visits -- consistency helps your recovery and your case.',
  },
  'In Treatment': {
    icon: <Stethoscope className="w-4 h-4 text-primary" />,
    what: 'You are actively receiving medical treatment for your injuries.',
    expect: 'Keep attending all scheduled appointments. Missing visits can impact both your health and your legal case. Log any new symptoms in your check-ins.',
  },
  'Treatment Completed': {
    icon: <FileText className="w-4 h-4 text-primary" />,
    what: 'Your medical providers have determined that you have reached maximum medical improvement (MMI).',
    expect: 'Your medical records and bills are being compiled. This process typically takes 2-4 weeks. No action is needed from you at this stage.',
  },
  'Records Received': {
    icon: <FileText className="w-4 h-4 text-primary" />,
    what: 'All medical records and billing documentation have been gathered and are under review.',
    expect: 'Your care team and attorney are preparing a demand package. This is a detailed summary sent to the insurance company to begin the settlement process.',
  },
  'Settlement Reached': {
    icon: <Scale className="w-4 h-4 text-primary" />,
    what: 'Your attorney is negotiating with the insurance company to reach a fair settlement.',
    expect: 'Settlement negotiations can take weeks to months. Your attorney will contact you with any offers. You will have final say before anything is accepted.',
  },
};

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
  const currentStepIndex = completedMilestones.length;
  const currentMilestone = milestones[currentStepIndex] || milestones[milestones.length - 1];
  const currentEdu = milestoneEducation[currentMilestone];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-foreground flex items-center gap-2"><GitBranch className="w-6 h-6 text-primary" /> My Case Progress</h2>

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

      {/* Current Step Education Card */}
      {currentEdu && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            {currentEdu.icon}
            <h3 className="text-sm font-semibold text-foreground">
              Current Step: {patientLabels[currentMilestone]}
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">What This Means</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentEdu.what}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">What To Expect</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentEdu.expect}</p>
            </div>
          </div>
        </div>
      )}

      {/* FAQ / Tips */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" /> Helpful Tips
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-accent/50 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">Attend Every Appointment</p>
            <p className="text-xs text-muted-foreground">Missing medical visits can delay your treatment and weaken your case. If you need to reschedule, contact us as soon as possible.</p>
          </div>
          <div className="rounded-lg bg-accent/50 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">Document Your Symptoms</p>
            <p className="text-xs text-muted-foreground">Keep track of pain levels, new symptoms, and how your injuries affect daily life. This information helps build a stronger case.</p>
          </div>
          <div className="rounded-lg bg-accent/50 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">Stay Off Social Media</p>
            <p className="text-xs text-muted-foreground">Insurance companies may monitor your social media. Avoid posting about your accident, injuries, or physical activities during your case.</p>
          </div>
          <div className="rounded-lg bg-accent/50 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">How Long Does This Take?</p>
            <p className="text-xs text-muted-foreground">Every case is different, but personal injury cases typically take 6-18 months from start to settlement. Your team is working to resolve it as quickly as possible.</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {events && events.length > 0 && (
          <h3 className="text-sm font-semibold text-foreground mb-3">Your Timeline</h3>
        )}
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
          <p className="text-sm text-muted-foreground text-center py-4">Your timeline will appear here as your case progresses.</p>
        )}
      </div>
    </div>
  );
}
