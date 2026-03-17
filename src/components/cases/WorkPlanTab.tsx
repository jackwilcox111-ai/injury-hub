import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ListTodo, Plus, CheckCircle2, Circle, Clock, Play } from 'lucide-react';
import { format } from 'date-fns';

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Skipped'];

export function WorkPlanTab({ caseId, caseStatus }: { caseId: string; caseStatus: string }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const isAdminOrCM = profile?.role === 'admin' || profile?.role === 'care_manager';

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['case-tasks', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('case_tasks')
        .select('*, assignee:profiles!case_tasks_assignee_id_fkey(full_name)')
        .eq('case_id', caseId)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['workplan-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('workplan_templates').select('*').order('name');
      return data || [];
    },
  });

  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });

  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('case_tasks').insert({
        case_id: caseId,
        title: newTask.title,
        description: newTask.description || null,
        due_date: newTask.due_date || null,
        assignee_id: user?.id,
        sort_order: (tasks?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] });
      setShowAdd(false);
      setNewTask({ title: '', description: '', due_date: '' });
      toast.success('Task added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'Completed') updates.completed_at = new Date().toISOString();
      else updates.completed_at = null;
      const { error } = await supabase.from('case_tasks').update(updates).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const applyTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates?.find((t: any) => t.id === templateId);
      if (!template) return;
      const taskDefs = template.tasks as any[];
      const inserts = taskDefs.map((t: any, idx: number) => ({
        case_id: caseId,
        title: t.title,
        description: t.description || null,
        due_date: t.due_days_offset ? format(new Date(Date.now() + t.due_days_offset * 86400000), 'yyyy-MM-dd') : null,
        workplan_template_id: templateId,
        sort_order: (tasks?.length || 0) + idx + 1,
      }));
      const { error } = await supabase.from('case_tasks').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] });
      setShowApplyTemplate(false);
      toast.success('Work plan applied');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completed = tasks?.filter((t: any) => t.status === 'Completed').length || 0;
  const total = tasks?.length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'In Progress': return <Play className="w-4 h-4 text-blue-600" />;
      case 'Skipped': return <Circle className="w-4 h-4 text-muted-foreground line-through" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Work Plan</h3>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">{completed}/{total} ({progress}%)</span>
          )}
        </div>
        {isAdminOrCM && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowApplyTemplate(true)}>
              Apply Template
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
            </Button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="w-full bg-border rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : !tasks?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
          No tasks. Apply a template or add tasks manually.
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((t: any) => (
            <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              t.status === 'Completed' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-card border-border'
            }`}>
              <button
                onClick={() => {
                  const next = t.status === 'Completed' ? 'Pending' : 'Completed';
                  updateTaskStatus.mutate({ taskId: t.id, status: next });
                }}
                className="mt-0.5 shrink-0"
              >
                {statusIcon(t.status)}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${t.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {t.title}
                </p>
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  {t.due_date && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" /> Due {t.due_date}
                    </span>
                  )}
                  {t.assignee?.full_name && (
                    <span className="text-[10px] text-muted-foreground">→ {t.assignee.full_name}</span>
                  )}
                </div>
              </div>
              {isAdminOrCM && t.status !== 'Completed' && (
                <Select value={t.status} onValueChange={v => updateTaskStatus.mutate({ taskId: t.id, status: v })}>
                  <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addTask.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addTask.isPending || !newTask.title}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={showApplyTemplate} onOpenChange={setShowApplyTemplate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply Work Plan Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!templates?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No templates available. Create one in Settings.</p>
            ) : (
              templates.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate.mutate(t.id)}
                  className="w-full text-left p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trigger: {t.trigger_status} · {(t.tasks as any[])?.length || 0} tasks
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
