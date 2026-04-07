import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { GitBranch, CheckCircle, Circle, Info, Clock, Stethoscope, FileText, Scale, HelpCircle, CalendarCheck, Clipboard, Briefcase } from 'lucide-react';

const patientLabels: Record<string, string> = {
  'Intake': 'Your Case Has Been Opened',
  'Provider Matched': "You've Been Matched with Providers",
  'First Appointment': 'First Appointments Scheduled',
  'Appointment Completed': 'First Appointments Completed',
  'In Treatment': 'Currently in Treatment',
  'Treatment Completed': 'Treatment Is Complete',
  'Records Received': 'Records Being Reviewed',
  'Settlement Reached': 'Attorney Finalizing Your Case',
};

const milestones = ['Intake', 'Provider Matched', 'First Appointment', 'Appointment Completed', 'In Treatment', 'Treatment Completed', 'Records Received', 'Settlement Reached'];

const milestoneIcons: Record<string, React.ReactNode> = {
  'Intake': <Clipboard className="w-4 h-4" />,
  'Provider Matched': <Stethoscope className="w-4 h-4" />,
  'First Appointment': <CalendarCheck className="w-4 h-4" />,
  'Appointment Completed': <CheckCircle className="w-4 h-4" />,
  'In Treatment': <Stethoscope className="w-4 h-4" />,
  'Treatment Completed': <CheckCircle className="w-4 h-4" />,
  'Records Received': <FileText className="w-4 h-4" />,
  'Settlement Reached': <Scale className="w-4 h-4" />,
};

const milestoneEducation: Record<string, { what: string; expect: string }> = {
  'Intake': {
    what: 'Your case has been created and our care coordination team is reviewing your information.',
    expect: 'We will reach out within 1-2 business days to confirm your details and begin matching you with the right medical providers.',
  },
  'Provider Matched': {
    what: 'We have identified medical providers who specialize in treating your type of injury.',
    expect: 'Our team will schedule your first appointments. You may receive a call or text to confirm times that work for you.',
  },
  'First Appointment': {
    what: 'Your initial medical appointments have been scheduled with your care providers.',
    expect: 'Please arrive 15 minutes early and bring a valid photo ID. If you need transportation or an interpreter, let us know.',
  },
  'Appointment Completed': {
    what: 'You have completed your initial evaluation. Your provider is developing a treatment plan.',
    expect: 'Follow-up appointments will be scheduled based on your provider\'s recommendations. Consistency helps your recovery and your case.',
  },
  'In Treatment': {
    what: 'You are actively receiving medical treatment for your injuries.',
    expect: 'Keep attending all scheduled appointments. Missing visits can impact both your health and your legal case.',
  },
  'Treatment Completed': {
    what: 'Your medical providers have determined that you have reached maximum medical improvement (MMI).',
    expect: 'Your medical records and bills are being compiled. This typically takes 2-4 weeks. No action is needed from you.',
  },
  'Records Received': {
    what: 'All medical records and billing documentation have been gathered and are under review.',
    expect: 'Your care team and attorney are preparing a demand package to send to the insurance company.',
  },
  'Settlement Reached': {
    what: 'Your attorney is negotiating with the insurance company to reach a fair settlement.',
    expect: 'Negotiations can take weeks to months. Your attorney will contact you with any offers. You have final say.',
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

  if (isLoading) return (
    <div className="space-y-4 px-1">
      <h2 className="font-display text-xl text-foreground">My Case Progress</h2>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  const completedMilestones = events?.filter(e => milestones.includes(e.event_type)).map(e => e.event_type) || [];
  const progress = milestones.length > 0 ? Math.round(completedMilestones.length / milestones.length * 100) : 0;
  const currentStepIndex = completedMilestones.length;
  const currentMilestone = milestones[currentStepIndex] || milestones[milestones.length - 1];
  const currentEdu = milestoneEducation[currentMilestone];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-primary" />
        <h2 className="font-display text-xl text-foreground">My Case Progress</h2>
      </div>

      {/* Progress summary */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="font-medium">{progress}% complete</span>
        </div>
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(progress, 2)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          Step {Math.min(currentStepIndex + 1, milestones.length)} of {milestones.length}
        </p>
      </div>

      {/* Current Step Education Card */}
      {currentEdu && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-content text-primary shrink-0">
              <Info className="w-4 h-4 mx-auto" />
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {patientLabels[currentMilestone]}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">What This Means</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentEdu.what}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">What To Expect</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentEdu.expect}</p>
            </div>
          </div>
        </div>
      )}

      {/* Vertical Milestone Stepper — mobile-first */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Your Journey</h3>
        <div className="space-y-0">
          {milestones.map((m, i) => {
            const done = completedMilestones.includes(m);
            const current = !done && i === currentStepIndex;
            const future = !done && !current;
            const isLast = i === milestones.length - 1;

            return (
              <div key={m} className="flex gap-3">
                {/* Vertical line + icon */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done ? 'bg-primary text-primary-foreground' :
                    current ? 'bg-primary/15 text-primary ring-2 ring-primary/30' :
                    'bg-muted text-muted-foreground/40'
                  }`}>
                    {milestoneIcons[m]}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-6 ${done ? 'bg-primary/40' : 'bg-border'}`} />
                  )}
                </div>
                {/* Label */}
                <div className={`pt-1.5 pb-3 ${isLast ? '' : ''}`}>
                  <p className={`text-sm leading-tight ${
                    done ? 'text-foreground font-medium' :
                    current ? 'text-primary font-semibold' :
                    'text-muted-foreground'
                  }`}>
                    {patientLabels[m]}
                  </p>
                  {current && (
                    <span className="inline-block mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      You Are Here
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips — stacked for mobile */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" /> Helpful Tips
        </h3>
        <div className="space-y-2.5">
          {[
            { title: 'Attend Every Appointment', text: 'Missing medical visits can delay your treatment and weaken your case. If you need to reschedule, contact us ASAP.' },
            { title: 'Document Your Symptoms', text: 'Track pain levels and how injuries affect daily life. This helps build a stronger case.' },
            { title: 'Stay Off Social Media', text: 'Insurance companies may monitor your posts. Avoid posting about your accident or physical activities.' },
            { title: 'How Long Does This Take?', text: 'Personal injury cases typically take 6-18 months. Your team is working to resolve it as quickly as possible.' },
          ].map(tip => (
            <div key={tip.title} className="rounded-lg bg-accent/50 p-3 space-y-0.5">
              <p className="text-xs font-semibold text-foreground">{tip.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline events */}
      {events && events.length > 0 && (
        <div className="space-y-0">
          <h3 className="text-sm font-semibold text-foreground mb-3">Your Timeline</h3>
          {events.map((e, i) => (
            <div key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                {i < events.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
              </div>
              <div className="pb-5 min-w-0">
                <p className="text-[11px] font-mono text-muted-foreground">{format(new Date(e.event_date), 'MMM d, yyyy')}</p>
                <p className="text-sm font-medium text-foreground mt-0.5 leading-tight">{patientLabels[e.event_type] || e.event_title}</p>
                {e.event_detail && <p className="text-xs text-muted-foreground mt-0.5">{e.event_detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(!events || events.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">Your timeline will appear here as your case progresses.</p>
      )}
    </div>
  );
}
