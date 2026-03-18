import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, CheckCircle, ShoppingBag, DollarSign } from 'lucide-react';

export default function MarketerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: marketerProfile } = useQuery({
    queryKey: ['marketer-profile', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_profiles') as any).select('*').eq('profile_id', profile!.id).maybeSingle();
      return data;
    },
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['marketer-cases', marketerProfile?.id],
    enabled: !!marketerProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('cases') as any).select('*').eq('marketer_id', marketerProfile!.id).order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ['marketer-payouts', marketerProfile?.id],
    enabled: !!marketerProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_payouts') as any).select('*').eq('marketer_id', marketerProfile!.id);
      return data || [];
    },
  });

  const totalCases = cases?.length || 0;
  const accepted = cases?.filter((c: any) => !['Marketplace', 'Pending Review', 'Rejected'].includes(c.status)).length || 0;
  const inMarketplace = cases?.filter((c: any) => c.status === 'Marketplace').length || 0;
  const totalEarned = payouts?.filter((p: any) => p.status === 'Paid').reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
  const pendingPayout = payouts?.filter((p: any) => ['Pending', 'Approved'].includes(p.status)).reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;

  const now = new Date();
  const mtdEarned = payouts?.filter((p: any) => p.status === 'Paid' && p.paid_at && new Date(p.paid_at).getMonth() === now.getMonth() && new Date(p.paid_at).getFullYear() === now.getFullYear()).reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
  const ytdEarned = payouts?.filter((p: any) => p.status === 'Paid' && p.paid_at && new Date(p.paid_at).getFullYear() === now.getFullYear()).reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;

  const kpis = [
    { label: 'Cases Submitted', value: totalCases, icon: FolderOpen, color: 'text-primary' },
    { label: 'Cases Accepted', value: accepted, icon: CheckCircle, color: 'text-success' },
    { label: 'In Marketplace', value: inMarketplace, icon: ShoppingBag, color: 'text-warning' },
    { label: 'Total Earned', value: `$${totalEarned.toLocaleString()}`, icon: DollarSign, color: 'text-settled' },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;

  const scorePill = (score: number) => {
    const cls = score < 60 ? 'bg-destructive/10 text-destructive' : score < 80 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success';
    return <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${cls}`}>{score}</span>;
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-foreground">Marketer Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <span className="text-[11px] text-muted-foreground">{k.label}</span>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Cases */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent Cases</h3>
          <button onClick={() => navigate('/marketer/cases')} className="text-xs text-primary hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Case #</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">State</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Score</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Status</th>
            </tr></thead>
            <tbody>
              {cases?.map((c: any) => (
                <tr key={c.id} onClick={() => navigate(`/marketer/cases/${c.id}`)} className="border-b border-border cursor-pointer hover:bg-accent/30">
                  <td className="px-4 py-2 font-mono text-xs text-primary">{c.case_number}</td>
                  <td className="px-4 py-2 text-xs">{c.accident_state || '—'}</td>
                  <td className="px-4 py-2">{scorePill(c.completeness_score || 0)}</td>
                  <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
              {(!cases || cases.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No cases submitted yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Earnings Summary</h3>
          <button onClick={() => navigate('/marketer/earnings')} className="text-xs text-primary hover:underline">View Details</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-[11px] text-muted-foreground">MTD</p><p className="font-display font-bold text-lg">${mtdEarned.toLocaleString()}</p></div>
          <div><p className="text-[11px] text-muted-foreground">YTD</p><p className="font-display font-bold text-lg">${ytdEarned.toLocaleString()}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Pending</p><p className="font-display font-bold text-lg text-warning">${pendingPayout.toLocaleString()}</p></div>
        </div>
      </div>
    </div>
  );
}
