import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { CheckSquare, Clock, AlertCircle, User } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';

export default function TaskDashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['admin-all-tasks', filterStatus],
    queryFn: async () => {
      let q = supabase.from('case_tasks')
        .select('*, cases!case_tasks_case_id_fkey(case_number, patient_name), profiles!case_tasks_assignee_id_fkey(full_name)')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').in('role', ['admin', 'care_manager']);
      return data || [];
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from('case_tasks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-tasks'] });
      toast.success('Task updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = tasks?.filter(t => {
    if (filterAssignee !== 'all' && t.assignee_id !== filterAssignee) return false;
    return true;
  }) || [];

  const overdue = filtered.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'Complete').length;

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Task Dashboard</h2><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground">Task Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">All case tasks across the portfolio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{tasks?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total Tasks</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600 tabular-nums">{tasks?.filter(t => t.status === 'Pending').length || 0}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 tabular-nums">{tasks?.filter(t => t.status === 'In Progress').length || 0}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600 tabular-nums">{overdue}</p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Complete">Complete</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name || 'Unnamed'}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Task</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Assignee</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Due</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map(t => {
              const isOverdue = t.due_date && isPast(new Date(t.due_date)) && t.status !== 'Complete';
              return (
                <tr key={t.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => setSelectedTask(t)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground text-xs">{t.title}</div>
                    {t.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-primary">{(t as any).cases?.case_number}</span>
                    <p className="text-[10px] text-muted-foreground">{(t as any).cases?.patient_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground" onClick={e => e.stopPropagation()}>
                    <Select value={t.assignee_id || ''} onValueChange={v => updateTask.mutate({ id: t.id, updates: { assignee_id: v || null } })}>
                      <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>{staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name || 'Unnamed'}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {t.due_date ? format(new Date(t.due_date), 'MMM d') : '—'}
                    {isOverdue && <AlertCircle className="w-3 h-3 inline ml-1" />}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={t.status === 'Complete' ? 'default' : t.status === 'In Progress' ? 'secondary' : 'outline'} className="text-[10px]">
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {t.status !== 'Complete' && (
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-600"
                        onClick={() => updateTask.mutate({ id: t.id, updates: { status: 'Complete', completed_at: new Date().toISOString() } })}>
                        <CheckSquare className="w-3 h-3 mr-1" /> Done
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tasks match filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={open => { if (!open) setSelectedTask(null); }}
        task={selectedTask}
        staff={staff || []}
        onUpdate={(id, updates) => updateTask.mutate({ id, updates })}
      />
    </div>
  );
}
