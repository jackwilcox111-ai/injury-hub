import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { SortableHeader } from '@/components/global/SortableHeader';
import { useSortableTable } from '@/hooks/use-sortable-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AttorneySettingsModal } from '@/components/attorney/AttorneySettingsModal';
import { toast } from 'sonner';
import { Plus, TrendingUp, Calendar, Users, Settings, Check, X, CheckCircle2, XCircle, Languages, Search } from 'lucide-react';
import { format } from 'date-fns';
import { LANGUAGES } from '@/lib/languages';

export default function AttorneysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<{ id: string; firm_name: string; contact_name: string | null } | null>(null);
  const [form, setForm] = useState({ firm_name: '', contact_name: '', email: '', phone: '', languages_spoken: ['English'] as string[] });
  const [search, setSearch] = useState('');

  const { data: attorneys, isLoading } = useQuery({
    queryKey: ['attorneys'],
    queryFn: async () => {
      const { data: attys } = await supabase.from('attorneys').select('*').order('firm_name');
      if (!attys) return [];
      const { data: cases } = await supabase.from('cases').select('attorney_id, status, settlement_final, opened_date');
      return attys.map(a => {
        const aCases = cases?.filter(c => c.attorney_id === a.id) || [];
        const settled = aCases.filter(c => c.status === 'Settled');
        const active = aCases.filter(c => c.status !== 'Settled');
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthly = aCases.filter(c => c.opened_date && new Date(c.opened_date) >= thirtyDaysAgo);
        const avgSettlement = settled.length > 0 ? settled.reduce((sum, c) => sum + (c.settlement_final || 0), 0) / settled.length : 0;
        return { ...a, totalCases: aCases.length, activeCases: active.length, settledCases: settled.length, avgSettlement, monthlyVolume: monthly.length };
      });
    },
  });

  const { data: applications } = useQuery({
    queryKey: ['attorney-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('attorney_applications').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const pendingCount = applications?.filter(a => a.status === 'Pending').length || 0;

  const { data: linkedCases } = useQuery({
    queryKey: ['attorney-cases', showDetail],
    queryFn: async () => {
      if (!showDetail) return [];
      const { data } = await supabase.from('cases_with_counts').select('id, case_number, patient_name, status, sol_date, sol_period_days, accident_state').eq('attorney_id', showDetail);
      return data || [];
    },
    enabled: !!showDetail,
  });

  const addAttorney = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('attorneys').insert({
        firm_name: form.firm_name, contact_name: form.contact_name || null,
        email: form.email || null, phone: form.phone || null,
        languages_spoken: form.languages_spoken,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attorneys'] }); setShowAdd(false); toast.success('Attorney added'); setForm({ firm_name: '', contact_name: '', email: '', phone: '', languages_spoken: ['English'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveApp = useMutation({
    mutationFn: async (app: any) => {
      // Create attorney record
      const { data: attyData, error: attyErr } = await supabase.from('attorneys').insert({
        firm_name: app.firm_name,
        contact_name: app.contact_name || null,
        email: app.email || null,
        phone: app.phone || null,
        status: 'Active',
      }).select('id').single();
      if (attyErr) throw attyErr;

      // Update application status
      const { error: updErr } = await supabase.from('attorney_applications').update({ status: 'Approved' }).eq('id', app.id);
      if (updErr) throw updErr;

      // Invite attorney user with login credentials
      const { error: inviteErr } = await supabase.functions.invoke('invite-user', {
        body: {
          email: app.email,
          full_name: app.contact_name,
          role: 'attorney',
          firm_id: attyData.id,
        },
      });
      if (inviteErr) throw inviteErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attorneys'] });
      queryClient.invalidateQueries({ queryKey: ['attorney-applications'] });
      toast.success('Attorney approved — login invitation sent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.from('attorney_applications').update({ status: 'Rejected' }).eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attorney-applications'] });
      toast.success('Application rejected');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAttorney = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from('attorneys').update(updates).eq('id', showDetail!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attorneys'] }); toast.success('Attorney updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedAttorney = attorneys?.find(a => a.id === showDetail);
  const activeAttorneys = attorneys?.filter(a => a.status === 'Active') || [];
  const avgLTV = activeAttorneys.length > 0
    ? activeAttorneys.reduce((sum, a) => sum + (a.avgSettlement * a.monthlyVolume * 36), 0) / activeAttorneys.length : 0;
  const casesThisMonth = attorneys?.reduce((sum, a) => sum + a.monthlyVolume, 0) || 0;

  const filteredAttorneys = attorneys?.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.firm_name.toLowerCase().includes(s) || a.contact_name?.toLowerCase().includes(s) || a.email?.toLowerCase().includes(s);
  });
  const { sortedData: sortedAttorneys, sortConfig: attSortConfig, requestSort: attRequestSort } = useSortableTable(filteredAttorneys, { key: 'firm_name', direction: 'asc' });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Attorneys</h2><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Attorney Relationships</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{attorneys?.length || 0} firms</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Attorney</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Avg Attorney LTV (3yr)', value: `$${Math.round(avgLTV).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Cases This Month', value: casesThisMonth, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active Firms', value: activeAttorneys.length, icon: Users, color: 'text-violet-600 bg-violet-50' },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-[18px] h-[18px]" />
            </div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="attorneys">
        <TabsList>
          <TabsTrigger value="attorneys">Active Attorneys</TabsTrigger>
          <TabsTrigger value="applications" className="relative">
            Applications
            {pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attorneys" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search firms, contacts, emails..." className="pl-9 h-10" />
          </div>
          {/* Table */}
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <SortableHeader label="Firm" sortKey="firm_name" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <SortableHeader label="Contact" sortKey="contact_name" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Languages</th>
                <SortableHeader label="Total" sortKey="totalCases" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <SortableHeader label="Active" sortKey="activeCases" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <SortableHeader label="Settled" sortKey="settledCases" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <SortableHeader label="Avg Settlement" sortKey="avgSettlement" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <SortableHeader label="Monthly" sortKey="monthlyVolume" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <SortableHeader label="Status" sortKey="status" currentKey={attSortConfig.key} direction={attSortConfig.direction} onSort={attRequestSort} />
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Settings</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {sortedAttorneys?.map(a => {
                  const langs: string[] = (a as any).languages_spoken || ['English'];
                  return (
                  <tr key={a.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.firm_name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.contact_name || '—'}</td>
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => setShowDetail(a.id)}>
                      <div className="flex flex-wrap gap-1">
                        {langs.map(l => (
                          <span key={l} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{l}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs tabular-nums cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.totalCases}</td>
                    <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-primary cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.activeCases}</td>
                    <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-violet-600 cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.settledCases}</td>
                    <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-emerald-600 cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.avgSettlement > 0 ? `$${Math.round(a.avgSettlement).toLocaleString()}` : '—'}</td>
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => setShowDetail(a.id)}>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 rounded-full bg-secondary w-14 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(a.monthlyVolume / 5 * 100, 100)}%` }} /></div>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{a.monthlyVolume}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => setShowDetail(a.id)}><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setSettingsTarget({ id: a.id, firm_name: a.firm_name, contact_name: a.contact_name }); }}>
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          {!applications || applications.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <div key={app.id} className="bg-card border border-border rounded-xl p-5 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{app.firm_name}</p>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{app.contact_name} · {app.state}</p>
                      <p className="text-xs text-muted-foreground">{app.email} · {app.phone}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(app.created_at!), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {app.bar_number && <span>Bar #: {app.bar_number}</span>}
                    {app.pi_case_volume_monthly != null && <span>{app.pi_case_volume_monthly} PI cases/mo</span>}
                    {app.referral_source && <span>Ref: {app.referral_source}</span>}
                  </div>
                  {app.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{app.notes}"</p>}
                  {app.status === 'Pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={() => approveApp.mutate(app)} disabled={approveApp.isPending}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { if (confirm('Reject this application?')) rejectApp.mutate(app.id); }} disabled={rejectApp.isPending}>
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Attorney Settings Modal */}
      {settingsTarget && (
        <AttorneySettingsModal
          attorneyId={settingsTarget.id}
          firmName={settingsTarget.firm_name}
          contactName={settingsTarget.contact_name}
          open={!!settingsTarget}
          onClose={() => setSettingsTarget(null)}
        />
      )}

      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedAttorney?.firm_name}</DialogTitle></DialogHeader>
          {selectedAttorney && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{selectedAttorney.contact_name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-mono text-sm">{selectedAttorney.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-mono text-sm">{selectedAttorney.phone}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedAttorney.status} /></div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium mb-2">Languages Spoken</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => {
                    const checked = ((selectedAttorney as any).languages_spoken || ['English']).includes(lang);
                    return (
                      <label key={lang} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${checked ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                        <Checkbox checked={checked} onCheckedChange={() => {
                          const current: string[] = (selectedAttorney as any).languages_spoken || ['English'];
                          const updated = checked ? current.filter(l => l !== lang) : [...current, lang];
                          if (updated.length > 0) updateAttorney.mutate({ languages_spoken: updated });
                        }} className="w-3 h-3" />
                        {lang}
                      </label>
                    );
                  })}
                </div>
              </div>
              {linkedCases && linkedCases.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Cases</p>
                  <div className="space-y-1">{linkedCases.map(c => (
                    <button key={c.id} onClick={() => { setShowDetail(null); navigate(`/cases/${c.id}`); }} className="w-full flex items-center justify-between py-2 text-sm hover:bg-accent rounded-lg px-2">
                      <span className="font-mono text-primary text-xs font-medium">{c.case_number}</span>
                      <span>{c.patient_name}</span>
                      <SoLCountdown sol_date={c.sol_date} />
                      <StatusBadge status={c.status || ''} />
                    </button>
                  ))}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Attorney</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addAttorney.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Firm Name *</Label><Input value={form.firm_name} onChange={e => setForm(p => ({...p, firm_name: e.target.value}))} required className="h-10" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Contact</Label><Input value={form.contact_name} onChange={e => setForm(p => ({...p, contact_name: e.target.value}))} className="h-10" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Email</Label><Input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="h-10" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Languages Spoken</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => {
                  const checked = form.languages_spoken.includes(lang);
                  return (
                    <label key={lang} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${checked ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                      <Checkbox checked={checked} onCheckedChange={() => {
                        setForm(p => ({
                          ...p,
                          languages_spoken: checked ? p.languages_spoken.filter(l => l !== lang) : [...p.languages_spoken, lang],
                        }));
                      }} className="w-3 h-3" />
                      {lang}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={addAttorney.isPending}>Add Attorney</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
