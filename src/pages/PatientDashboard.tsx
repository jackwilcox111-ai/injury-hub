import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/global/StatusBadge';
import { ProgressBar } from '@/components/global/ProgressBar';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { Activity, Calendar, Heart, FileText, CheckCircle, HelpCircle, Bell, DollarSign } from 'lucide-react';
import { generateICS } from '@/lib/ics-generator';

const MOODS = ['Great', 'Good', 'OK', 'Poor', 'Terrible'];

export default function PatientDashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [painLevel, setPainLevel] = useState([5]);
  const [mood, setMood] = useState('OK');
  const [notes, setNotes] = useState('');

  // Get the patient's case via patient_profiles
  const { data: patientProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['patient-profile', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from('patient_profiles')
        .select('*, cases!patient_profiles_case_id_fkey(*, providers!cases_provider_id_fkey(name), attorneys!cases_attorney_id_fkey(firm_name))')
        .eq('profile_id', profile!.id)
        .maybeSingle();
      return data;
    },
  });

  const caseData = (patientProfile as any)?.cases;
  const caseId = caseData?.id;

  const { data: appointments } = useQuery({
    queryKey: ['patient-appointments', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase.from('appointments')
        .select('*, providers!appointments_provider_id_fkey(name)')
        .eq('case_id', caseId)
        .order('scheduled_date', { ascending: true });
      return data || [];
    },
  });

  const { data: checkins } = useQuery({
    queryKey: ['patient-checkins', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase.from('patient_checkins')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: funding } = useQuery({
    queryKey: ['patient-funding', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase.from('funding_requests')
        .select('*')
        .eq('case_id', caseId)
        .limit(5);
      return data || [];
    },
  });

    mutationFn: async () => {
      const { error } = await supabase.from('patient_checkins').insert({
        case_id: caseId,
        patient_id: profile!.id,
        pain_level: painLevel[0],
        mood,
        notes: notes || null,
        logged_by: 'patient',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-checkins', caseId] });
      setNotes('');
      setPainLevel([5]);
      setMood('OK');
      toast.success('Check-in submitted!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loadingProfile) return <div className="space-y-6"><h2 className="font-display text-2xl">My Dashboard</h2><Skeleton className="h-96 rounded-xl" /></div>;

  if (!caseData) return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-foreground">Patient Portal</h2>
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">No case found. Your care manager will set up your case soon.</p>
      </div>
    </div>
  );

  const completedAppts = appointments?.filter(a => a.status === 'Completed').length || 0;
  const totalAppts = appointments?.length || 0;
  const upcomingAppts = appointments?.filter(a => a.status === 'Scheduled') || [];
  const soonAppt = upcomingAppts.find(a => a.scheduled_date && differenceInHours(new Date(a.scheduled_date), new Date()) <= 48 && differenceInHours(new Date(a.scheduled_date), new Date()) >= 0);

  const caseStages = ['Intake', 'In Treatment', 'Records Pending', 'Demand Prep', 'Settled'];
  const currentStageIdx = caseStages.indexOf(caseData.status || 'Intake');

  const askQuestion = async () => {
    await supabase.from('notifications').insert({
      title: 'Patient Question',
      message: `Patient ${profile?.full_name} has a question about their case (${caseData.case_number})`,
      link: `/cases/${caseId}`,
    });
    toast.success('Your question has been sent to your care manager!');
  };

  const rescheduleAppt = async (appt: any) => {
    await supabase.from('notifications').insert({
      title: 'Reschedule Request',
      message: `${profile?.full_name} needs to reschedule appointment on ${appt.scheduled_date ? format(new Date(appt.scheduled_date), 'MMM d') : 'TBD'} with ${(appt as any).providers?.name || 'provider'}`,
      link: `/cases/${caseId}`,
    });
    toast.success('Reschedule request sent!');
  };

  const downloadICS = (appt: any) => {
    const ics = generateICS({
      date: appt.scheduled_date || new Date().toISOString(),
      providerName: (appt as any).providers?.name || 'Provider',
      summary: appt.specialty || 'Medical Appointment',
    });
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appointment.ics'; a.click();
    URL.revokeObjectURL(url);
  };

  const painColor = (level: number) => {
    if (level <= 3) return 'text-emerald-600';
    if (level <= 6) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground">Welcome, {profile?.full_name?.split(' ')[0]}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Case {caseData.case_number} — {caseData.status}</p>
      </div>

      {/* Appointment Reminder Banner */}
      {soonAppt && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Reminder: You have an appointment {differenceInHours(new Date(soonAppt.scheduled_date!), new Date()) <= 24 ? 'today' : 'tomorrow'} with {(soonAppt as any).providers?.name || 'your provider'}
              </p>
              <p className="text-xs text-muted-foreground">{format(new Date(soonAppt.scheduled_date!), 'MMM d, yyyy h:mm a')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => downloadICS(soonAppt)}>Add to Calendar</Button>
            <Button size="sm" variant="ghost" className="text-xs h-8 text-destructive" onClick={() => rescheduleAppt(soonAppt)}>Reschedule</Button>
          </div>
        </div>
      )}

      {/* Case Progress Bar (5-stage) */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Case Progress</h3>
        <div className="flex items-center gap-1">
          {caseStages.map((stage, i) => (
            <div key={stage} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-full h-2 rounded-full ${i < currentStageIdx ? 'bg-primary' : i === currentStageIdx ? 'bg-primary' : 'bg-secondary'}`} />
              <div className={`w-3 h-3 rounded-full border-2 ${i < currentStageIdx ? 'bg-primary border-primary' : i === currentStageIdx ? 'bg-primary border-primary animate-pulse' : 'bg-background border-muted-foreground/30'}`} />
              <span className={`text-[9px] text-center ${i === currentStageIdx ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{stage}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">You are in Step {currentStageIdx + 1} of 5 — {caseStages[currentStageIdx] || 'Intake'}</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <StatusBadge status={caseData.status} />
          <p className="text-xs text-muted-foreground mt-1">Status</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-foreground tabular-nums">{completedAppts}/{totalAppts}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Provider</p>
          <p className="text-sm font-medium text-foreground">{(caseData as any).providers?.name || 'TBD'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Attorney</p>
          <p className="text-sm font-medium text-foreground">{(caseData as any).attorneys?.firm_name || 'TBD'}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Treatment Progress</h3>
        <ProgressBar completed={completedAppts} total={totalAppts} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{completedAppts} completed</span>
          <span>{totalAppts - completedAppts} remaining</span>
        </div>
      </div>

      {/* "I have a question" button */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Have a question about your case?</p>
          <p className="text-xs text-muted-foreground">Your care manager will respond within 24 hours</p>
        </div>
        <Button variant="outline" size="sm" onClick={askQuestion}><HelpCircle className="w-3.5 h-3.5 mr-1" /> I Have a Question</Button>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Upcoming Appointments</h3>
        {upcomingAppts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No upcoming appointments</p>
        ) : (
          <div className="space-y-2">
            {upcomingAppts.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.specialty || 'General'}</p>
                  <p className="text-xs text-muted-foreground">{(a as any).providers?.name || 'TBD'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-foreground">{a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d, yyyy') : '—'}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{a.scheduled_date ? format(new Date(a.scheduled_date), 'h:mm a') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Check-in Form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Heart className="w-4 h-4 text-primary" /> Daily Check-in</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Pain Level</Label>
              <span className={`text-lg font-bold tabular-nums ${painColor(painLevel[0])}`}>{painLevel[0]}/10</span>
            </div>
            <Slider value={painLevel} onValueChange={setPainLevel} min={1} max={10} step={1} className="w-full" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Minimal</span><span>Moderate</span><span>Severe</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Mood</Label>
            <div className="flex gap-1.5">
              {MOODS.map(m => (
                <button key={m} type="button"
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    mood === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => setMood(m)}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="How are you feeling today?" />
          </div>
          <Button onClick={() => submitCheckin.mutate()} disabled={submitCheckin.isPending} className="w-full">
            {submitCheckin.isPending ? 'Submitting...' : 'Submit Check-in'}
          </Button>
        </div>
      </div>

      {/* Recent Check-ins */}
      {checkins && checkins.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Check-ins</h3>
          <div className="space-y-2">
            {checkins.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold tabular-nums ${painColor(c.pain_level || 5)}`}>{c.pain_level}</span>
                  <div>
                    <Badge variant="outline" className="text-[10px]">{c.mood}</Badge>
                    {c.notes && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{c.notes}</p>}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
