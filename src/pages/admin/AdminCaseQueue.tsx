import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Check, X, MessageCircle } from 'lucide-react';

export default function AdminCaseQueue() {
  const qc = useQueryClient();
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoModal, setInfoModal] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [tab, setTab] = useState('pending');

  const { data: cases, isLoading } = useQuery({
    queryKey: ['admin-case-queue'],
    queryFn: async () => {
      const { data } = await (supabase.from('cases') as any)
        .select('*')
        .in('status', ['Marketplace', 'Rejected'])
        .order('marketplace_submitted_at', { ascending: false });
      return data || [];
    },
  });

  const pending = (cases || []).filter((c: any) => c.status === 'Marketplace' && !c.quality_gate_passed);
  const approved = (cases || []).filter((c: any) => c.status === 'Marketplace' && c.quality_gate_passed);
  const rejected = (cases || []).filter((c: any) => c.status === 'Rejected');

  const getMarketerProfileId = (c: any) => c?.marketer_profiles?.profile_id || c?.marketer_profiles?.profiles?.id;

  const approveMutation = useMutation({
    mutationFn: async (caseId: string) => {
      await (supabase.from('cases') as any).update({ quality_gate_passed: true }).eq('id', caseId);
      const c = (cases || []).find((cc: any) => cc.id === caseId);
      const recipientId = getMarketerProfileId(c);
      if (recipientId) {
        await (supabase.from('notifications') as any).insert({
          recipient_id: recipientId,
          title: 'Case Approved',
          message: `Your case ${c.case_number} is now live in the attorney marketplace.`,
          link: `/marketer/cases`,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-case-queue'] }); toast.success('Case approved for marketplace'); },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const c = (cases || []).find((cc: any) => cc.id === rejectModal);
      await (supabase.from('cases') as any).update({ status: 'Rejected', notes: rejectReason }).eq('id', rejectModal);
      const recipientId = getMarketerProfileId(c);
      if (recipientId) {
        await (supabase.from('notifications') as any).insert({
          recipient_id: recipientId,
          title: 'Case Not Approved',
          message: `Your case ${c?.case_number} was not approved. Reason: ${rejectReason}`,
          link: `/marketer/cases`,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-case-queue'] }); setRejectModal(null); setRejectReason(''); toast.success('Case rejected'); },
  });

  const requestInfo = useMutation({
    mutationFn: async () => {
      const c = (cases || []).find((cc: any) => cc.id === infoModal);
      const recipientId = getMarketerProfileId(c);
      if (recipientId) {
        await (supabase.from('notifications') as any).insert({
          recipient_id: recipientId,
          title: 'Additional Info Requested',
          message: `Admin requested info on case ${c?.case_number}: ${infoMessage}`,
          link: `/marketer/cases`,
        });
      }
    },
    onSuccess: () => { setInfoModal(null); setInfoMessage(''); toast.success('Info request sent'); },
  });

  const scorePill = (score: number) => {
    const cls = score < 60 ? 'bg-destructive/10 text-destructive' : score < 80 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success';
    return <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${cls}`}>{score}</span>;
  };

  if (isLoading) return <Skeleton className="h-96" />;

  const renderTable = (rows: any[], showActions: boolean, showDaysLive = false) => (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Case #</th>
            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Injury</th>
            <th className="text-left px-4 py-2 text-xs text-muted-foreground">State</th>
            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Score</th>
            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Marketer</th>
            <th className="text-left px-4 py-2 text-xs text-muted-foreground">Submitted</th>
            {showDaysLive && <th className="text-left px-4 py-2 text-xs text-muted-foreground">Days Live</th>}
            {showActions && <th className="text-right px-4 py-2 text-xs text-muted-foreground">Actions</th>}
          </tr></thead>
          <tbody>
            {rows.map((c: any) => (
              <tr key={c.id} className="border-b border-border">
                <td className="px-4 py-2 font-mono text-xs text-primary">{c.case_number}</td>
                <td className="px-4 py-2 text-xs">{c.specialty || '—'}</td>
                <td className="px-4 py-2 text-xs">{c.accident_state || '—'}</td>
                <td className="px-4 py-2">{scorePill(c.completeness_score || 0)}</td>
                <td className="px-4 py-2 text-xs">{c.marketer_profiles?.profiles?.full_name || '—'}</td>
                <td className="px-4 py-2 text-xs">{c.marketplace_submitted_at ? format(new Date(c.marketplace_submitted_at), 'MMM d') : '—'}</td>
                {showDaysLive && <td className="px-4 py-2 text-xs">{c.marketplace_submitted_at ? differenceInCalendarDays(new Date(), new Date(c.marketplace_submitted_at)) : '—'}</td>}
                {showActions && (
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => approveMutation.mutate(c.id)}><Check className="w-3 h-3 mr-1" />Approve</Button>
                      <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => setRejectModal(c.id)}><X className="w-3 h-3 mr-1" />Reject</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setInfoModal(c.id)}><MessageCircle className="w-3 h-3" /></Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No cases</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-foreground">Case Quality Control Queue</h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending Review {pending.length > 0 && <Badge variant="destructive" className="ml-1.5 text-[9px] h-4 px-1.5">{pending.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderTable(pending, true)}</TabsContent>
        <TabsContent value="approved" className="mt-4">{renderTable(approved, false, true)}</TabsContent>
        <TabsContent value="rejected" className="mt-4">{renderTable(rejected, false)}</TabsContent>
      </Tabs>

      <Dialog open={!!rejectModal} onOpenChange={v => !v && setRejectModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Case</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <Button variant="destructive" onClick={() => rejectMutation.mutate()}>Reject</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!infoModal} onOpenChange={v => !v && setInfoModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Request More Info</DialogTitle></DialogHeader>
          <Textarea placeholder="What info do you need?" value={infoMessage} onChange={e => setInfoMessage(e.target.value)} />
          <Button onClick={() => requestInfo.mutate()}>Send Request</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
