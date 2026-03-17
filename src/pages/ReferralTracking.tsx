import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/csv-export';
import { toast } from 'sonner';
import { Link2, Download, Scale, Users, Globe, MessageSquare } from 'lucide-react';

const SOURCE_COLORS: Record<string, string> = {
  'Attorney Referral': 'bg-blue-50 text-blue-700 border-blue-200',
  'Google': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Social Media': 'bg-violet-50 text-violet-700 border-violet-200',
  'Word of Mouth': 'bg-amber-50 text-amber-700 border-amber-200',
  'Website': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Other': 'bg-muted text-muted-foreground border-border',
};

export default function ReferralTracking() {
  const { profile } = useAuth();

  const { data: referrals } = useQuery({
    queryKey: ['referral-sources'],
    queryFn: async () => {
      const { data } = await supabase.from('referral_sources')
        .select('*, referring_attorney:attorneys!referral_sources_referring_attorney_id_fkey(firm_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const sourceCounts = referrals?.reduce((acc: any, r: any) => {
    acc[r.source_type] = (acc[r.source_type] || 0) + 1;
    return acc;
  }, {}) || {};

  const entityCounts = referrals?.reduce((acc: any, r: any) => {
    acc[r.entity_type] = (acc[r.entity_type] || 0) + 1;
    return acc;
  }, {}) || {};

  // Attorney referral chain
  const attorneyReferrals = referrals?.filter((r: any) => r.source_type === 'Attorney Referral' && r.referring_attorney) || [];
  const attorneyChain = attorneyReferrals.reduce((acc: any, r: any) => {
    const firm = r.referring_attorney?.firm_name || 'Unknown';
    acc[firm] = (acc[firm] || 0) + 1;
    return acc;
  }, {}) as Record<string, number>;

  const totalReferrals = referrals?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Referral Tracking</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track where your patients and partners come from.</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
          if (!referrals?.length) { toast.error('No data'); return; }
          exportToCSV(referrals, 'referral-sources');
          toast.success('Exported');
        }}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-foreground tabular-nums">{totalReferrals}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
        </div>
        {Object.entries(sourceCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([source, count]) => (
          <div key={source} className={`rounded-xl p-5 text-center border ${SOURCE_COLORS[source] || SOURCE_COLORS['Other']}`}>
            <p className="text-3xl font-bold tabular-nums">{count as number}</p>
            <p className="text-xs mt-1">{source}</p>
          </div>
        ))}
      </div>

      {/* Source Breakdown */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Globe className="w-4 h-4" /> By Source</h3>
          <div className="space-y-2">
            {Object.entries(sourceCounts).sort((a: any, b: any) => b[1] - a[1]).map(([source, count]) => {
              const pct = totalReferrals > 0 ? Math.round(((count as number) / totalReferrals) * 100) : 0;
              return (
                <div key={source} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{source}</span>
                    <span className="font-mono-data tabular-nums text-muted-foreground">{count as number} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Scale className="w-4 h-4" /> Attorney Referral Chain</h3>
          {Object.keys(attorneyChain).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No attorney referrals tracked yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(attorneyChain).sort((a, b) => b[1] - a[1]).map(([firm, count]) => (
                <div key={firm} className="flex justify-between items-center text-xs p-2 bg-accent/30 rounded-lg">
                  <span className="text-foreground font-medium">{firm}</span>
                  <span className="font-mono-data tabular-nums text-primary font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Entity Type Breakdown */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> By Entity Type</h3>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(entityCounts).map(([type, count]) => (
            <div key={type} className="bg-accent/30 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold text-foreground tabular-nums">{count as number}</p>
              <p className="text-[10px] text-muted-foreground">{type.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Referrals Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Recent Referrals</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Source</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Detail</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Entity Type</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Referring Attorney</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {referrals?.slice(0, 50).map((r: any) => (
              <tr key={r.id} className="hover:bg-accent/30">
                <td className="px-5 py-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${SOURCE_COLORS[r.source_type] || SOURCE_COLORS['Other']}`}>
                    {r.source_type}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{r.source_detail || '—'}</td>
                <td className="px-5 py-3 text-xs">{r.entity_type.replace('_', ' ')}</td>
                <td className="px-5 py-3 text-xs">{r.referring_attorney?.firm_name || '—'}</td>
                <td className="px-5 py-3 font-mono-data text-xs text-muted-foreground">{r.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {!referrals?.length && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">No referrals tracked yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
