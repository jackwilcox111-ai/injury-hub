import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { exportToCSV } from '@/lib/csv-export';
import { DollarSign, Download, Check, CreditCard, Ban } from 'lucide-react';

export default function AdminPayouts() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [payRef, setPayRef] = useState('');
  const [payId, setPayId] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_payouts') as any)
        .select('*, cases!marketer_payouts_case_id_fkey(case_number), marketer_profiles!marketer_payouts_marketer_id_fkey(profile_id, company_name, profiles!marketer_profiles_profile_id_fkey(full_name)), approver:profiles!marketer_payouts_approved_by_fkey(full_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const notifyMarketer = async (payout: any, title: string, message: string) => {
    const recipientId = payout?.marketer_profiles?.profile_id;
    if (recipientId) {
      await (supabase.from('notifications') as any).insert({
        recipient_id: recipientId,
        title,
        message,
        link: '/marketer/earnings',
      });
    }
  };

  const approve = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('marketer_payouts') as any).update({
        status: 'Approved', approved_by: profile!.id, approved_at: new Date().toISOString(),
      }).eq('id', id);
      const p = (payouts || []).find((pp: any) => pp.id === id);
      if (p) await notifyMarketer(p, 'Payout Approved', `Your payout of $${Number(p.amount).toLocaleString()} for case ${p.cases?.case_number} has been approved.`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-payouts'] }); toast.success('Payout approved'); },
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      await (supabase.from('marketer_payouts') as any).update({
        status: 'Paid', paid_at: new Date().toISOString(), payment_reference: payRef,
      }).eq('id', payId);
      const p = (payouts || []).find((pp: any) => pp.id === payId);
      if (p) await notifyMarketer(p, 'Payment Sent', `Your payment of $${Number(p.amount).toLocaleString()} for case ${p.cases?.case_number} has been sent.`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-payouts'] }); setPayId(null); setPayRef(''); toast.success('Marked as paid'); },
  });

  const voidPayout = useMutation({
    mutationFn: async () => {
      await (supabase.from('marketer_payouts') as any).update({ status: 'Voided', notes: voidReason }).eq('id', voidId);
      const p = (payouts || []).find((pp: any) => pp.id === voidId);
      if (p) await notifyMarketer(p, 'Payout Voided', `Your payout of $${Number(p.amount).toLocaleString()} for case ${p.cases?.case_number} has been voided. Reason: ${voidReason}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-payouts'] }); setVoidId(null); setVoidReason(''); toast.success('Payout voided'); },
  });

  const all = payouts || [];
  const filtered = tab === 'all' ? all : all.filter((p: any) => p.status.toLowerCase() === tab);

  const sumByStatus = (status: string) => all.filter((p: any) => p.status === status).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const paidThisMonth = all.filter((p: any) => p.status === 'Paid' && p.paid_at && new Date(p.paid_at).getMonth() === new Date().getMonth()).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const paidAllTime = sumByStatus('Paid');

  const kpis = [
    { label: 'Total Pending', value: `$${sumByStatus('Pending').toLocaleString()}` },
    { label: 'Approved (Not Paid)', value: `$${sumByStatus('Approved').toLocaleString()}` },
    { label: 'Paid This Month', value: `$${paidThisMonth.toLocaleString()}` },
    { label: 'Paid All Time', value: `$${paidAllTime.toLocaleString()}` },
  ];

  const handleExport = () => {
    const rows = filtered.map((p: any) => ({
      'Marketer': p.marketer_profiles?.profiles?.full_name || '',
      'Case #': p.cases?.case_number || '',
      'Trigger': p.trigger_event,
      'Amount': p.amount,
      'Status': p.status,
      'Approved': p.approved_at || '',
      'Paid': p.paid_at || '',
      'Reference': p.payment_reference || '',
    }));
    exportToCSV(rows, 'marketer-payouts');
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">Marketer Payouts</h2>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[11px] text-muted-foreground mb-1">{k.label}</p>
            <p className="font-display text-xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="voided">Voided</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-xs text-muted-foreground">Marketer</th>
              <th className="text-left px-3 py-2 text-xs text-muted-foreground">Case #</th>
              <th className="text-left px-3 py-2 text-xs text-muted-foreground">Trigger</th>
              <th className="text-right px-3 py-2 text-xs text-muted-foreground">Amount</th>
              <th className="text-left px-3 py-2 text-xs text-muted-foreground">Status</th>
              <th className="text-left px-3 py-2 text-xs text-muted-foreground">Paid</th>
              <th className="text-right px-3 py-2 text-xs text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="px-3 py-2 text-xs">{p.marketer_profiles?.profiles?.full_name || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-primary">{p.cases?.case_number || '—'}</td>
                  <td className="px-3 py-2 text-xs">{p.trigger_event}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">${Number(p.amount).toLocaleString()}</td>
                  <td className="px-3 py-2"><Badge variant={p.status === 'Paid' ? 'default' : p.status === 'Voided' ? 'destructive' : 'secondary'} className="text-[9px]">{p.status}</Badge></td>
                  <td className="px-3 py-2 text-xs">{p.paid_at ? format(new Date(p.paid_at), 'MMM d') : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      {p.status === 'Pending' && <Button size="sm" className="h-6 text-[10px]" onClick={() => approve.mutate(p.id)}><Check className="w-3 h-3 mr-1" />Approve</Button>}
                      {p.status === 'Approved' && <Button size="sm" className="h-6 text-[10px]" onClick={() => setPayId(p.id)}><CreditCard className="w-3 h-3 mr-1" />Mark Paid</Button>}
                      {['Pending', 'Approved'].includes(p.status) && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setVoidId(p.id)}><Ban className="w-3 h-3" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No payouts</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!payId} onOpenChange={v => !v && setPayId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
          <Input placeholder="Payment reference (check #, ACH ref...)" value={payRef} onChange={e => setPayRef(e.target.value)} />
          <Button onClick={() => markPaid.mutate()}>Confirm Payment</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidId} onOpenChange={v => !v && setVoidId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Void Payout</DialogTitle></DialogHeader>
          <Input placeholder="Reason" value={voidReason} onChange={e => setVoidReason(e.target.value)} />
          <Button variant="destructive" onClick={() => voidPayout.mutate()}>Void</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
