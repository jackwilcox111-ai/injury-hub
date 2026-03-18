import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { format } from 'date-fns';

export default function MarketerCases() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const { data: marketerProfile } = useQuery({
    queryKey: ['marketer-profile', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_profiles') as any).select('*').eq('profile_id', profile!.id).maybeSingle();
      return data;
    },
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['marketer-all-cases', marketerProfile?.id],
    enabled: !!marketerProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('cases') as any).select('*').eq('marketer_id', marketerProfile!.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ['marketer-payouts-map', marketerProfile?.id],
    enabled: !!marketerProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_payouts') as any).select('*').eq('marketer_id', marketerProfile!.id);
      return data || [];
    },
  });

  const statusMap: Record<string, string[]> = {
    all: [],
    pending: ['Marketplace'],
    marketplace: ['Marketplace'],
    accepted: ['Intake', 'In Treatment', 'Records Pending', 'Demand Prep'],
    settled: ['Settled'],
    rejected: ['Rejected'],
  };

  const filtered = (cases || []).filter((c: any) => {
    if (tab === 'pending') return c.status === 'Marketplace' && !c.quality_gate_passed;
    if (tab !== 'all' && statusMap[tab] && !statusMap[tab].includes(c.status)) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.case_number?.toLowerCase().includes(s) || c.specialty?.toLowerCase().includes(s);
    }
    return true;
  });

  const scorePill = (score: number) => {
    const cls = score < 60 ? 'bg-destructive/10 text-destructive' : score < 80 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success';
    return <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${cls}`}>{score}</span>;
  };

  const payoutForCase = (caseId: string) => {
    const p = (payouts || []).find((p: any) => p.case_id === caseId);
    if (!p) return <span className="text-xs text-muted-foreground">—</span>;
    const cls = p.status === 'Paid' ? 'bg-success/10 text-success' : p.status === 'Approved' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
    return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{p.status}</span>;
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-foreground">My Cases</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search case # or injury type..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="marketplace">In Marketplace</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="settled">Settled</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Case #</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Injury Type</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">State</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Submitted</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Score</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-xs text-muted-foreground">Payout</th>
            </tr></thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} onClick={() => navigate(`/marketer/cases/${c.id}`)} className="border-b border-border cursor-pointer hover:bg-accent/30">
                  <td className="px-4 py-2 font-mono text-xs text-primary">{c.case_number}</td>
                  <td className="px-4 py-2 text-xs">{c.specialty || '—'}</td>
                  <td className="px-4 py-2 text-xs">{c.accident_state || '—'}</td>
                  <td className="px-4 py-2 text-xs">{c.marketplace_submitted_at ? format(new Date(c.marketplace_submitted_at), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-4 py-2">{scorePill(c.completeness_score || 0)}</td>
                  <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-2">{payoutForCase(c.id)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No cases found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
