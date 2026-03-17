import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/global/StatusBadge';
import { format } from 'date-fns';
import { Banknote, TrendingUp, Clock, CheckCircle, DollarSign, FileText } from 'lucide-react';

export default function FunderDashboard() {
  const { profile } = useAuth();

  const { data: funderProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['funder-profile', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from('funder_profiles')
        .select('*')
        .eq('profile_id', profile!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: fundingRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['funder-requests', funderProfile?.id],
    enabled: !!funderProfile?.id,
    queryFn: async () => {
      const { data } = await supabase.from('funding_requests')
        .select('*, cases!funding_requests_case_id_fkey(case_number, patient_name, status, sol_date)')
        .eq('funder_id', funderProfile!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  if (loadingProfile || loadingRequests) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-xl text-foreground">Funder Portfolio</h2>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!funderProfile) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-xl text-foreground">Funder Portal</h2>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Your funder profile is being set up. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  const requests = fundingRequests || [];
  const totalDeployed = requests
    .filter(r => r.status === 'Funded')
    .reduce((sum, r) => sum + (Number(r.approved_amount) || 0), 0);
  const totalRepaid = requests
    .filter(r => r.repayment_amount)
    .reduce((sum, r) => sum + (Number(r.repayment_amount) || 0), 0);
  const pendingCount = requests.filter(r => r.status === 'Requested' || r.status === 'Under Review').length;
  const activeCount = requests.filter(r => r.status === 'Funded').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-foreground">Portfolio Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{funderProfile.company_name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Deployed</span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">${totalDeployed.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Repaid</span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">${totalRepaid.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Pending</span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">{pendingCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Active</span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">{activeCount}</p>
        </div>
      </div>

      {/* Funding Requests Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Funding Requests
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Requested</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Approved</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map(r => {
                const c = r.cases as any;
                return (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{c?.case_number || '—'}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{r.plaintiff_name || c?.patient_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{r.funding_type || 'Pre-Settlement'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">${Number(r.requested_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {r.approved_amount ? `$${Number(r.approved_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c?.status ? <StatusBadge status={c.status} /> : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No funding requests assigned to your portfolio yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Profile</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Company</p>
            <p className="font-medium text-foreground">{funderProfile.company_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="font-medium text-foreground">{funderProfile.contact_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Funding Range</p>
            <p className="font-mono text-foreground">
              ${Number(funderProfile.funding_capacity_min || 0).toLocaleString()} — ${Number(funderProfile.funding_capacity_max || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accredited Investor</p>
            <Badge variant={funderProfile.accredited_investor ? 'default' : 'outline'} className="text-[10px]">
              {funderProfile.accredited_investor ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
