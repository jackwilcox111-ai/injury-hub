import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Send, RotateCcw, Eye } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Declined: 'bg-red-100 text-red-700 border-red-200',
  Expired: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  caseId: string;
  onSendReferral: () => void;
}

export function ProviderReferralsModule({ caseId, onSendReferral }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const canSendReferral = profile?.role === 'admin' || profile?.role === 'care_manager';

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['case-referrals', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals')
        .select('*, providers(name, specialty, email, phone)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (referralId: string) => {
      // Generate a new token and reset expiry
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('referrals')
        .update({ token, token_expires_at: expiresAt, status: 'Pending', responded_at: null } as any)
        .eq('id', referralId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-referrals', caseId] });
      toast.success('Referral resent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = {
    sent: referrals?.length || 0,
    accepted: referrals?.filter(r => r.status === 'Accepted').length || 0,
    pending: referrals?.filter(r => r.status === 'Pending').length || 0,
  };

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Provider Referrals</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts.sent} sent · {counts.accepted} accepted · {counts.pending} pending
          </p>
        </div>
        {canSendReferral && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onSendReferral}>
            <Send className="w-3.5 h-3.5" /> Send Referral
          </Button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-accent/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider Name</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Referred Date</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Method</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Responded</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {referrals?.map(r => {
            const provider = (r as any).providers;
            const isResendable = r.status === 'Pending' || r.status === 'Expired';
            return (
              <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-5 py-3 text-xs font-medium">{provider?.name || '—'}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{r.specialty || provider?.specialty || '—'}</td>
                <td className="px-5 py-3 font-mono text-xs">{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                <td className="px-5 py-3 text-xs">{(r as any).referral_method || 'Email'}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[r.status] || ''}`}>
                    {r.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-mono text-xs">
                  {(r as any).responded_at ? format(new Date((r as any).responded_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    {isResendable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => resendMutation.mutate(r.id)}
                        disabled={resendMutation.isPending}
                      >
                        <RotateCcw className="w-3 h-3" /> Resend
                      </Button>
                    )}
                    {(r as any).token && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => {
                          const url = `${window.location.origin}/referral/accept?token=${(r as any).token}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Referral link copied');
                        }}
                      >
                        <Eye className="w-3 h-3" /> Copy Link
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {(!referrals || referrals.length === 0) && (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                No referrals sent yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
