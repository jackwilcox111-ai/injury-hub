import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

type ReferralData = {
  id: string;
  specialty: string | null;
  status: string;
  token_expires_at: string | null;
  responded_at: string | null;
  cases: { case_number: string; attorneys: { firm_name: string } | null } | null;
};

export default function ReferralAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'Accepted' | 'Declined' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No referral token provided.');
      setLoading(false);
      return;
    }
    loadReferral();
  }, [token]);

  async function loadReferral() {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('referral-token', {
        body: { action: 'lookup', token },
      });

      if (fnError || !data || data.error) {
        setError(data?.error || 'Referral not found or link is invalid.');
        setLoading(false);
        return;
      }

      setReferral(data);
      setLoading(false);
    } catch {
      setError('Referral not found or link is invalid.');
      setLoading(false);
    }
  }

  const isExpired = referral?.token_expires_at && new Date(referral.token_expires_at) < new Date();
  const alreadyResponded = referral?.responded_at || (referral?.status !== 'Pending');

  async function handleRespond(status: 'Accepted' | 'Declined') {
    if (!referral) return;
    setSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('referral-token', {
        body: { action: 'respond', token, status, notes: notes || null },
      });

      if (fnError || !data || data.error) {
        setError(data?.error || 'Failed to submit response. Please try again.');
        setSubmitting(false);
        return;
      }

      setResult(status);
      setSubmitting(false);
    } catch {
      setError('Failed to submit response. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Got Hurt</h1>
          <p className="text-xs text-muted-foreground tracking-wider uppercase">Injury Network</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          {error ? (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm text-foreground font-medium">{error}</p>
              <p className="text-xs text-muted-foreground">
                Please contact Got Hurt Injury Network if you believe this is an error.
              </p>
            </div>
          ) : result ? (
            <div className="p-8 text-center space-y-3">
              {result === 'Accepted' ? (
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              )}
              <h2 className="text-lg font-semibold text-foreground">
                Referral {result}
              </h2>
              <p className="text-sm text-muted-foreground">
                {result === 'Accepted'
                  ? 'Thank you! The care team will be in touch with next steps.'
                  : 'The referring team has been notified. Thank you for your response.'}
              </p>
            </div>
          ) : isExpired ? (
            <div className="p-8 text-center space-y-3">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">Referral Expired</h2>
              <p className="text-sm text-muted-foreground">
                This referral link has expired. Please contact Got Hurt Injury Network for a new referral.
              </p>
            </div>
          ) : alreadyResponded ? (
            <div className="p-8 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">Already Responded</h2>
              <p className="text-sm text-muted-foreground">
                This referral has already been responded to.
              </p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-border text-center">
                <h2 className="text-lg font-semibold text-foreground">
                  You've received a patient referral
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Case Reference</span>
                    <p className="font-mono font-medium">{referral?.cases?.case_number || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Referring Attorney</span>
                    <p className="font-medium">{(referral?.cases as any)?.attorneys?.firm_name || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-muted-foreground block">Specialty Requested</span>
                    <p className="font-medium">{referral?.specialty || 'General'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g., Earliest availability: 2 weeks"
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleRespond('Accepted')}
                    disabled={submitting}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Referral
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleRespond('Declined')}
                    disabled={submitting}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Referral
                  </Button>
                </div>
              </div>

              <div className="px-6 py-3 bg-accent/50 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                  HIPAA Notice: No patient-identifying information is shared on this page.
                  Full details will be provided after acceptance through the secure provider portal.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          © {new Date().getFullYear()} Got Hurt Injury Network · CareLink Platform
        </p>
      </div>
    </div>
  );
}
