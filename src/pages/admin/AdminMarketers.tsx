import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { Users, Clock, ShoppingBag, DollarSign, Check, X, Flag, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminMarketers() {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [flagModal, setFlagModal] = useState<any>(null);
  const [flagReason, setFlagReason] = useState('');

  const { data: apps, isLoading: loadingApps } = useQuery({
    queryKey: ['marketer-apps'],
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_applications') as any).select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['marketer-profiles-admin'],
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_profiles') as any).select('*, profiles!marketer_profiles_profile_id_fkey(full_name)');
      return data || [];
    },
  });

  const { data: pendingPayoutsTotal } = useQuery({
    queryKey: ['marketer-pending-payouts-total'],
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_payouts') as any).select('amount').eq('status', 'Pending');
      return (data || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
    },
  });

  const { data: marketplaceCases } = useQuery({
    queryKey: ['marketplace-count'],
    queryFn: async () => {
      const { count } = await (supabase.from('cases') as any).select('id', { count: 'exact', head: true }).eq('status', 'Marketplace');
      return count || 0;
    },
  });

  const approve = useMutation({
    mutationFn: async (app: any) => {
      // Create auth user via invite function
      const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-user', {
        body: { email: app.email, full_name: app.full_name, role: 'marketer' },
      });
      if (fnError) throw fnError;

      // Create marketer_profiles
      const profileId = fnData?.user_id;
      if (profileId) {
        await (supabase.from('marketer_profiles') as any).insert({
          profile_id: profileId,
          company_name: app.company_name,
          marketing_channels: app.marketing_channels,
          geographic_focus: app.geographic_focus,
          pi_experience: app.pi_experience,
        });
      }

      await (supabase.from('marketer_applications') as any).update({ status: 'Approved' }).eq('id', app.id);

      // Notify all admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins) {
        await (supabase.from('notifications') as any).insert(
          admins.map((a: any) => ({
            recipient_id: a.id,
            title: 'Marketer Application Approved',
            message: `${app.full_name} has been approved as a network marketer.`,
          }))
        );
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketer-apps'] }); qc.invalidateQueries({ queryKey: ['marketer-profiles-admin'] }); toast.success('Marketer approved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async () => {
      await (supabase.from('marketer_applications') as any).update({ status: 'Rejected', notes: rejectReason }).eq('id', rejectId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketer-apps'] }); setRejectId(null); setRejectReason(''); toast.success('Application rejected'); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await (supabase.from('marketer_profiles') as any).update({ active }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketer-profiles-admin'] }),
  });

  const flagMarketer = useMutation({
    mutationFn: async () => {
      await (supabase.from('marketer_profiles') as any).update({ flagged: true, flag_reason: flagReason }).eq('id', flagModal.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketer-profiles-admin'] }); setFlagModal(null); setFlagReason(''); toast.success('Marketer flagged'); },
  });

  const pendingApps = (apps || []).filter((a: any) => a.status === 'Pending');
  const activeMarketers = (profiles || []).length;

  const kpis = [
    { label: 'Active Marketers', value: activeMarketers, icon: Users, color: 'text-primary' },
    { label: 'Pending Applications', value: pendingApps.length, icon: Clock, color: 'text-warning' },
    { label: 'Cases in Marketplace', value: marketplaceCases || 0, icon: ShoppingBag, color: 'text-success' },
    { label: 'Payouts Pending', value: `$${(pendingPayoutsTotal || 0).toLocaleString()}`, icon: DollarSign, color: 'text-settled' },
  ];

  if (loadingApps || loadingProfiles) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-foreground">Marketer Management</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><k.icon className={`w-4 h-4 ${k.color}`} /><span className="text-[11px] text-muted-foreground">{k.label}</span></div>
            <p className="font-display text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications {pendingApps.length > 0 && <Badge variant="destructive" className="ml-1.5 text-[9px] h-4 px-1.5">{pendingApps.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="active">Active Marketers</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Channels</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2 text-xs text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {(apps || []).map((a: any) => (
                    <tr key={a.id} className="border-b border-border">
                      <td className="px-4 py-2 font-medium">{a.full_name}</td>
                      <td className="px-4 py-2 text-xs">{a.company_name || '—'}</td>
                      <td className="px-4 py-2 text-xs">{a.email}</td>
                      <td className="px-4 py-2"><div className="flex flex-wrap gap-1">{(a.marketing_channels || []).map((ch: string) => <Badge key={ch} variant="secondary" className="text-[9px]">{ch}</Badge>)}</div></td>
                      <td className="px-4 py-2"><Badge variant={a.status === 'Approved' ? 'default' : a.status === 'Rejected' ? 'destructive' : 'secondary'}>{a.status}</Badge></td>
                      <td className="px-4 py-2 text-right">
                        {a.status === 'Pending' && (
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" className="h-7 text-xs" onClick={() => approve.mutate(a)} disabled={approve.isPending}><Check className="w-3 h-3 mr-1" />Approve</Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setRejectId(a.id)}><X className="w-3 h-3 mr-1" />Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Channels</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Active</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground">Flagged</th>
                  <th className="text-right px-4 py-2 text-xs text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {(profiles || []).map((p: any) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="px-4 py-2 font-medium">{p.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-2 text-xs">{p.company_name || '—'}</td>
                      <td className="px-4 py-2"><div className="flex flex-wrap gap-1">{(p.marketing_channels || []).map((ch: string) => <Badge key={ch} variant="secondary" className="text-[9px]">{ch}</Badge>)}</div></td>
                      <td className="px-4 py-2"><Switch checked={p.active} onCheckedChange={v => toggleActive.mutate({ id: p.id, active: v })} /></td>
                      <td className="px-4 py-2">{p.flagged ? <Badge variant="destructive" className="text-[9px]">Flagged</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2 text-right">
                        {!p.flagged && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setFlagModal(p)}><Flag className="w-3 h-3 mr-1" />Flag</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={!!rejectId} onOpenChange={v => !v && setRejectId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <Button variant="destructive" onClick={() => reject.mutate()}>Reject</Button>
        </DialogContent>
      </Dialog>

      {/* Flag Modal */}
      <Dialog open={!!flagModal} onOpenChange={v => !v && setFlagModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Flag Marketer</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for flagging..." value={flagReason} onChange={e => setFlagReason(e.target.value)} />
          <Button variant="destructive" onClick={() => flagMarketer.mutate()}>Flag Marketer</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
