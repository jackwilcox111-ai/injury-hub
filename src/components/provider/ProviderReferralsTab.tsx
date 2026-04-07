import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Send, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const STATUS_STYLES: Record<string, string> = {
  Sent: 'bg-primary/10 text-primary border-primary/20',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Declined: 'bg-red-100 text-red-700 border-red-200',
};

export function ProviderReferralsTab() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState<any>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseAction, setResponseAction] = useState<'accept' | 'decline'>('accept');

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['provider-referrals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals')
        .select('*, cases!referrals_case_id_fkey(id, case_number, patient_name, patient_phone, specialty, status, accident_date, attorneys!cases_attorney_id_fkey(firm_name))')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('referrals').update({
        status,
        responded_at: new Date().toISOString(),
        response_notes: responseNotes || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(status === 'Accepted' ? 'Referral accepted — patient added to your pipeline' : 'Referral declined');
      queryClient.invalidateQueries({ queryKey: ['provider-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['provider-cases'] });
      setRespondingTo(null);
      setResponseNotes('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pendingReferrals = referrals?.filter(r => r.status === 'Sent' || r.status === 'Pending') || [];
  const respondedReferrals = referrals?.filter(r => r.status === 'Accepted' || r.status === 'Declined') || [];

  if (isLoading) return <Skeleton className="h-60 rounded-xl" />;

  return (
    <div className="space-y-6">
      {/* Pending Referrals */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Pending Referrals</h3>
            {pendingReferrals.length > 0 && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                {pendingReferrals.length} awaiting response
              </Badge>
            )}
          </div>
        </div>

        {pendingReferrals.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No pending referrals — you're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendingReferrals.map(r => {
              const c = (r as any).cases;
              return (
                <div key={r.id} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{c?.patient_name || 'Unknown Patient'}</span>
                        <span className="font-mono text-[11px] text-primary">{c?.case_number}</span>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[r.status]}`}>{r.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        {r.specialty && <span>Specialty: <strong className="text-foreground">{r.specialty}</strong></span>}
                        {c?.attorneys?.firm_name && <span>Firm: {c.attorneys.firm_name}</span>}
                        {c?.accident_date && <span>DOI: {format(new Date(c.accident_date), 'MM/dd/yyyy')}</span>}
                        <span>Referred: {format(new Date(r.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {r.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 bg-accent/50 p-2 rounded">{r.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => { setRespondingTo(r); setResponseAction('accept'); setResponseNotes(''); }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => { setRespondingTo(r); setResponseAction('decline'); setResponseNotes(''); }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {respondedReferrals.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Referral History
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Case #</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Specialty</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Referred</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Responded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {respondedReferrals.map(r => {
                const c = (r as any).cases;
                return (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3 text-xs font-medium">{c?.patient_name || '—'}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-primary">{c?.case_number || '—'}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{r.specialty || '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs">{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[r.status] || ''}`}>{r.status}</Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {r.responded_at ? format(new Date(r.responded_at), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Respond Dialog */}
      <Dialog open={!!respondingTo} onOpenChange={open => { if (!open) setRespondingTo(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {responseAction === 'accept' ? (
                <><CheckCircle className="w-4 h-4 text-success" /> Accept Referral</>
              ) : (
                <><XCircle className="w-4 h-4 text-destructive" /> Decline Referral</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {respondingTo && (
              <div className="text-xs space-y-1 bg-accent/50 p-3 rounded-lg">
                <p><strong>Patient:</strong> {(respondingTo as any).cases?.patient_name}</p>
                <p><strong>Case:</strong> {(respondingTo as any).cases?.case_number}</p>
                {respondingTo.specialty && <p><strong>Specialty:</strong> {respondingTo.specialty}</p>}
              </div>
            )}

            {responseAction === 'decline' && (
              <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Declining will notify the care team so they can find another provider for this patient.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Notes (optional)</label>
              <Textarea
                value={responseNotes}
                onChange={e => setResponseNotes(e.target.value)}
                rows={3}
                className="text-xs"
                placeholder={responseAction === 'accept'
                  ? "Any scheduling preferences or notes for the care team..."
                  : "Reason for declining (optional)..."}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>Cancel</Button>
              <Button
                size="sm"
                variant={responseAction === 'accept' ? 'default' : 'destructive'}
                disabled={respondMutation.isPending}
                onClick={() => respondMutation.mutate({
                  id: respondingTo.id,
                  status: responseAction === 'accept' ? 'Accepted' : 'Declined',
                })}
              >
                {respondMutation.isPending ? 'Saving...' : responseAction === 'accept' ? 'Accept Referral' : 'Decline Referral'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
