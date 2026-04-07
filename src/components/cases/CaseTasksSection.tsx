import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  Complete: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export function CaseTasksSection({ caseId }: { caseId: string }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'care_manager';
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data: tasks } = useQuery({
    queryKey: ['case-tasks-section', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('case_tasks')
        .select('*, profiles:assignee_id(full_name), cases:case_id(case_number, patient_name)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, role').in('role', ['admin', 'care_manager']);
      return data || [];
    },
  });

  const updateTask = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from('case_tasks').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['case-tasks-section', caseId] });
    toast.success('Task updated');
  };

  const updateStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'Complete' || status === 'Completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('case_tasks').update(updates).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-tasks-section', caseId] });
      toast.success('Task updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <ListTodo className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
        <Badge variant="secondary" className="text-[10px] ml-1">{tasks.length}</Badge>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-accent/50">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Task</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Assignee</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Due</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            {isAdmin && <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.map((t: any) => (
            <tr key={t.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => setSelectedTask(t)}>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${t.status === 'Complete' || t.status === 'Completed' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium">{t.title}</span>
                </div>
                {t.description && <p className="text-[11px] text-muted-foreground mt-0.5 ml-5 line-clamp-1">{t.description}</p>}
              </td>
              <td className="px-4 py-2.5 text-xs">{(t as any).profiles?.full_name || <span className="text-muted-foreground">Unassigned</span>}</td>
              <td className="px-4 py-2.5 font-mono text-[11px]">{t.due_date ? format(new Date(t.due_date), 'MMM d, yyyy') : '—'}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[t.status] || 'bg-muted text-muted-foreground border-border'}`}>
                  {t.status}
                </span>
              </td>
              {isAdmin && (
                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                  <Select value={t.status} onValueChange={v => updateStatus.mutate({ taskId: t.id, status: v })}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Pending', 'In Progress', 'Complete'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={open => { if (!open) setSelectedTask(null); }}
        task={selectedTask}
        staff={staff || []}
        onUpdate={updateTask}
      />
    </div>
  );
}
