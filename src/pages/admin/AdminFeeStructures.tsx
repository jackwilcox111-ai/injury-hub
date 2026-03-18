import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function AdminFeeStructures() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', trigger_event: 'Case Accepted', amount: '', is_percentage: false, applies_to: 'All', marketer_id: '', active: true });

  const { data: fees, isLoading } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: async () => {
      const { data } = await (supabase.from('fee_structures') as any).select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: marketers } = useQuery({
    queryKey: ['marketer-profiles-select'],
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_profiles') as any).select('id, company_name, profiles!marketer_profiles_profile_id_fkey(full_name)');
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, trigger_event: form.trigger_event,
        amount: parseFloat(form.amount), is_percentage: form.is_percentage,
        applies_to: form.applies_to,
        marketer_id: form.applies_to === 'Specific Marketer' ? form.marketer_id || null : null,
        active: form.active,
      };
      if (editId) {
        await (supabase.from('fee_structures') as any).update(payload).eq('id', editId);
      } else {
        await (supabase.from('fee_structures') as any).insert(payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-structures'] }); setModal(false); setEditId(null); toast.success('Fee structure saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await (supabase.from('fee_structures') as any).update({ active }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fee-structures'] }),
  });

  const openEdit = (fee: any) => {
    setForm({ name: fee.name, trigger_event: fee.trigger_event, amount: String(fee.amount), is_percentage: fee.is_percentage, applies_to: fee.applies_to, marketer_id: fee.marketer_id || '', active: fee.active });
    setEditId(fee.id);
    setModal(true);
  };

  const openNew = () => {
    setForm({ name: '', trigger_event: 'Case Accepted', amount: '', is_percentage: false, applies_to: 'All', marketer_id: '', active: true });
    setEditId(null);
    setModal(true);
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">Fee Structures</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />New Fee Structure</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Trigger</th>
              <th className="text-right px-4 py-2 text-xs text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Applies To</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Active</th>
              <th className="text-right px-4 py-2 text-xs text-muted-foreground">Edit</th>
            </tr></thead>
            <tbody>
              {(fees || []).map((f: any) => (
                <tr key={f.id} className="border-b border-border">
                  <td className="px-4 py-2 font-medium">{f.name}</td>
                  <td className="px-4 py-2"><Badge variant="secondary" className="text-[10px]">{f.trigger_event}</Badge></td>
                  <td className="px-4 py-2 text-right font-mono">{f.is_percentage ? `${f.amount}%` : `$${Number(f.amount).toLocaleString()}`}</td>
                  <td className="px-4 py-2 text-xs">{f.applies_to}</td>
                  <td className="px-4 py-2"><Switch checked={f.active} onCheckedChange={v => toggleActive.mutate({ id: f.id, active: v })} /></td>
                  <td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(f)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modal} onOpenChange={v => !v && setModal(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Fee Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Trigger Event</Label>
              <Select value={form.trigger_event} onValueChange={v => setForm(p => ({ ...p, trigger_event: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Case Accepted">Case Accepted</SelectItem>
                  <SelectItem value="Case Settled">Case Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_percentage} onCheckedChange={v => setForm(p => ({ ...p, is_percentage: v }))} />
              <Label>{form.is_percentage ? 'Percentage' : 'Flat Amount'}</Label>
            </div>
            <div className="space-y-2"><Label>{form.is_percentage ? 'Percentage' : 'Amount ($)'}</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(p => ({ ...p, applies_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Marketers</SelectItem>
                  <SelectItem value="Specific Marketer">Specific Marketer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.applies_to === 'Specific Marketer' && (
              <div className="space-y-2">
                <Label>Marketer</Label>
                <Select value={form.marketer_id} onValueChange={v => setForm(p => ({ ...p, marketer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(marketers || []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.profiles?.full_name || m.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">{save.isPending ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
