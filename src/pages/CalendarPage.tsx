import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const canNavigateCases = profile?.role === 'admin' || profile?.role === 'care_manager';
  const canCreate = profile?.role === 'admin' || profile?.role === 'care_manager';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAppt, setNewAppt] = useState({ case_id: '', provider_id: '', scheduled_date: '', specialty: '', notes: '' });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { data: appointments, refetch } = useQuery({
    queryKey: ['calendar-appointments', format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await supabase.from('appointments')
        .select('*, cases!appointments_case_id_fkey(case_number, patient_name), providers(name)')
        .gte('scheduled_date', calendarStart.toISOString())
        .lte('scheduled_date', calendarEnd.toISOString())
        .order('scheduled_date', { ascending: true });
      return data || [];
    },
  });

  const { data: cases } = useQuery({
    queryKey: ['cases-for-calendar'],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('id, case_number, patient_name').eq('status', 'active').order('patient_name');
      return data || [];
    },
    enabled: canCreate,
  });

  const { data: providers } = useQuery({
    queryKey: ['providers-for-calendar'],
    queryFn: async () => {
      const { data } = await supabase.from('providers').select('id, name, specialty').eq('status', 'active').order('name');
      return data || [];
    },
    enabled: canCreate,
  });

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, typeof appointments> = {};
    appointments?.forEach(a => {
      if (!a.scheduled_date) return;
      const key = format(new Date(a.scheduled_date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key]!.push(a);
    });
    return map;
  }, [appointments]);

  const selectedDayAppts = selectedDate
    ? appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  const handleCreate = async () => {
    if (!newAppt.case_id || !newAppt.scheduled_date) {
      toast.error('Case and date are required');
      return;
    }
    const { error } = await supabase.from('appointments').insert({
      case_id: newAppt.case_id,
      provider_id: newAppt.provider_id || null,
      scheduled_date: newAppt.scheduled_date,
      specialty: newAppt.specialty || null,
      notes: newAppt.notes || null,
      status: 'scheduled',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Appointment created');
    setShowCreateDialog(false);
    setNewAppt({ case_id: '', provider_id: '', scheduled_date: '', specialty: '', notes: '' });
    refetch();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/20 text-success border-success/30';
      case 'cancelled': case 'no_show': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Calendar</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Scheduling and appointments overview</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setShowCreateDialog(true); setNewAppt(a => ({ ...a, scheduled_date: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'09:00") : '' })); }} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> New Appointment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        {/* Calendar Grid */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <h3 className="font-display text-base font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</h3>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayAppts = appointmentsByDate[key] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative min-h-[80px] p-1.5 border-b border-r border-border text-left transition-colors hover:bg-accent/40',
                    !inMonth && 'opacity-40',
                    selected && 'bg-primary/5 ring-1 ring-primary/30',
                  )}
                >
                  <span className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                    today && 'bg-primary text-primary-foreground',
                    !today && 'text-foreground',
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayAppts.slice(0, 3).map(a => (
                      <div key={a.id} className={cn('text-[10px] px-1 py-0.5 rounded border truncate', statusColor(a.status))}>
                        {a.scheduled_date ? format(new Date(a.scheduled_date), 'HH:mm') : ''} {(a as any).cases?.patient_name?.split(' ')[0]}
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel: selected day */}
        <div className="bg-card border border-border rounded-xl shadow-card p-4 space-y-3 h-fit">
          <h4 className="font-display text-sm font-semibold text-foreground">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}
          </h4>
          {selectedDate && selectedDayAppts.length === 0 && (
            <p className="text-xs text-muted-foreground">No appointments this day.</p>
          )}
          {selectedDayAppts.map(a => (
            <div key={a.id} className="border border-border rounded-lg p-3 space-y-1.5 hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">
                  {a.scheduled_date ? format(new Date(a.scheduled_date), 'h:mm a') : '—'}
                </span>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-sm font-medium">
                {canNavigateCases ? (
                  <button onClick={() => navigate(`/cases/${a.case_id}`)} className="text-primary hover:underline">{(a as any).cases?.patient_name}</button>
                ) : (
                  <span>{(a as any).cases?.patient_name}</span>
                )}
              </p>
              {(a as any).providers?.name && (
                <p className="text-xs text-muted-foreground">Provider: {(a as any).providers.name}</p>
              )}
              {a.specialty && <p className="text-xs text-muted-foreground">Specialty: {a.specialty}</p>}
              {a.notes && <p className="text-xs text-muted-foreground italic">{a.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Case *</Label>
              <Select value={newAppt.case_id} onValueChange={v => setNewAppt(a => ({ ...a, case_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                <SelectContent>
                  {cases?.map(c => <SelectItem key={c.id} value={c.id}>{c.patient_name} ({c.case_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Provider</Label>
              <Select value={newAppt.provider_id} onValueChange={v => setNewAppt(a => ({ ...a, provider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {providers?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.specialty}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={newAppt.scheduled_date} onChange={e => setNewAppt(a => ({ ...a, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <Label>Specialty</Label>
              <Input value={newAppt.specialty} onChange={e => setNewAppt(a => ({ ...a, specialty: e.target.value }))} placeholder="e.g. Orthopedics" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newAppt.notes} onChange={e => setNewAppt(a => ({ ...a, notes: e.target.value }))} rows={2} />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Appointment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
