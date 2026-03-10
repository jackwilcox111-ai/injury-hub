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
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function AttorneysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [form, setForm] = useState({ firm_name: '', contact_name: '', email: '', phone: '' });

  const { data: attorneys, isLoading } = useQuery({
    queryKey: ['attorneys'],
    queryFn: async () => {
      const { data: attys } = await supabase.from('attorneys').select('*').order('firm_name');
      if (!attys) return [];
      const { data: cases } = await supabase.from('cases').select('attorney_id, status, settlement_final, opened_date');
      const enriched = attys.map(a => {
        const aCases = cases?.filter(c => c.attorney_id === a.id) || [];
        const settled = aCases.filter(c => c.status === 'Settled');
        const active = aCases.filter(c => c.status !== 'Settled');
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthly = aCases.filter(c => c.opened_date && new Date(c.opened_date) >= thirtyDaysAgo);
        const avgSettlement = settled.length > 0 ? settled.reduce((sum, c) => sum + (c.settlement_final || 0), 0) / settled.length : 0;
        return { ...a, totalCases: aCases.length, activeCases: active.length, settledCases: settled.length, avgSettlement, monthlyVolume: monthly.length };
      });
      return enriched;
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

  // LTV calculations
  const activeAttorneys = attorneys?.filter(a => a.status === 'Active') || [];
  const avgLTV = activeAttorneys.length > 0
    ? activeAttorneys.reduce((sum, a) => sum + (a.avgSettlement * a.monthlyVolume * 36), 0) / activeAttorneys.length
    : 0;
  const totalPipeline = attorneys?.reduce((sum, a) => sum, 0) || 0; // computed below from cases
  const casesThisMonth = attorneys?.reduce((sum, a) => sum + a.monthlyVolume, 0) || 0;

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-xl">Attorneys</h2><Skeleton className="h-96 rounded" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Attorney Relationships</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Attorney</Button>
      </div>

      <div className="bg-card border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Firm</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Contact</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Email</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Total</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Active</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Settled</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Avg Settlement</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Monthly</th>
            <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Status</th>
          </tr></thead>
          <tbody>
            {attorneys?.map((a, i) => (
              <tr key={a.id} onClick={() => setShowDetail(a.id)} className={`border-b border-border cursor-pointer hover:bg-secondary/50 ${i % 2 === 1 ? 'bg-card' : 'bg-background'}`}>
                <td className="px-4 py-3 text-foreground font-medium">{a.firm_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{a.contact_name || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{a.email || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.totalCases}</td>
                <td className="px-4 py-3 font-mono text-xs text-primary">{a.activeCases}</td>
                <td className="px-4 py-3 font-mono text-xs text-settled">{a.settledCases}</td>
                <td className="px-4 py-3 font-mono text-xs text-success">{a.avgSettlement > 0 ? `$${Math.round(a.avgSettlement).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 rounded-full bg-secondary w-16 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(a.monthlyVolume / 5 * 100, 100)}%` }} />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{a.monthlyVolume}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LTV Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded p-6">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-success" />
          <p className="text-muted-foreground text-xs font-mono uppercase">Avg Attorney LTV (3yr)</p>
          <p className="text-2xl font-mono text-foreground mt-2">${Math.round(avgLTV).toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded p-6">
          <p className="text-muted-foreground text-xs font-mono uppercase">Cases This Month</p>
          <p className="text-2xl font-mono text-foreground mt-2">{casesThisMonth}</p>
        </div>
        <div className="bg-card border border-border rounded p-6">
          <p className="text-muted-foreground text-xs font-mono uppercase">Active Firms</p>
          <p className="text-2xl font-mono text-foreground mt-2">{activeAttorneys.length}</p>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{selectedAttorney?.firm_name}</DialogTitle></DialogHeader>
          {selectedAttorney && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{selectedAttorney.contact_name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-mono text-foreground">{selectedAttorney.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-mono text-foreground">{selectedAttorney.phone}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedAttorney.status} /></div>
              </div>
              {linkedCases && linkedCases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Cases</p>
                  {linkedCases.map(c => (
                    <button key={c.id} onClick={() => { setShowDetail(null); navigate(`/cases/${c.id}`); }} className="w-full flex items-center justify-between py-1.5 text-xs hover:bg-secondary rounded px-2">
                      <span className="font-mono text-primary">{c.case_number}</span>
                      <span className="text-foreground">{c.patient_name}</span>
                      <SoLCountdown sol_date={c.sol_date} />
                      <StatusBadge status={c.status || ''} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Attorney Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display">Add Attorney</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addAttorney.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Firm Name *</Label>
              <Input value={form.firm_name} onChange={e => setForm(p => ({...p, firm_name: e.target.value}))} required className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Contact Name</Label>
                <Input value={form.contact_name} onChange={e => setForm(p => ({...p, contact_name: e.target.value}))} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="bg-background border-border" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addAttorney.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
