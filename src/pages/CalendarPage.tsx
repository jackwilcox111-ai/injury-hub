import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { ChevronLeft, ChevronRight, Plus, Clock, CalendarDays, GitBranch, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CalendarEvent = {
  id: string;
  date: string;
  type: 'appointment' | 'timeline';
  title: string;
  subtitle?: string;
  status?: string;
  caseId?: string;
  caseName?: string;
  caseNumber?: string;
  eventType?: string; // for timeline: Intake, Demand Sent, etc.
  time?: string; // for appointments
};

const TIMELINE_COLORS: Record<string, string> = {
  'Intake': 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-400',
  'Care Manager Assigned': 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-400',
  'Provider Matched': 'bg-teal-500/20 text-teal-700 border-teal-500/30 dark:text-teal-400',
  'First Appointment': 'bg-primary/20 text-primary border-primary/30',
  'Appointment Completed': 'bg-success/20 text-success border-success/30',
  'No-Show': 'bg-destructive/20 text-destructive border-destructive/30',
  'Records Requested': 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400',
  'Records Received': 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400',
  'Records Delivered': 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400',
  'Demand Sent': 'bg-violet-500/20 text-violet-700 border-violet-500/30 dark:text-violet-400',
  'Offer Received': 'bg-violet-500/20 text-violet-700 border-violet-500/30 dark:text-violet-400',
  'Counter Sent': 'bg-violet-500/20 text-violet-700 border-violet-500/30 dark:text-violet-400',
  'Settlement Reached': 'bg-success/20 text-success border-success/30',
  'Lien Paid': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  'Case Closed': 'bg-muted text-muted-foreground border-border',
};

const APPT_COLOR = 'bg-primary/20 text-primary border-primary/30';

type FilterType = 'all' | 'appointments' | 'timeline';

export default function CalendarPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const canNavigateCases = profile?.role === 'admin' || profile?.role === 'care_manager';
  const canCreate = profile?.role === 'admin' || profile?.role === 'care_manager';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [newAppt, setNewAppt] = useState({ case_id: '', provider_id: '', scheduled_date: '', specialty: '', notes: '' });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch appointments
  const { data: appointments, refetch: refetchAppts } = useQuery({
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

  // Fetch timeline events
  const { data: timelineEvents } = useQuery({
    queryKey: ['calendar-timelines', format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await supabase.from('case_timelines')
        .select('*, cases!case_timelines_case_id_fkey(case_number, patient_name)')
        .gte('event_date', format(calendarStart, 'yyyy-MM-dd'))
        .lte('event_date', format(calendarEnd, 'yyyy-MM-dd'))
        .order('event_date', { ascending: true });
      return data || [];
    },
  });

  // Cases & providers for create dialog
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

  // Merge into unified events
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];

    if (filterType !== 'timeline') {
      appointments?.forEach(a => {
        if (!a.scheduled_date) return;
        events.push({
          id: `appt-${a.id}`,
          date: format(new Date(a.scheduled_date), 'yyyy-MM-dd'),
          type: 'appointment',
          title: (a as any).cases?.patient_name?.split(' ')[0] || 'Appt',
          subtitle: (a as any).providers?.name,
          status: a.status,
          caseId: a.case_id,
          caseName: (a as any).cases?.patient_name,
          caseNumber: (a as any).cases?.case_number,
          time: format(new Date(a.scheduled_date), 'HH:mm'),
          eventType: a.specialty || 'Appointment',
        });
      });
    }

    if (filterType !== 'appointments') {
      timelineEvents?.forEach(t => {
        events.push({
          id: `tl-${t.id}`,
          date: t.event_date,
          type: 'timeline',
          title: t.event_title,
          status: t.event_type,
          caseId: t.case_id,
          caseName: (t as any).cases?.patient_name,
          caseNumber: (t as any).cases?.case_number,
          eventType: t.event_type,
        });
      });
    }

    return events;
  }, [appointments, timelineEvents, filterType]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    allEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date]!.push(e);
    });
    return map;
  }, [allEvents]);

  const selectedDayEvents = selectedDate
    ? eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
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
    refetchAppts();
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'appointment') {
      if (event.status === 'completed' || event.status === 'Completed') return 'bg-success/20 text-success border-success/30';
      if (event.status === 'cancelled' || event.status === 'no_show' || event.status === 'No-Show') return 'bg-destructive/20 text-destructive border-destructive/30';
      return APPT_COLOR;
    }
    return TIMELINE_COLORS[event.eventType || ''] || 'bg-muted text-muted-foreground border-border';
  };

  const eventCounts = useMemo(() => {
    let appts = 0, tls = 0;
    allEvents.forEach(e => e.type === 'appointment' ? appts++ : tls++);
    return { appts, tls, total: appts + tls };
  }, [allEvents]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-foreground">Calendar</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Unified view of appointments and case milestones</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border">
            {([
              { key: 'all', label: 'All', count: eventCounts.total },
              { key: 'appointments', label: 'Appointments', count: eventCounts.appts },
              { key: 'timeline', label: 'Milestones', count: eventCounts.tls },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  filterType === f.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                {f.count > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">({f.count})</span>
                )}
              </button>
            ))}
          </div>
          {canCreate && (
            <Button onClick={() => { setShowCreateDialog(true); setNewAppt(a => ({ ...a, scheduled_date: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'09:00") : '' })); }} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> New Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-[11px]">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">Appointments</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-muted-foreground">Case Milestones</span>
        </div>
        <span className="text-muted-foreground/50">|</span>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-muted-foreground">Intake/Admin</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> <span className="text-muted-foreground">Records</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> <span className="text-muted-foreground">Legal</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> <span className="text-muted-foreground">Completed</span></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
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
              const dayEvents = eventsByDate[key] || [];
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
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className={cn('text-[10px] px-1 py-0.5 rounded border truncate', getEventColor(e))}>
                        {e.type === 'appointment' && e.time ? `${e.time} ` : ''}
                        {e.type === 'timeline' ? (e.eventType || '').slice(0, 12) : e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="bg-card border border-border rounded-xl shadow-card p-4 space-y-3 h-fit max-h-[calc(100vh-240px)] overflow-y-auto">
          <h4 className="font-display text-sm font-semibold text-foreground">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}
          </h4>
          {selectedDate && selectedDayEvents.length === 0 && (
            <p className="text-xs text-muted-foreground">No events this day.</p>
          )}
          {selectedDayEvents.map(e => (
            <div key={e.id} className="border border-border rounded-lg p-3 space-y-1.5 hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-2 flex-wrap">
                {e.type === 'appointment' ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                    <CalendarDays className="w-3 h-3 mr-1" /> Appointment
                  </Badge>
                ) : (
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getEventColor(e))}>
                    <GitBranch className="w-3 h-3 mr-1" /> {e.eventType}
                  </Badge>
                )}
                {e.time && (
                  <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                    <Clock className="w-3 h-3" /> {format(new Date(`2000-01-01T${e.time}`), 'h:mm a')}
                  </span>
                )}
                {e.type === 'appointment' && e.status && <StatusBadge status={e.status} />}
              </div>

              <p className="text-sm font-medium">
                {e.type === 'appointment' ? (
                  canNavigateCases && e.caseId ? (
                    <button onClick={() => navigate(`/cases/${e.caseId}`)} className="text-primary hover:underline">{e.caseName}</button>
                  ) : <span>{e.caseName}</span>
                ) : (
                  <span>{e.title}</span>
                )}
              </p>

              {e.caseNumber && (
                <p className="text-[11px] text-muted-foreground">
                  {canNavigateCases && e.caseId ? (
                    <button onClick={() => navigate(`/cases/${e.caseId}`)} className="text-primary/70 hover:underline">{e.caseNumber} — {e.caseName}</button>
                  ) : (
                    <span>{e.caseNumber} — {e.caseName}</span>
                  )}
                </p>
              )}

              {e.type === 'appointment' && e.subtitle && (
                <p className="text-xs text-muted-foreground">Provider: {e.subtitle}</p>
              )}
              {e.type === 'appointment' && e.eventType && e.eventType !== 'Appointment' && (
                <p className="text-xs text-muted-foreground">Specialty: {e.eventType}</p>
              )}
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
