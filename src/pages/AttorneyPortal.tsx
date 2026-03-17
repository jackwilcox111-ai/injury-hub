import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { ProgressBar } from '@/components/global/ProgressBar';
import { ColossusScoreBadge } from '@/components/global/ColossusScoreBadge';
import { PolicyCard } from '@/components/global/PolicyCard';
import { RetainerCard } from '@/components/global/RetainerCard';
import { MediaPlayer } from '@/components/global/MediaPlayer';
import { SimplifiedDashboard } from '@/components/attorney/SimplifiedDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { useState } from 'react';
import { Shield, FileText, Activity, GitBranch, FileSignature, Video, Radar, DollarSign, AlertTriangle } from 'lucide-react';

export default function AttorneyPortal() {
  const { profile } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [weeklyModal, setWeeklyModal] = useState<string | null>(null);

  // Fetch attorney_portal_settings for current firm
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['attorney-portal-settings', profile?.firm_id],
    enabled: !!profile?.firm_id,
    queryFn: async () => {
      const { data } = await supabase.from('attorney_portal_settings')
        .select('*')
        .eq('attorney_id', profile!.firm_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['attorney-portal-cases'],
    queryFn: async () => {
      const { data } = await supabase.from('cases_with_counts')
        .select('*, providers!cases_provider_id_fkey(name)')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  // Policy limits summary: cases where lien > policy limit
  const { data: policyData } = useQuery({
    queryKey: ['attorney-policy-summary'],
    queryFn: async () => {
      const { data: policies } = await supabase.from('policy_details').select('case_id, policy_limit_bodily_injury');
      const { data: allCases } = await supabase.from('cases').select('id, case_number, patient_name, lien_amount');
      if (!policies || !allCases) return [];
      return policies
        .filter(p => p.policy_limit_bodily_injury != null)
        .map(p => {
          const c = allCases.find(cc => cc.id === p.case_id);
          if (!c) return null;
          const gap = (c.lien_amount || 0) - (p.policy_limit_bodily_injury || 0);
          return gap > 0 ? { ...c, policyLimit: p.policy_limit_bodily_injury, gap } : null;
        })
        .filter(Boolean) as any[];
    },
  });

  // Case detail data
  const { data: casePolicy } = useQuery({
    queryKey: ['atty-case-policy', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('policy_details').select('*').eq('case_id', selectedCaseId!).maybeSingle();
      return data;
    },
  });

  const { data: caseColossus } = useQuery({
    queryKey: ['atty-case-colossus', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('insurance_colossus_data').select('*').eq('case_id', selectedCaseId!).maybeSingle();
      return data;
    },
  });

  const { data: caseDemandLetters } = useQuery({
    queryKey: ['atty-case-demands', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('demand_letters').select('*').eq('case_id', selectedCaseId!).order('version', { ascending: false });
      return data || [];
    },
  });

  const { data: caseTimeline } = useQuery({
    queryKey: ['atty-case-timeline', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('case_timelines').select('*').eq('case_id', selectedCaseId!).order('event_date', { ascending: false });
      return data || [];
    },
  });

  const { data: caseMessages } = useQuery({
    queryKey: ['atty-case-messages', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('video_messages').select('*').eq('case_id', selectedCaseId!).eq('recipient_id', profile!.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: caseFunding } = useQuery({
    queryKey: ['atty-case-funding', selectedCaseId],
    enabled: !!selectedCaseId,
    queryFn: async () => {
      const { data } = await supabase.from('funding_requests').select('*').eq('case_id', selectedCaseId!);
      return data || [];
    },
  });

  // Weekly timeline events for weekly modal
  const { data: weeklyEvents } = useQuery({
    queryKey: ['atty-weekly-events', weeklyModal],
    enabled: !!weeklyModal,
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7).toISOString().split('T')[0];
      const { data } = await supabase.from('case_timelines')
        .select('*')
        .eq('case_id', weeklyModal!)
        .gte('event_date', weekAgo)
        .order('event_date', { ascending: false });
      return data || [];
    },
  });

  const markViewed = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('video_messages').update({ viewed: true, viewed_at: new Date().toISOString() }).eq('id', id);
    },
  });

  if (isLoading || loadingSettings) return <div className="space-y-6"><h2 className="font-display text-xl">Your Cases</h2><Skeleton className="h-96 rounded" /></div>;

  // Simplified mode
  if (settings?.simplified_mode) {
    return <SimplifiedDashboard cases={cases || []} welcomeMessage={settings.custom_welcome_message} />;
  }

  const selectedCase = cases?.find(c => c.id === selectedCaseId);
  const cadence = settings?.update_cadence || 'Weekly';

  // Filter cases for "On Change" cadence
  const displayCases = cadence === 'On Change'
    ? cases?.filter(c => c.updated_at && new Date(c.updated_at) >= subDays(new Date(), 30))
    : cases;

  const s = settings || {} as any;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-foreground">Attorney Portal</h2>
        {settings?.custom_welcome_message && (
          <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground">{settings.custom_welcome_message}</div>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          {cadence === 'Weekly' ? 'Showing weekly summary view' : cadence === 'On Change' ? 'Showing cases with recent status changes' : 'Real-time updates'}
        </p>
      </div>

      {/* Policy Limits Summary Card */}
      {s.show_policy_limits !== false && policyData && policyData.length > 0 && (
        <div className="bg-card border border-amber-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-foreground">Policy Limits Alert</h3>
            <Badge variant="secondary" className="text-[10px]">{policyData.length} cases</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Cases where lien exposure exceeds policy limit — lien reduction may be necessary.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Case</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground">Patient</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground">Policy Limit</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground">Lien Exposure</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground">Gap</th>
              </tr></thead>
              <tbody>{policyData.map(p => (
                <tr key={p.id} className="border-b border-border">
                  <td className="px-3 py-2 font-mono text-xs text-primary">{p.case_number}</td>
                  <td className="px-3 py-2">{p.patient_name?.split(' ')[0]} {p.patient_name?.split(' ')[1]?.[0]}.</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">${(p.policyLimit || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">${(p.lien_amount || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-red-600">${(p.gap || 0).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Case List */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Case #</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Patient</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">SoL</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Progress</th>
            {cadence === 'Weekly' && <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Weekly</th>}
          </tr></thead>
          <tbody>
            {displayCases?.map((c, i) => (
              <tr
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`border-b border-border cursor-pointer transition-colors ${selectedCaseId === c.id ? 'bg-primary/5' : i % 2 === 1 ? 'bg-card' : 'bg-background'} hover:bg-accent/30`}
              >
                <td className="px-4 py-3 font-mono text-xs text-primary">{c.case_number}</td>
                <td className="px-4 py-3 text-foreground">{c.patient_name}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status || ''} /></td>
                <td className="px-4 py-3"><SoLCountdown sol_date={c.sol_date} /></td>
                <td className="px-4 py-3"><ProgressBar completed={c.appointments_completed || 0} total={c.appointments_total || 0} /></td>
                {cadence === 'Weekly' && (
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={e => { e.stopPropagation(); setWeeklyModal(c.id); }}>
                      View Summary
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {(!displayCases || displayCases.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No cases found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Weekly Summary Modal */}
      <Dialog open={!!weeklyModal} onOpenChange={v => !v && setWeeklyModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Weekly Summary</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {weeklyEvents && weeklyEvents.length > 0 ? weeklyEvents.map(e => (
              <div key={e.id} className="flex gap-3 text-sm border-b border-border pb-2">
                <span className="font-mono text-xs text-primary whitespace-nowrap">{format(new Date(e.event_date), 'MMM d')}</span>
                <div>
                  <p className="font-medium text-foreground">{e.event_title}</p>
                  {e.event_detail && <p className="text-xs text-muted-foreground">{e.event_detail}</p>}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No events this week</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Case Detail */}
      {selectedCaseId && selectedCase && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">{selectedCase.patient_name} — {selectedCase.case_number}</h3>
          </div>

          {/* Policy & Retainer Cards */}
          {(s.show_policy_limits !== false || s.show_retainer_status !== false) && casePolicy && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <PolicyCard policy={casePolicy} show={s.show_policy_limits !== false} />
              <RetainerCard
                retainerSigned={casePolicy.retainer_signed}
                retainerDate={casePolicy.retainer_date}
                feePercent={casePolicy.retainer_fee_percent}
                show={s.show_retainer_status !== false}
              />
            </div>
          )}

          <Tabs defaultValue="timeline">
            <TabsList className="flex-wrap h-auto gap-1">
              {s.show_case_timeline !== false && <TabsTrigger value="timeline" className="gap-1.5 text-xs"><GitBranch className="w-3.5 h-3.5" /> Timeline</TabsTrigger>}
              {s.show_demand_letters !== false && <TabsTrigger value="demands" className="gap-1.5 text-xs"><FileSignature className="w-3.5 h-3.5" /> Demand Letters</TabsTrigger>}
              {s.show_video_messages !== false && <TabsTrigger value="messages" className="gap-1.5 text-xs"><Video className="w-3.5 h-3.5" /> Messages</TabsTrigger>}
              <TabsTrigger value="colossus" className="gap-1.5 text-xs"><Radar className="w-3.5 h-3.5" /> Case Strength</TabsTrigger>
              {s.show_funding_status !== false && <TabsTrigger value="funding" className="gap-1.5 text-xs"><DollarSign className="w-3.5 h-3.5" /> Funding</TabsTrigger>}
            </TabsList>

            {/* Timeline Tab */}
            {s.show_case_timeline !== false && (
              <TabsContent value="timeline" className="mt-4 space-y-3">
                <div className="flex gap-2 mb-2">
                  {['All', 'Medical', 'Legal'].map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] cursor-pointer">{f}</Badge>
                  ))}
                </div>
                {caseTimeline && caseTimeline.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-xs text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2 text-xs text-muted-foreground">Event</th>
                        <th className="text-left px-3 py-2 text-xs text-muted-foreground">Detail</th>
                      </tr></thead>
                      <tbody>{caseTimeline.map(e => (
                        <tr key={e.id} className="border-b border-border">
                          <td className="px-3 py-2 font-mono text-xs text-primary whitespace-nowrap">{format(new Date(e.event_date), 'MMM d, yyyy')}</td>
                          <td className="px-3 py-2 font-medium">{e.event_title}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{e.event_detail || '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-6">No timeline events yet.</p>}
              </TabsContent>
            )}

            {/* Demand Letters Tab */}
            {s.show_demand_letters !== false && (
              <TabsContent value="demands" className="mt-4 space-y-4">
                {caseDemandLetters && caseDemandLetters.length > 0 ? caseDemandLetters.map(dl => (
                  <div key={dl.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={dl.status === 'Sent' ? 'default' : 'secondary'}>{dl.status}</Badge>
                        <span className="text-xs text-muted-foreground">v{dl.version}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {dl.colossus_score != null && <ColossusScoreBadge score={dl.colossus_score} />}
                        <span className="font-mono font-bold text-lg tabular-nums text-foreground">
                          ${(dl.total_demand || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {dl.content}
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{dl.created_at ? formatDistanceToNow(new Date(dl.created_at), { addSuffix: true }) : ''}</span>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`<html><head><title>Demand Letter - ${selectedCase?.case_number}</title><style>body{font-family:monospace;white-space:pre-wrap;padding:40px;font-size:12px;line-height:1.6;}h1{font-family:sans-serif;font-size:16px;margin-bottom:8px;}p.meta{font-family:sans-serif;color:#666;font-size:11px;margin-bottom:24px;}</style></head><body><h1>Demand Letter — ${selectedCase?.case_number}</h1><p class="meta">Version ${dl.version} · Status: ${dl.status} · Total Demand: $${(dl.total_demand || 0).toLocaleString()}</p>${dl.content}</body></html>`);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}>Download as PDF</Button>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Your demand letter will appear here when finalized by your care coordinator.</p>
                )}
              </TabsContent>
            )}

            {/* Messages Tab */}
            {s.show_video_messages !== false && (
              <TabsContent value="messages" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">Updates from Your Care Coordinator</p>
                {caseMessages && caseMessages.length > 0 ? caseMessages.map(msg => (
                  <div key={msg.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">{msg.message_type}</Badge>
                      <div className="flex items-center gap-2">
                        {!msg.viewed && <Badge className="text-[9px] bg-primary">New</Badge>}
                        <span className="text-[10px] text-muted-foreground">{msg.sent_at ? format(new Date(msg.sent_at), 'MMM d, yyyy') : ''}</span>
                      </div>
                    </div>
                    <MediaPlayer
                      storageUrl={msg.storage_path || ''}
                      mediaType={msg.storage_path ? (msg.storage_path.includes('video') ? 'video' : 'audio') : 'text'}
                      transcript={msg.script}
                      textContent={!msg.storage_path ? msg.script : undefined}
                      onViewed={() => markViewed.mutate(msg.id)}
                    />
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-6">No messages yet.</p>}
              </TabsContent>
            )}

            {/* Colossus / Case Strength Tab */}
            <TabsContent value="colossus" className="mt-4 space-y-4">
              <h4 className="text-sm font-semibold text-foreground">GHIN Case Strength Assessment</h4>
              {caseColossus ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <ColossusScoreBadge score={caseColossus.estimated_colossus_range_low != null ? Math.round(((caseColossus.estimated_colossus_range_low + (caseColossus.estimated_colossus_range_high || 0)) / 2) / ((caseColossus.policy_limit || 100000) / 100)) : 50} />
                    {caseColossus.estimated_colossus_range_low != null && (
                      <span className="text-sm text-muted-foreground">
                        Est. Range: <span className="font-mono font-semibold text-foreground">${(caseColossus.estimated_colossus_range_low || 0).toLocaleString()}</span> – <span className="font-mono font-semibold text-foreground">${(caseColossus.estimated_colossus_range_high || 0).toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Injury Severity', value: caseColossus.injury_severity || '—' },
                      { label: 'Treatment Duration', value: caseColossus.treatment_duration_days ? `${caseColossus.treatment_duration_days} days` : '—' },
                      { label: 'Medical Specials', value: caseColossus.total_medical_specials ? `$${Number(caseColossus.total_medical_specials).toLocaleString()}` : '—' },
                      { label: 'Imaging', value: caseColossus.imaging_performed ? '✓' : '—' },
                      { label: 'Surgery', value: caseColossus.surgery_performed ? '✓' : '—' },
                      { label: 'Liability', value: caseColossus.liability_strength || '—' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-6">Case strength assessment not yet available.</p>}
            </TabsContent>

            {/* Funding Tab */}
            {s.show_funding_status !== false && (
              <TabsContent value="funding" className="mt-4 space-y-3">
                {caseFunding && caseFunding.length > 0 ? caseFunding.map(f => (
                  <div key={f.id} className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">{f.funding_type || 'Pre-Settlement'}</Badge>
                      <StatusBadge status={f.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {f.funding_company && <div><span className="text-muted-foreground text-xs">Company</span><p className="font-medium">{f.funding_company}</p></div>}
                      {f.advance_date && <div><span className="text-muted-foreground text-xs">Advance Date</span><p className="font-mono text-xs">{format(new Date(f.advance_date), 'MMM d, yyyy')}</p></div>}
                      {f.approved_amount != null && <div><span className="text-muted-foreground text-xs">Funded</span><p className="font-mono font-semibold">${Number(f.approved_amount).toLocaleString()}</p></div>}
                      {f.repayment_amount != null && <div><span className="text-muted-foreground text-xs">Repayment at Settlement</span><p className="font-mono font-semibold">${Number(f.repayment_amount).toLocaleString()}</p></div>}
                      {f.interest_rate != null && <div><span className="text-muted-foreground text-xs">Interest Rate</span><p className="font-mono">{Number(f.interest_rate)}%</p></div>}
                      {f.payoff_amount != null && <div><span className="text-muted-foreground text-xs">Payoff Amount</span><p className="font-mono font-semibold text-red-600">${Number(f.payoff_amount).toLocaleString()}</p></div>}
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-6">No funding requests for this case.</p>}
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
}
