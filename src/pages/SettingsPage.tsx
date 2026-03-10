import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csv-export';
import { Download, UserPlus, Settings as SettingsIcon, Database } from 'lucide-react';

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-blue-50 text-blue-600',
  care_manager: 'bg-emerald-50 text-emerald-600',
  attorney: 'bg-amber-50 text-amber-600',
  provider: 'bg-violet-50 text-violet-600',
};

export default function SettingsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ email: '', full_name: '', role: 'care_manager' });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*, attorneys:firm_id(firm_name), providers:provider_id(name)');
      return data || [];
    },
  });

  const { data: attorneys } = useQuery({
    queryKey: ['attorneys-active'],
    queryFn: async () => {
      const { data } = await supabase.from('attorneys').select('id, firm_name').eq('status', 'Active');
      return data || [];
    },
  });

  const { data: providers } = useQuery({
    queryKey: ['providers-active'],
    queryFn: async () => {
      const { data } = await supabase.from('providers').select('id, name').eq('status', 'Active');
      return data || [];
    },
  });

  const inviteUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: invite.email, full_name: invite.full_name, role: invite.role },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Invite sent to ${invite.email}`);
      setShowInvite(false);
      setInvite({ email: '', full_name: '', role: 'care_manager' });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to send invite'),
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-profiles'] }); toast.success('Updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleExportCases = async () => {
    const { data } = await supabase.from('cases_with_counts').select('*');
    if (data) exportToCSV(data as any, 'ghin-cases.csv');
  };

  const handleExportLiens = async () => {
    const { data } = await supabase.from('liens').select('*, cases!liens_case_id_fkey(case_number, patient_name), providers(name)');
    if (data) exportToCSV(data.map(l => ({
      case_number: (l as any).cases?.case_number, patient: (l as any).cases?.patient_name,
      provider: (l as any).providers?.name, amount: l.amount, reduction: l.reduction_amount,
      net: l.amount - l.reduction_amount, status: l.status,
    })), 'ghin-liens.csv');
  };

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Settings</h2><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage users, practice settings, and data exports</p>
      </div>

      {/* User Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Team Members</h3>
          <Button size="sm" onClick={() => setShowInvite(true)}><UserPlus className="w-4 h-4 mr-1.5" /> Invite User</Button>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Role</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Firm</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {profiles?.map(p => (
                <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium">{p.full_name || '—'}</td>
                  <td className="px-5 py-3.5">
                    {p.id === profile?.id ? (
                      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${roleBadgeStyles[p.role]}`}>{p.role.replace('_', ' ')}</span>
                    ) : (
                      <Select value={p.role} onValueChange={v => updateProfile.mutate({ id: p.id, updates: { role: v } })}>
                        <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{['admin', 'care_manager', 'attorney', 'provider'].map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {p.role === 'attorney' ? (
                      <Select value={p.firm_id || ''} onValueChange={v => updateProfile.mutate({ id: p.id, updates: { firm_id: v || null } })}>
                        <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Assign firm..." /></SelectTrigger>
                        <SelectContent>{attorneys?.map(a => <SelectItem key={a.id} value={a.id}>{a.firm_name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (p as any).attorneys?.firm_name || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {p.role === 'provider' ? (
                      <Select value={p.provider_id || ''} onValueChange={v => updateProfile.mutate({ id: p.id, updates: { provider_id: v || null } })}>
                        <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Assign provider..." /></SelectTrigger>
                        <SelectContent>{providers?.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (p as any).providers?.name || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Practice Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Practice Settings</h3>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Default SoL Period</span><span className="font-medium">730 days (Florida — 2 years)</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span className="font-medium">Got Hurt Injury Network</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span className="font-mono text-sm">admin@gothurtnetwork.com</span></div>
        </div>
      </div>

      {/* Data Export */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Data Export</h3>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCases}><Download className="w-4 h-4 mr-1.5" /> Export All Cases</Button>
          <Button variant="outline" onClick={handleExportLiens}><Download className="w-4 h-4 mr-1.5" /> Export All Liens</Button>
        </div>
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); inviteUser.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Email *</Label><Input value={invite.email} onChange={e => setInvite(p => ({...p, email: e.target.value}))} required type="email" className="h-10" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Full Name *</Label><Input value={invite.full_name} onChange={e => setInvite(p => ({...p, full_name: e.target.value}))} required className="h-10" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium">Role</Label>
              <Select value={invite.role} onValueChange={v => setInvite(p => ({...p, role: v}))}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{['admin', 'care_manager', 'attorney', 'provider'].map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button><Button type="submit" disabled={inviteUser.isPending}>{inviteUser.isPending ? 'Sending...' : 'Send Invite'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
