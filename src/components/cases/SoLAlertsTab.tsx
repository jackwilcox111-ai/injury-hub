import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Bell, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const TIER_LABELS: Record<number, string> = {
  365: '1 Year Warning',
  180: '6 Month Warning',
  90: '90 Day Warning',
  30: '30 Day Critical',
};

const TIER_COLORS: Record<number, string> = {
  365: 'bg-blue-50 text-blue-700 border-blue-200',
  180: 'bg-amber-50 text-amber-700 border-amber-200',
  90: 'bg-orange-50 text-orange-700 border-orange-200',
  30: 'bg-red-50 text-red-700 border-red-200',
};

export function SoLAlertsTab({ caseId }: { caseId: string }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['sol-alerts', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('sol_alerts')
        .select('*, acknowledged_profile:profiles!sol_alerts_acknowledged_by_fkey(full_name)')
        .eq('case_id', caseId)
        .order('sent_at', { ascending: false });
      return data || [];
    },
  });

  const acknowledge = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.from('sol_alerts').update({
        acknowledged: true,
        acknowledged_by: user?.id,
        acknowledged_at: new Date().toISOString(),
      }).eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sol-alerts', caseId] });
      toast.success('Alert acknowledged');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">SoL Alert History</h3>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : !alerts?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
          No SoL alerts sent for this case yet. Alerts are sent automatically at 365, 180, 90, and 30 days before the statute expires.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${TIER_COLORS[a.alert_tier] || 'bg-card border-border'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold">{TIER_LABELS[a.alert_tier] || `${a.alert_tier} Day Alert`}</span>
                <span className="text-xs text-muted-foreground">
                  Sent {a.sent_at ? format(new Date(a.sent_at), 'MMM d, yyyy') : '—'}
                </span>
                {a.recipient_email && <span className="text-[10px] text-muted-foreground">→ {a.recipient_email}</span>}
              </div>
              <div className="flex items-center gap-2">
                {a.acknowledged ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {a.acknowledged_profile?.full_name || 'Acknowledged'}
                  </span>
                ) : isAdmin ? (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => acknowledge.mutate(a.id)}>
                    Acknowledge
                  </Button>
                ) : (
                  <span className="text-xs text-amber-600">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
