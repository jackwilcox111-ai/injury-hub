import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, Plus, FileText, Upload, X, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { compileFilesToPdf } from '@/lib/pdf-compiler';

const BILLING_PATHS = ['Lien', 'PIP', 'MedPay', 'Insurance'];
const STATUSES = ['Pending', 'Submitted', 'Paid', 'Denied', 'Adjusted'];

export function BillingChargesTab({ caseId, providers }: { caseId: string; providers: { id: string; name: string }[] }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const [attachingChargeId, setAttachingChargeId] = useState<string | null>(null);
  const isAdminOrCM = profile?.role === 'admin' || profile?.role === 'care_manager';
  const [billSortDir, setBillSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: charges, isLoading } = useQuery({
    queryKey: ['charges', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('charges')
        .select('*, providers(name), documents(file_name, storage_path)')
        .eq('case_id', caseId)
        .order('service_date', { ascending: false });
      return data || [];
    },
  });

  const [form, setForm] = useState({
    provider_id: '', service_date: '', description: '',
    units: '1', charge_amount: '', billing_path: 'Lien',
  });

  const invalidateChargeDerivedQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['charges', caseId] }),
      queryClient.invalidateQueries({ queryKey: ['case-liens', caseId] }),
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] }),
      queryClient.invalidateQueries({ queryKey: ['liens-full'] }),
      queryClient.invalidateQueries({ queryKey: ['provider-liens'] }),
    ]);
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      let documentId: string | null = null;

      // Upload file first if selected
      if (selectedFile) {
        const filePath = `charges/${caseId}/${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            case_id: caseId,
            file_name: selectedFile.name,
            storage_path: filePath,
            document_type: 'bill',
            uploader_id: user?.id,
          })
          .select('id')
          .single();
        if (docError) throw docError;
        documentId = docData.id;
      }

      const { error } = await supabase.from('charges').insert({
        case_id: caseId,
        provider_id: form.provider_id || null,
        service_date: form.service_date,
        cpt_code: form.description || 'BILL',
        cpt_description: form.description || null,
        units: Number(form.units) || 1,
        charge_amount: Number(form.charge_amount) || 0,
        billing_path: form.billing_path,
        document_id: documentId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateChargeDerivedQueries();
      setShowAdd(false);
      setSelectedFile(null);
      setForm({ provider_id: '', service_date: '', description: '', units: '1', charge_amount: '', billing_path: 'Lien' });
      toast.success('Charge added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('charges').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charges', caseId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const viewDocument = async (storagePath: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(storagePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const totalCharges = charges?.reduce((s, c: any) => s + Number(c.charge_amount || 0), 0) || 0;
  const totalPaid = charges?.reduce((s, c: any) => s + Number(c.paid_amount || 0), 0) || 0;
  const totalAR = totalCharges - totalPaid;

  const providerSummary = charges?.reduce((acc: any, c: any) => {
    const name = c.providers?.name || 'Unknown';
    if (!acc[name]) acc[name] = { charges: 0, paid: 0, count: 0 };
    acc[name].charges += Number(c.charge_amount || 0);
    acc[name].paid += Number(c.paid_amount || 0);
    acc[name].count++;
    return acc;
  }, {}) || {};

  const [compilingBills, setCompilingBills] = useState(false);
  const handleDownloadAllBills = async () => {
    const files = (charges || [])
      .filter((c: any) => c.documents?.storage_path)
      .map((c: any) => ({ storage_path: c.documents.storage_path, file_name: c.documents.file_name }));
    if (!files.length) { toast.error('No bill attachments to compile'); return; }
    setCompilingBills(true);
    try {
      await compileFilesToPdf(files, `bills-${caseId.slice(0, 8)}.pdf`);
      toast.success('Bills PDF downloaded');
    } catch (e: any) { toast.error(e.message || 'Failed to compile PDF'); }
    setCompilingBills(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Billing & Charges</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleDownloadAllBills} disabled={compilingBills}>
            <Download className="w-3.5 h-3.5 mr-1" /> {compilingBills ? 'Compiling…' : 'Download All'}
          </Button>
          {isAdminOrCM && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Charge
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold font-mono-data text-foreground tabular-nums">${totalCharges.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Charges</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold font-mono-data text-emerald-600 tabular-nums">${totalPaid.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Paid</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold font-mono-data text-amber-600 tabular-nums">${totalAR.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Outstanding A/R</p>
        </div>
      </div>

      {/* Provider A/R Summary */}
      {Object.keys(providerSummary).length > 0 && (
        <div className="bg-accent/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">Provider A/R Summary</p>
          <div className="space-y-1">
            {Object.entries(providerSummary).map(([name, s]: any) => (
              <div key={name} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{name} ({s.count} charges)</span>
                <span className="font-mono-data text-foreground">${(s.charges - s.paid).toLocaleString()} A/R</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charges Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : !charges?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">No charges recorded</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => setBillSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                  Date {billSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Path</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Bill</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {[...(charges || [])].sort((a: any, b: any) => {
                const dateA = a.service_date || '';
                const dateB = b.service_date || '';
                return billSortDir === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
              }).map((c: any) => (
                <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono-data text-xs">{c.service_date}</td>
                  <td className="px-4 py-2.5 text-xs text-foreground truncate max-w-[200px]">{c.cpt_description || c.cpt_code}</td>
                  <td className="px-4 py-2.5 text-xs">{c.providers?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.billing_path}</td>
                  <td className="px-4 py-2.5 text-right font-mono-data text-xs tabular-nums">${Number(c.charge_amount).toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    {c.documents?.storage_path ? (
                      <button
                        onClick={() => viewDocument(c.documents.storage_path)}
                        className="text-primary hover:underline flex items-center gap-1 text-xs"
                      >
                        <FileText className="w-3 h-3" /> View
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {isAdminOrCM ? (
                      <Select value={c.status} onValueChange={v => updateStatus.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{c.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Charge Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Charge</DialogTitle></DialogHeader>
          <form onSubmit={ev => { ev.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Service Date *</Label><Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Billing Path</Label>
                <Select value={form.billing_path} onValueChange={v => setForm(f => ({ ...f, billing_path: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BILLING_PATHS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Office visit, MRI, Injection..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount ($) *</Label><Input type="number" step="0.01" value={form.charge_amount} onChange={e => setForm(f => ({ ...f, charge_amount: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={form.provider_id} onValueChange={v => setForm(f => ({ ...f, provider_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes about this charge..." /></div>

            {/* Bill Upload */}
            <div className="space-y-2">
              <Label>Attach Bill (PDF or Image)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 bg-accent/30 rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{selectedFile.name}</span>
                  <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full h-9 text-xs" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Bill...
                </Button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground">PHI &mdash; Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending || !form.service_date || !form.charge_amount}>Submit</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
