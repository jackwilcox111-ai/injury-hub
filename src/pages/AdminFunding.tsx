import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Banknote, Plus, Pencil, CheckCircle2, XCircle, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const typeColors: Record<string, string> = {
  'Pre-Settlement': 'bg-indigo-100 text-indigo-700',
  'Medical Lien': 'bg-blue-100 text-blue-700',
  'Post-Settlement': 'bg-violet-100 text-violet-700',
};

export default function AdminFunding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editApproved, setEditApproved] = useState('');
  const [editRepayment, setEditRepayment] = useState('');
  const [editPayoff, setEditPayoff] = useState('');
  const [activeTab, setActiveTab] = useState('requests');
  const [form, setForm] = useState({
    case_id: '', plaintiff_name: '', funding_type: 'Pre-Settlement', funding_company: '',
    requested_amount: '', approved_amount: '', interest_rate: '', advance_date: '',
    repayment_amount: '', repayment_date: '', payoff_amount: '', status: 'Requested',
    funding_agreement_signed: false, notes: '',
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-funding'],
    queryFn: async () => {
      const { data } = await supabase.from('funding_requests')
        .select('*, cases!funding_requests_case_id_fkey(case_number, patient_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: funderApps } = useQuery({
    queryKey: ['funder-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('funder_applications').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const pendingFunderCount = funderApps?.filter((a: any) => a.status === 'Pending').length || 0;

  const { data: cases } = useQuery({
    queryKey: ['cases-for-funding'],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('id, case_number, patient_name').order('case_number');
      return data || [];
    },
  });

  const addRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('funding_requests').insert({
        case_id: form.case_id,
        plaintiff_name: form.plaintiff_name || null,
        funding_type: form.funding_type,
        funding_company: form.funding_company || null,
        requested_amount: parseFloat(form.requested_amount) || 0,
        approved_amount: form.approved_amount ? parseFloat(form.approved_amount) : null,
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
        advance_date: form.advance_date || null,
        repayment_amount: form.repayment_amount ? parseFloat(form.repayment_amount) : null,
        repayment_date: form.repayment_date || null,
        payoff_amount: form.payoff_amount ? parseFloat(form.payoff_amount) : null,
        status: form.status,
        funding_agreement_signed: form.funding_agreement_signed,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-funding'] });
      setShowAdd(false);
      toast.success('Funding request added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRequest = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const updates: any = { status: editStatus };
      if (editApproved) updates.approved_amount = parseFloat(editApproved);
      if (editRepayment) updates.repayment_amount = parseFloat(editRepayment);
      if (editPayoff) updates.payoff_amount = parseFloat(editPayoff);
      if (editStatus === 'Funded' && !updates.advance_date) updates.advance_date = new Date().toISOString().split('T')[0];
      if (editStatus === 'Repaid' && !updates.repayment_date) updates.repayment_date = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('funding_requests').update(updates).eq('id', editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-funding'] });
      setEditId(null);
      toast.success('Funding request updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveFunder = useMutation({
    mutationFn: async (app: any) => {
      // Create funder_profiles record
      const { error: fpErr } = await supabase.from('funder_profiles').insert({
        company_name: app.company_name,
        contact_name: app.contact_name,
        email: app.email,
        phone: app.phone || null,
        funding_capacity_min: app.funding_capacity_min,
        funding_capacity_max: app.funding_capacity_max,
        accredited_investor: app.accredited_investor || false,
      });
      if (fpErr) throw fpErr;

      // Update application status
      const { error: updErr } = await supabase.from('funder_applications').update({ status: 'Approved' }).eq('id', app.id);
      if (updErr) throw updErr;

      // Invite funder user
      const { error: inviteErr } = await supabase.functions.invoke('invite-user', {
        body: {
          email: app.email,
          full_name: app.contact_name,
          role: 'funder',
        },
      });
      if (inviteErr) throw inviteErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funder-applications'] });
      toast.success('Funder approved — login invitation sent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectFunder = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.from('funder_applications').update({ status: 'Rejected' }).eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funder-applications'] });
      toast.success('Application rejected');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Funding</h2><Skeleton className="h-96 rounded-xl" /></div>;

  const active = requests?.filter(r => ['Requested', 'Under Review'].includes(r.status)).length || 0;
  const totalFunded = requests?.filter(r => r.status === 'Funded').reduce((s, r) => s + (r.approved_amount || 0), 0) || 0;
  const awaitingRepay = requests?.filter(r => r.status === 'Funded').length || 0;
  const totalRepaid = requests?.filter(r => r.status === 'Repaid').reduce((s, r) => s + (r.repayment_amount || 0), 0) || 0;

  const filtered = filter === 'All' ? requests : requests?.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2"><Banknote className="w-6 h-6 text-primary" /> Pre-Settlement Funding</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track funding requests, advances, and repayments</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> New Request</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Requests', value: active, color: 'text-amber-600' },
          { label: 'Total Funded', value: `$${totalFunded.toLocaleString()}`, color: 'text-emerald-600' },
          { label: 'Awaiting Repayment', value: awaitingRepay, color: 'text-blue-600' },
          { label: 'Total Repaid', value: `$${totalRepaid.toLocaleString()}`, color: 'text-violet-600' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <p className={`text-3xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Funding Requests</TabsTrigger>
          <TabsTrigger value="lender-apps" className="relative">
            Lender Applications
            {pendingFunderCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                {pendingFunderCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              {['All', 'Requested', 'Under Review', 'Funded', 'Repaid', 'Declined'].map(s => <TabsTrigger key={s} value={s} className="text-xs">{s}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Requested</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Approved</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Funder</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Agreement</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Repayment</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Edit</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered?.map(r => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${r.case_id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-primary">{(r as any).cases?.case_number}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.plaintiff_name || (r as any).cases?.patient_name}</span>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${typeColors[r.funding_type || ''] || ''}`}>{r.funding_type}</Badge></td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">${r.requested_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{r.approved_amount != null ? `$${r.approved_amount.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-xs">{r.funding_company || '—'}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{r.status}</Badge></td>
                    <td className="px-4 py-3 text-xs">{r.funding_agreement_signed ? <span className="text-emerald-600">✓ Signed</span> : <span className="text-muted-foreground">Pending</span>}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{r.repayment_amount != null ? `$${r.repayment_amount.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => {
                        e.stopPropagation();
                        setEditId(r.id);
                        setEditStatus(r.status);
                        setEditApproved(r.approved_amount?.toString() || '');
                        setEditRepayment(r.repayment_amount?.toString() || '');
                        setEditPayoff(r.payoff_amount?.toString() || '');
                      }}><Pencil className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {(!filtered || filtered.length === 0) && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No funding requests</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="lender-apps" className="mt-4">
          {!funderApps || funderApps.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No lender applications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {funderApps.map((app: any) => (
                <div key={app.id} className="bg-card border border-border rounded-xl p-5 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{app.company_name}</p>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{app.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{app.email}{app.phone ? ` · ${app.phone}` : ''}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(app.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {app.funding_capacity_min != null && app.funding_capacity_max != null && (
                      <span>Capacity: ${Number(app.funding_capacity_min).toLocaleString()} – ${Number(app.funding_capacity_max).toLocaleString()}</span>
                    )}
                    <span className={`flex items-center gap-1 ${app.accredited_investor ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {app.accredited_investor ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Accredited
                    </span>
                  </div>
                  {app.experience_notes && <p className="text-xs text-muted-foreground mt-2 italic">"{app.experience_notes}"</p>}
                  {app.status === 'Pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={() => approveFunder.mutate(app)} disabled={approveFunder.isPending}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { if (confirm('Reject this application?')) rejectFunder.mutate(app.id); }} disabled={rejectFunder.isPending}>
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Funding Request</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addRequest.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Case *</Label>
              <Select value={form.case_id} onValueChange={v => {
                const c = cases?.find(c => c.id === v);
                setForm(p => ({ ...p, case_id: v, plaintiff_name: c?.patient_name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select case..." /></SelectTrigger>
                <SelectContent>{cases?.map(c => <SelectItem key={c.id} value={c.id}>{c.case_number} — {c.patient_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Funding Type</Label>
                <Select value={form.funding_type} onValueChange={v => setForm(p => ({ ...p, funding_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Settlement">Pre-Settlement</SelectItem>
                    <SelectItem value="Medical Lien">Medical Lien</SelectItem>
                    <SelectItem value="Post-Settlement">Post-Settlement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-xs">Funding Company</Label><Input value={form.funding_company} onChange={e => setForm(p => ({ ...p, funding_company: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Requested Amount *</Label><Input type="number" step="0.01" value={form.requested_amount} onChange={e => setForm(p => ({ ...p, requested_amount: e.target.value }))} required /></div>
              <div className="space-y-2"><Label className="text-xs">Approved Amount</Label><Input type="number" step="0.01" value={form.approved_amount} onChange={e => setForm(p => ({ ...p, approved_amount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Interest Rate %</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm(p => ({ ...p, interest_rate: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">Advance Date</Label><Input type="date" value={form.advance_date} onChange={e => setForm(p => ({ ...p, advance_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addRequest.isPending || !form.case_id}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={!!editId} onOpenChange={open => !open && setEditId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Funding Request</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateRequest.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Requested', 'Under Review', 'Funded', 'Repaid', 'Declined'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-xs">Approved Amount</Label><Input type="number" step="0.01" value={editApproved} onChange={e => setEditApproved(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs">Repayment Amount</Label><Input type="number" step="0.01" value={editRepayment} onChange={e => setEditRepayment(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs">Payoff Amount</Label><Input type="number" step="0.01" value={editPayoff} onChange={e => setEditPayoff(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
              <Button type="submit" disabled={updateRequest.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
