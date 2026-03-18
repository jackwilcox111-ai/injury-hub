import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CompletenessScoreRing } from '@/components/global/CompletenessScoreRing';
import { MarketerStatusTimeline } from '@/components/global/MarketerStatusTimeline';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function MarketerCaseDetail() {
  const { id } = useParams();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['marketer-case', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase.from('cases') as any).select('*').eq('id', id).single();
      return data;
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ['marketer-case-payouts', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_payouts') as any).select('*').eq('case_id', id);
      return data || [];
    },
  });

  const { data: docs } = useQuery({
    queryKey: ['marketer-case-docs', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('file_name, document_type').eq('case_id', id!);
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!caseData) return <p className="text-muted-foreground py-12 text-center">Case not found</p>;

  const payout = payouts?.[0];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-foreground">Case {caseData.case_number}</h2>

      <MarketerStatusTimeline status={caseData.status} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1 */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Case Summary</h3>
          <div className="flex justify-center"><CompletenessScoreRing score={caseData.completeness_score || 0} /></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-[11px] text-muted-foreground">Case #</span><p className="font-mono">{caseData.case_number}</p></div>
            <div><span className="text-[11px] text-muted-foreground">Status</span><div className="mt-0.5"><StatusBadge status={caseData.status} /></div></div>
            <div><span className="text-[11px] text-muted-foreground">Injury Type</span><p>{caseData.specialty || '—'}</p></div>
            <div><span className="text-[11px] text-muted-foreground">State</span><p>{caseData.accident_state || '—'}</p></div>
            <div><span className="text-[11px] text-muted-foreground">Accident Date</span><p>{caseData.accident_date ? format(new Date(caseData.accident_date), 'MMM d, yyyy') : '—'}</p></div>
            <div><span className="text-[11px] text-muted-foreground">Submitted</span><p>{caseData.marketplace_submitted_at ? format(new Date(caseData.marketplace_submitted_at), 'MMM d, yyyy') : '—'}</p></div>
          </div>
          {caseData.marketer_consent_signed && (
            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              Patient consent on file • Signed {caseData.marketer_consent_signed_at ? format(new Date(caseData.marketer_consent_signed_at), 'MMM d, yyyy') : ''}
            </div>
          )}
          {docs && docs.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-1">Documents</p>
              {docs.map((d, i) => <p key={i} className="text-xs">{d.file_name}</p>)}
            </div>
          )}
        </div>

        {/* Panel 2 */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Status & Payout</h3>
          {payout ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[11px] text-muted-foreground">Trigger</span><p>{payout.trigger_event}</p></div>
                <div><span className="text-[11px] text-muted-foreground">Amount</span><p className="font-mono font-bold">${Number(payout.amount).toLocaleString()}</p></div>
                <div><span className="text-[11px] text-muted-foreground">Status</span><p><StatusBadge status={payout.status} /></p></div>
                {payout.paid_at && <div><span className="text-[11px] text-muted-foreground">Paid</span><p>{format(new Date(payout.paid_at), 'MMM d, yyyy')}</p></div>}
                {payout.payment_reference && <div><span className="text-[11px] text-muted-foreground">Reference</span><p className="font-mono text-xs">{payout.payment_reference}</p></div>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payout record yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
