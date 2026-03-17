import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AttorneySettingsModal } from '@/components/attorney/AttorneySettingsModal';
import { toast } from 'sonner';
import { Plus, TrendingUp, Calendar, Users, Settings } from 'lucide-react';

export default function AttorneysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<{ id: string; firm_name: string; contact_name: string | null } | null>(null);
  const [form, setForm] = useState({ firm_name: '', contact_name: '', email: '', phone: '' });

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
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attorneys'] }); setShowAdd(false); toast.success('Attorney added'); setForm({ firm_name: '', contact_name: '', email: '', phone: '' }); },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedAttorney = attorneys?.find(a => a.id === showDetail);
  const activeAttorneys = attorneys?.filter(a => a.status === 'Active') || [];
  const avgLTV = activeAttorneys.length > 0
    ? activeAttorneys.reduce((sum, a) => sum + (a.avgSettlement * a.monthlyVolume * 36), 0) / activeAttorneys.length : 0;
  const casesThisMonth = attorneys?.reduce((sum, a) => sum + a.monthlyVolume, 0) || 0;

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

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Firm</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Contact</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Total</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Active</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Settled</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Avg Settlement</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Monthly</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Settings</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {attorneys?.map(a => (
              <tr key={a.id} className="hover:bg-accent/50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-foreground cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.firm_name}</td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs cursor-pointer" onClick={() => setShowDetail(a.id)}>{a.contact_name || '—'}</td>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={e => { e.stopPropagation(); setSettingsTarget({ id: a.id, firm_name: a.firm_name, contact_name: a.contact_name }); }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={addAttorney.isPending}>Add Attorney</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
