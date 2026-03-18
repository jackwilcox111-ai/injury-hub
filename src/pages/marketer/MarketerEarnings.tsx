import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Download, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { exportToCSV } from '@/lib/csv-export';

export default function MarketerEarnings() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('all');

  const { data: marketerProfile } = useQuery({
    queryKey: ['marketer-profile', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_profiles') as any).select('*').eq('profile_id', profile!.id).maybeSingle();
      return data;
    },
  });

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['marketer-earnings', marketerProfile?.id],
    enabled: !!marketerProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_payouts') as any)
        .select('*, cases!marketer_payouts_case_id_fkey(case_number, specialty, accident_state)')
        .eq('marketer_id', marketerProfile!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const now = new Date();
  const paid = (payouts || []).filter((p: any) => p.status === 'Paid');
  const totalEarned = paid.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const ytd = paid.filter((p: any) => p.paid_at && new Date(p.paid_at).getFullYear() === now.getFullYear()).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const mtd = paid.filter((p: any) => p.paid_at && new Date(p.paid_at).getMonth() === now.getMonth() && new Date(p.paid_at).getFullYear() === now.getFullYear()).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const pending = (payouts || []).filter((p: any) => ['Pending', 'Approved'].includes(p.status)).reduce((s: number, p: any) => s + Number(p.amount), 0);

  const filtered = tab === 'all' ? payouts : (payouts || []).filter((p: any) => p.status === tab.charAt(0).toUpperCase() + tab.slice(1));

  const handleExport = () => {
    const rows = (filtered || []).map((p: any) => ({
      'Case #': p.cases?.case_number || '',
      'Trigger': p.trigger_event,
      'Amount': p.amount,
      'Status': p.status,
      'Approved': p.approved_at ? format(new Date(p.approved_at), 'yyyy-MM-dd') : '',
      'Paid': p.paid_at ? format(new Date(p.paid_at), 'yyyy-MM-dd') : '',
      'Reference': p.payment_reference || '',
    }));
    exportToCSV(rows, 'marketer-earnings');
  };

  if (isLoading) return <Skeleton className="h-96" />;

  const kpis = [
    { label: 'Total Earned', value: `$${totalEarned.toLocaleString()}` },
    { label: 'YTD', value: `$${ytd.toLocaleString()}` },
    { label: 'MTD', value: `$${mtd.toLocaleString()}` },
    { label: 'Pending', value: `$${pending.toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">Earnings</h2>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[11px] text-muted-foreground mb-1">{k.label}</p>
            <p className="font-display text-2xl font-bold text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Case #</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Trigger</th>
              <th className="text-right px-4 py-2 text-xs text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Paid</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Reference</th>
            </tr></thead>
            <tbody>
              {(filtered || []).map((p: any) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="px-4 py-2 font-mono text-xs text-primary">{p.cases?.case_number || '—'}</td>
                  <td className="px-4 py-2 text-xs">{p.trigger_event}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">${Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2 text-xs">{p.paid_at ? format(new Date(p.paid_at), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.payment_reference || '—'}</td>
                </tr>
              ))}
              {(!filtered || filtered.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No earnings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1099 Notice */}
      {ytd > 600 ? (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div><p className="text-sm font-medium text-foreground">1099 Tax Notice</p><p className="text-xs text-muted-foreground">Your YTD earnings exceed $600. A 1099-NEC will be issued for this tax year.</p></div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
          1099-NEC forms are issued for annual earnings exceeding $600.
        </div>
      )}
    </div>
  );
}
