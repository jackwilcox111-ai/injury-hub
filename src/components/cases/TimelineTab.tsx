import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, GitBranch } from 'lucide-react';

const EVENT_TYPES = [
  'Intake','Care Manager Assigned','Provider Matched','First Appointment',
  'Appointment Completed','No-Show','Records Requested','Records Received',
  'Records Delivered','Demand Sent','Offer Received','Counter Sent',
  'Settlement Reached','Lien Paid','Case Closed'
];

const EVENT_COLORS: Record<string, string> = {
  Intake: 'bg-blue-100 text-blue-700',
  'Care Manager Assigned': 'bg-blue-100 text-blue-700',
  'Provider Matched': 'bg-emerald-100 text-emerald-700',
  'First Appointment': 'bg-emerald-100 text-emerald-700',
  'Appointment Completed': 'bg-emerald-100 text-emerald-700',
  'No-Show': 'bg-red-100 text-red-700',
  'Records Requested': 'bg-amber-100 text-amber-700',
  'Records Received': 'bg-amber-100 text-amber-700',
  'Records Delivered': 'bg-amber-100 text-amber-700',
  'Demand Sent': 'bg-violet-100 text-violet-700',
  'Offer Received': 'bg-violet-100 text-violet-700',
  'Counter Sent': 'bg-violet-100 text-violet-700',
  'Settlement Reached': 'bg-violet-100 text-violet-700',
  'Lien Paid': 'bg-violet-100 text-violet-700',
  'Case Closed': 'bg-muted text-muted-foreground',
};

const ROLES = ['admin', 'care_manager', 'patient', 'attorney', 'provider'];

export function TimelineTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'patient' | 'attorney'>('all');
  const [newEvent, setNewEvent] = useState({
    event_type: 'Intake',
    event_date: new Date().toISOString().split('T')[0],
    event_title: '',
    event_detail: '',
    visible_to: ['admin', 'care_manager'],
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('case_timelines')
        .select('*')
        .eq('case_id', caseId)
        .order('event_date', { ascending: true });
      return data || [];
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('case_timelines').insert({
        case_id: caseId,
        ...newEvent,
        auto_generated: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] });
      setShowAdd(false);
      toast.success('Event added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('case_timelines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] });
      toast.success('Event deleted');
    },
  });

  const filtered = events?.filter(e => {
    if (filter === 'patient') return e.visible_to?.includes('patient');
    if (filter === 'attorney') return e.visible_to?.includes('attorney');
    return true;
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" /> Case Timeline
        </h3>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="patient">Patient-Visible</SelectItem>
              <SelectItem value="attorney">Attorney-Visible</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Event
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No timeline events yet</p>
      ) : (
        <div className="relative ml-4 border-l-2 border-border pl-6 space-y-6">
          {filtered.map(e => (
            <div key={e.id} className="relative">
              <div className={`absolute -left-[31px] w-3 h-3 rounded-full border-2 border-background ${EVENT_COLORS[e.event_type]?.split(' ')[0] || 'bg-muted'}`} />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">{format(new Date(e.event_date), 'MMM d, yyyy')}</span>
                    <Badge variant="outline" className={`text-[10px] ${EVENT_COLORS[e.event_type] || ''}`}>
                      {e.event_type}
                    </Badge>
                    {e.auto_generated && <span className="text-[9px] text-muted-foreground">auto</span>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{e.event_title}</p>
                  {e.event_detail && <p className="text-xs text-muted-foreground">{e.event_detail}</p>}
                  <div className="flex gap-1 mt-1">
                    {e.visible_to?.map((r: string) => (
                      <span key={r} className="text-[9px] bg-accent px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                </div>
                {!e.auto_generated && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteEvent.mutate(e.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Timeline Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Event Type</Label>
                <Select value={newEvent.event_type} onValueChange={v => setNewEvent(p => ({ ...p, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={newEvent.event_date} onChange={e => setNewEvent(p => ({ ...p, event_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Title</Label><Input value={newEvent.event_title} onChange={e => setNewEvent(p => ({ ...p, event_title: e.target.value }))} placeholder="Event title..." /></div>
            <div className="space-y-2"><Label className="text-xs">Detail</Label><Textarea value={newEvent.event_detail} onChange={e => setNewEvent(p => ({ ...p, event_detail: e.target.value }))} rows={2} /></div>
            <div className="space-y-2">
              <Label className="text-xs">Visible To</Label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(r => (
                  <button key={r} type="button"
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      newEvent.visible_to.includes(r) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => setNewEvent(p => ({
                      ...p,
                      visible_to: p.visible_to.includes(r) ? p.visible_to.filter(x => x !== r) : [...p.visible_to, r],
                    }))}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => addEvent.mutate()} disabled={addEvent.isPending || !newEvent.event_title} className="w-full">
              Add Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
