import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Heart, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const painColor = (level: number) => {
  if (level <= 3) return 'text-emerald-600';
  if (level <= 6) return 'text-amber-600';
  return 'text-red-600';
};

const painBg = (level: number) => {
  if (level <= 3) return 'bg-emerald-50 border-emerald-200';
  if (level <= 6) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
};

export function PatientEngagementTab({ caseId }: { caseId: string }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const isAdminOrCM = profile?.role === 'admin' || profile?.role === 'care_manager';

  const [painLevel, setPainLevel] = useState(5);
  const [mood, setMood] = useState('fair');
  const [notes, setNotes] = useState('');

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['patient-checkins', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('patient_checkins')
        .select('*, patient:profiles!patient_checkins_patient_id_fkey(full_name)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const addCheckin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('patient_checkins').insert({
        case_id: caseId,
        patient_id: user?.id,
        pain_level: painLevel,
        mood,
        notes: notes || null,
        logged_by: isAdminOrCM ? 'care_manager' : 'patient',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-checkins', caseId] });
      setShowAdd(false);
      setNotes('');
      toast.success('Check-in logged');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Compute pain trend
  const recentCheckins = checkins?.slice(0, 5) || [];
  const avgPain = recentCheckins.length > 0
    ? Math.round(recentCheckins.reduce((s: number, c: any) => s + (c.pain_level || 0), 0) / recentCheckins.length * 10) / 10
    : null;
  const prevAvg = checkins && checkins.length > 5
    ? Math.round(checkins.slice(5, 10).reduce((s: number, c: any) => s + (c.pain_level || 0), 0) / Math.min(checkins.length - 5, 5) * 10) / 10
    : null;
  const trend = avgPain !== null && prevAvg !== null ? avgPain - prevAvg : null;

  // Last check-in days
  const lastCheckin = checkins?.[0];
  const daysSinceCheckin = lastCheckin?.created_at ? differenceInDays(new Date(), new Date(lastCheckin.created_at)) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Patient Engagement</h3>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Log Check-in
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-lg p-3 text-center border ${avgPain !== null ? painBg(avgPain) : 'bg-card border-border'}`}>
          <p className={`text-2xl font-bold font-mono-data tabular-nums ${avgPain !== null ? painColor(avgPain) : 'text-muted-foreground'}`}>
            {avgPain !== null ? avgPain : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Avg Pain (Last 5)</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {trend !== null ? (
              trend < 0 ? <TrendingDown className="w-4 h-4 text-emerald-600" /> :
              trend > 0 ? <TrendingUp className="w-4 h-4 text-red-600" /> :
              <Minus className="w-4 h-4 text-muted-foreground" />
            ) : null}
            <p className={`text-lg font-semibold font-mono-data tabular-nums ${
              trend !== null ? (trend < 0 ? 'text-emerald-600' : trend > 0 ? 'text-red-600' : 'text-muted-foreground') : 'text-muted-foreground'
            }`}>{trend !== null ? (trend > 0 ? `+${trend}` : trend) : '—'}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Pain Trend</p>
        </div>
        <div className={`rounded-lg p-3 text-center border ${
          daysSinceCheckin !== null && daysSinceCheckin > 7 ? 'bg-red-50 border-red-200' : 'bg-card border-border'
        }`}>
          <p className={`text-lg font-semibold font-mono-data tabular-nums ${
            daysSinceCheckin !== null && daysSinceCheckin > 7 ? 'text-red-600' : 'text-foreground'
          }`}>{daysSinceCheckin !== null ? `${daysSinceCheckin}d` : '—'}</p>
          <p className="text-[10px] text-muted-foreground">Since Last Check-in</p>
          {daysSinceCheckin !== null && daysSinceCheckin > 7 && (
            <span className="text-[9px] text-red-600 font-medium">⚠ Overdue</span>
          )}
        </div>
      </div>

      {/* Pain Trend Mini Chart */}
      {checkins && checkins.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">Pain History</p>
          <div className="flex items-end gap-1 h-16">
            {[...checkins].reverse().slice(-20).map((c: any, i: number) => {
              const level = c.pain_level || 0;
              const height = (level / 10) * 100;
              return (
                <div key={c.id} className="flex-1 flex flex-col items-center gap-0.5" title={`${c.pain_level}/10 — ${format(new Date(c.created_at), 'MMM d')}`}>
                  <div
                    className={`w-full rounded-sm transition-all ${level <= 3 ? 'bg-emerald-400' : level <= 6 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ height: `${height}%`, minHeight: '2px' }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>Oldest</span><span>Most Recent</span>
          </div>
        </div>
      )}

      {/* Check-in Log */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : !checkins?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">No check-ins yet</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {checkins.map((c: any) => (
            <div key={c.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-card border border-border">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono-data ${painBg(c.pain_level || 0)} ${painColor(c.pain_level || 0)}`}>
                {c.pain_level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{format(new Date(c.created_at), 'MMM d, yyyy HH:mm')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground">{c.mood}</span>
                  <span className="text-[10px] text-muted-foreground">by {c.logged_by}</span>
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Check-in Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Patient Check-in</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addCheckin.mutate(); }} className="space-y-5">
            <div className="space-y-3">
              <Label>Pain Level: <span className={`font-bold font-mono-data ${painColor(painLevel)}`}>{painLevel}/10</span></Label>
              <Slider value={[painLevel]} onValueChange={v => setPainLevel(v[0])} min={1} max={10} step={1} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>No Pain</span><span>Worst Pain</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">😊 Good</SelectItem>
                  <SelectItem value="fair">😐 Fair</SelectItem>
                  <SelectItem value="poor">😞 Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addCheckin.isPending}>Log Check-in</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
