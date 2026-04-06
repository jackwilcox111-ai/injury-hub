import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, FileText, DollarSign, FolderOpen, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { PHIBanner } from '@/components/global/PHIBanner';

const CHARGE_STATUSES = ['Pending', 'Submitted', 'Paid', 'Denied', 'Adjusted'];

export default function AdminRecordsBills() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Fetch all charges across cases
  const { data: charges, isLoading: chargesLoading } = useQuery({
    queryKey: ['admin-all-charges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('charges')
        .select('*, cases!charges_case_id_fkey(id, case_number, patient_name), providers!charges_provider_id_fkey(name), documents!charges_document_id_fkey(file_name, storage_path)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['admin-all-documents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents')
        .select('*, cases:case_id(id, case_number, patient_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all records
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin-all-records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('records')
        .select('*, cases!records_case_id_fkey(id, case_number, patient_name), providers!records_provider_id_fkey(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Update charge status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('charges').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-charges'] });
      toast.success('Charge status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 60);
    if (error) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  // Filter charges
  const filteredCharges = (charges || []).filter(c => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c as any).cases?.case_number?.toLowerCase().includes(s) ||
      (c as any).cases?.patient_name?.toLowerCase().includes(s) ||
      (c as any).providers?.name?.toLowerCase().includes(s) ||
      c.cpt_code?.toLowerCase().includes(s) ||
      c.cpt_description?.toLowerCase().includes(s)
    );
  });

  // Filter documents
  const filteredDocs = (documents || []).filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.file_name?.toLowerCase().includes(s) ||
      d.document_type?.toLowerCase().includes(s) ||
      (d as any).cases?.case_number?.toLowerCase().includes(s) ||
      (d as any).cases?.patient_name?.toLowerCase().includes(s)
    );
  });

  // Filter records
  const filteredRecords = (records || []).filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r as any).cases?.case_number?.toLowerCase().includes(s) ||
      (r as any).cases?.patient_name?.toLowerCase().includes(s) ||
      r.record_type?.toLowerCase().includes(s)
    );
  });

  // KPI metrics
  const pendingCount = charges?.filter(c => c.status === 'Pending').length || 0;
  const totalBilled = charges?.reduce((sum, c) => sum + (c.charge_amount || 0), 0) || 0;
  const totalPaid = charges?.filter(c => c.status === 'Paid').reduce((sum, c) => sum + (c.charge_amount || 0), 0) || 0;
  const deniedCount = charges?.filter(c => c.status === 'Denied').length || 0;

  const isLoading = chargesLoading || docsLoading || recordsLoading;
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-5">
      <PHIBanner />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Records & Bills</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Review charges, records, and documents across all cases.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by case, patient, provider..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-warning" />
          <p className="text-2xl font-bold tabular-nums text-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending Review</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <DollarSign className="w-4 h-4 mx-auto mb-1 text-foreground" />
          <p className="text-2xl font-bold tabular-nums text-foreground">${totalBilled.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Billed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <CheckCircle className="w-4 h-4 mx-auto mb-1 text-success" />
          <p className="text-2xl font-bold tabular-nums text-success">${totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Paid</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold tabular-nums text-destructive">{deniedCount}</p>
          <p className="text-xs text-muted-foreground">Denied</p>
        </div>
      </div>

      <Tabs defaultValue="charges" className="space-y-4">
        <TabsList className="bg-accent/30 border border-border">
          <TabsTrigger value="charges" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Charges ({charges?.length || 0})</TabsTrigger>
          <TabsTrigger value="records" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Records ({records?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs gap-1.5"><FolderOpen className="w-3.5 h-3.5" /> Documents ({documents?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Charges Tab */}
        <TabsContent value="charges" className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {CHARGE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filteredCharges.length} charges</span>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Path</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Bill</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCharges.map(c => (
                  <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/cases/${(c as any).cases?.id}`)} className="font-mono text-xs text-primary hover:underline">
                        {(c as any).cases?.case_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">{(c as any).cases?.patient_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{(c as any).providers?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono">{c.cpt_code}</span>
                      {c.cpt_description && <span className="text-muted-foreground ml-1">— {c.cpt_description}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.service_date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-right tabular-nums">${c.charge_amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{c.billing_path || 'Lien'}</Badge></td>
                    <td className="px-4 py-3">
                      {(c as any).documents?.storage_path ? (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => handleDownload((c as any).documents.storage_path)}>
                          <Download className="w-3 h-3 mr-1" /> PDF
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={c.status} onValueChange={v => updateStatus.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHARGE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {filteredCharges.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    No charges found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Received</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Delivered to Atty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/cases/${(r as any).cases?.id}`)} className="font-mono text-xs text-primary hover:underline">
                        {(r as any).cases?.case_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">{(r as any).cases?.patient_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{(r as any).providers?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs">{r.record_type || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.received_date || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.delivered_to_attorney_date || '—'}</td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    No records found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">File</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Uploaded</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map(d => (
                  <tr key={d.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      {(d as any).cases?.id ? (
                        <button onClick={() => navigate(`/cases/${(d as any).cases.id}`)} className="font-mono text-xs text-primary hover:underline">
                          {(d as any).cases?.case_number}
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">{(d as any).cases?.patient_name || '—'}</td>
                    <td className="px-4 py-3 text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[200px]">{d.file_name}</span>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{d.document_type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleDownload(d.storage_path)}>
                        <Download className="w-3 h-3 mr-1" /> Download
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    No documents found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
