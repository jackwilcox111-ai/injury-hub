import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { SortableHeader } from '@/components/global/SortableHeader';
import { useSortableTable } from '@/hooks/use-sortable-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { exportToCSV } from '@/lib/csv-export';
import { useState, useRef } from 'react';
import { Download, TrendingUp, PieChart, BarChart3, Percent, Search, Upload, CheckCircle2, AlertTriangle, FileText, FilePlus2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const lienStatuses = ['All', 'Active', 'Reduced', 'Paid', 'Waived'];

export default function LiensPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [uploadingLienId, setUploadingLienId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatingLienId, setGeneratingLienId] = useState<string | null>(null);
  const isAdminOrCM = profile?.role === 'admin' || profile?.role === 'care_manager';

  const { data: liens, isLoading } = useQuery({
    queryKey: ['liens-full'],
    queryFn: async () => {
      const { data } = await supabase.from('liens')
        .select('*, cases!liens_case_id_fkey(id, case_number, patient_name, attorney_id, settlement_estimate, sol_date, sol_period_days, accident_state, status, attorneys!cases_attorney_id_fkey(firm_name)), providers(name), documents!liens_lien_document_id_fkey(id, file_name, storage_path, signed)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: solAlerts } = useQuery({
    queryKey: ['sol-alerts'],
    queryFn: async () => {
      const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() + 1);
      const { data } = await supabase.from('cases_with_counts')
        .select('id, case_number, patient_name, attorney_id, sol_date, sol_period_days, accident_state, status, attorneys!cases_attorney_id_fkey(firm_name)')
        .lte('sol_date', cutoff.toISOString().split('T')[0])
        .not('sol_date', 'is', null)
        .order('sol_date', { ascending: true });
      return data || [];
    },
  });

  const uploadLienDoc = useMutation({
    mutationFn: async ({ lienId, caseId, file }: { lienId: string; caseId: string; file: File }) => {
      const filePath = `liens/${caseId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: doc, error: docError } = await supabase.from('documents').insert({
        case_id: caseId,
        file_name: file.name,
        storage_path: filePath,
        document_type: 'Lien Agreement',
        uploader_id: user?.id,
        visible_to: ['admin', 'care_manager', 'attorney'],
      }).select('id').single();
      if (docError) throw docError;

      const { error: linkError } = await supabase.from('liens')
        .update({ lien_document_id: doc.id } as any)
        .eq('id', lienId);
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      toast.success('Signed lien uploaded');
      queryClient.invalidateQueries({ queryKey: ['liens-full'] });
      setUploadingLienId(null);
    },
    onError: (e: any) => toast.error(e.message || 'Upload failed'),
  });

  const generateLienDoc = async (lien: any) => {
    setGeneratingLienId(lien.id);
    try {
      // Fetch case details
      const { data: caseData } = await supabase.from('cases')
        .select('*, attorneys!cases_attorney_id_fkey(firm_name, contact_name, phone, email), providers!cases_provider_id_fkey(name, phone, address_street, address_city, address_state, address_zip)')
        .eq('id', lien.case_id).single();
      // Fetch patient profile
      const { data: patientProfile } = await supabase.from('patient_profiles')
        .select('date_of_birth').eq('case_id', lien.case_id).maybeSingle();
      // Fetch provider details for this lien
      const { data: providerData } = lien.provider_id
        ? await supabase.from('providers').select('name, phone, address_street, address_city, address_state, address_zip').eq('id', lien.provider_id).single()
        : { data: null };
      // Fetch charges for this provider on this case
      const chargesQuery = supabase.from('charges').select('service_date, cpt_description, charge_amount, notes').eq('case_id', lien.case_id);
      if (lien.provider_id) chargesQuery.eq('provider_id', lien.provider_id);
      const { data: chargesData } = await chargesQuery.order('service_date', { ascending: true });

      const provAddr = providerData
        ? [providerData.address_street, providerData.address_city, providerData.address_state, providerData.address_zip].filter(Boolean).join(', ')
        : '';

      const mergeData = {
        today_date: format(new Date(), 'MMMM d, yyyy'),
        patient_name: caseData?.patient_name || '',
        patient_dob: patientProfile?.date_of_birth ? format(new Date(patientProfile.date_of_birth), 'MM/dd/yyyy') : '—',
        patient_dol: caseData?.accident_date ? format(new Date(caseData.accident_date), 'MM/dd/yyyy') : '—',
        case_number: caseData?.case_number || '',
        provider_name: providerData?.name || (lien as any).providers?.name || '—',
        provider_address: provAddr,
        provider_phone: providerData?.phone || '',
        attorney_name: caseData?.attorneys?.contact_name || '',
        attorney_firm: caseData?.attorneys?.firm_name || '',
        attorney_phone: caseData?.attorneys?.phone || '',
        lien_amount: lien.amount,
        charges: (chargesData || []).map((c: any) => ({
          service_date: c.service_date ? format(new Date(c.service_date), 'MM/dd/yyyy') : '—',
          description: c.notes || c.cpt_description || '—',
          amount: c.charge_amount,
        })),
      };

      const { data: result, error } = await supabase.functions.invoke('generate-case-document', {
        body: { case_id: lien.case_id, document_type: 'lien_agreement', merge_data: mergeData },
      });
      if (error) throw error;

      // Create a document record and link to lien
      const { data: doc, error: docError } = await supabase.from('documents').insert({
        case_id: lien.case_id,
        file_name: `Lien-Agreement-${(lien as any).providers?.name || 'provider'}.html`,
        storage_path: result.file_path,
        document_type: 'Lien Agreement',
        uploader_id: user?.id,
        visible_to: ['admin', 'care_manager', 'attorney'],
      }).select('id').single();
      if (docError) throw docError;

      await supabase.from('liens').update({ lien_document_id: doc.id } as any).eq('id', lien.id);

      toast.success('Lien agreement generated');
      queryClient.invalidateQueries({ queryKey: ['liens-full'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate lien document');
    }
    setGeneratingLienId(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingLienId) return;
    const lien = liens?.find(l => l.id === uploadingLienId);
    if (!lien) return;
    uploadLienDoc.mutate({ lienId: uploadingLienId, caseId: lien.case_id, file });
    e.target.value = '';
  };

  const handleDownloadLienDoc = async (e: React.MouseEvent, storagePath: string) => {
    e.stopPropagation();
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 300);
    if (error) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const statusFiltered = statusFilter === 'All' ? liens : liens?.filter(l => l.status === statusFilter);
  const filtered = statusFiltered?.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (l as any).cases?.case_number?.toLowerCase().includes(s) || (l as any).cases?.patient_name?.toLowerCase().includes(s) || (l as any).providers?.name?.toLowerCase().includes(s);
  });
  const { sortedData: sortedLiens, sortConfig: lienSortConfig, requestSort: lienRequestSort } = useSortableTable(filtered);
  const activeLiens = liens?.filter(l => l.status === 'Active' || l.status === 'Reduced') || [];
  const totalExposure = activeLiens.reduce((sum, l) => sum + (l.amount - l.reduction_amount), 0);
  const settledCases = new Set((liens || []).filter(l => (l as any).cases?.status === 'Settled').map(l => (l as any).cases?.id));
  const reductions = (liens || []).filter(l => l.reduction_amount > 0);
  const avgReduction = reductions.length > 0 ? reductions.reduce((sum, l) => sum + (l.reduction_amount / (l.amount || 1)), 0) / reductions.length : 0;
  const unsignedCount = activeLiens.filter(l => !(l as any).documents?.id).length;

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Liens & Settlements</h2><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".pdf,application/pdf,image/*" className="hidden" onChange={handleFileSelect} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Liens & Settlements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{liens?.length || 0} total liens</p>
        </div>
        <Button variant="outline" onClick={() => exportToCSV(filtered?.map(l => ({
          case_number: (l as any).cases?.case_number, patient: (l as any).cases?.patient_name,
          provider: (l as any).providers?.name, amount: l.amount, reduction: l.reduction_amount,
          net: l.amount - l.reduction_amount, status: l.status, signed: (l as any).documents?.id ? 'Yes' : 'No',
        })) || [], 'gothurt-liens.csv')}>
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Unsigned alert banner */}
      {unsignedCount > 0 && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">{unsignedCount} active lien{unsignedCount > 1 ? 's' : ''} missing signed agreement</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Total Lien Exposure', value: `$${totalExposure.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Active Liens', value: activeLiens.length, icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
          { label: 'Cases Settled', value: settledCases.size, icon: PieChart, color: 'text-violet-600 bg-violet-50' },
          { label: 'Avg Reduction Rate', value: `${(avgReduction * 100).toFixed(1)}%`, icon: Percent, color: 'text-amber-600 bg-amber-50' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-[18px] h-[18px]" /></div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search case, patient, provider..." className="pl-9 h-10" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {lienStatuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <SortableHeader label="Case" sortKey="cases.case_number" currentKey={lienSortConfig.key} direction={lienSortConfig.direction} onSort={lienRequestSort} />
            <SortableHeader label="Patient" sortKey="cases.patient_name" currentKey={lienSortConfig.key} direction={lienSortConfig.direction} onSort={lienRequestSort} />
            <SortableHeader label="Provider" sortKey="providers.name" currentKey={lienSortConfig.key} direction={lienSortConfig.direction} onSort={lienRequestSort} />
            <SortableHeader label="Lien" sortKey="amount" currentKey={lienSortConfig.key} direction={lienSortConfig.direction} onSort={lienRequestSort} />
            <SortableHeader label="Reduction" sortKey="reduction_amount" currentKey={lienSortConfig.key} direction={lienSortConfig.direction} onSort={lienRequestSort} />
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Net</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Signed Lien</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">SoL</th>
            <SortableHeader label="Status" sortKey="status" currentKey={lienSortConfig.key} direction={lienSortConfig.direction} onSort={lienRequestSort} />
          </tr></thead>
          <tbody className="divide-y divide-border">
            {sortedLiens?.map(l => {
              const doc = (l as any).documents;
              const isSigned = !!doc?.id;
              const isActive = l.status === 'Active' || l.status === 'Reduced';
              return (
                <tr key={l.id} className={`hover:bg-accent/50 cursor-pointer transition-colors ${!isSigned && isActive ? 'bg-destructive/5' : ''}`} onClick={() => navigate(`/cases/${(l as any).cases?.id}`)}>
                  <td className="px-5 py-3.5 font-mono text-xs text-primary font-medium">{(l as any).cases?.case_number}</td>
                  <td className="px-5 py-3.5 text-xs font-medium">{(l as any).cases?.patient_name}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{(l as any).providers?.name || '—'}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-emerald-600 tabular-nums">${l.amount.toLocaleString()}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-amber-600 tabular-nums">${l.reduction_amount.toLocaleString()}</td>
                  <td className="px-5 py-3.5 font-mono text-xs font-medium tabular-nums">${(l.amount - l.reduction_amount).toLocaleString()}</td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    {isSigned ? (
                      <button onClick={(e) => handleDownloadLienDoc(e, doc.storage_path)} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[100px]">{doc.file_name}</span>
                      </button>
                    ) : isAdminOrCM ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-[10px] text-primary hover:text-primary"
                          disabled={generatingLienId === l.id}
                          onClick={() => generateLienDoc(l)}
                        >
                          <FilePlus2 className="w-3 h-3 mr-1" />
                          {generatingLienId === l.id ? 'Generating…' : 'Generate'}
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className={`h-7 text-[10px] ${isActive ? 'text-destructive hover:text-destructive' : 'text-muted-foreground'}`}
                          disabled={uploadLienDoc.isPending && uploadingLienId === l.id}
                          onClick={() => { setUploadingLienId(l.id); fileInputRef.current?.click(); }}
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          {uploadLienDoc.isPending && uploadingLienId === l.id ? '…' : 'Upload'}
                        </Button>
                        {isActive && <AlertTriangle className="w-3 h-3 text-destructive" />}
                      </div>
                    ) : (
                      <Badge variant="outline" className={`text-[10px] ${isActive ? 'border-destructive/30 text-destructive' : ''}`}>
                        {isActive ? <><AlertTriangle className="w-3 h-3 mr-1" /> Unsigned</> : 'N/A'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><SoLCountdown sol_date={(l as any).cases?.sol_date} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={l.status} /></td>
                </tr>
              );
            })}
            {(!sortedLiens || sortedLiens.length === 0) && (
              <tr><td colSpan={9} className="px-5 py-16 text-center text-muted-foreground">No liens recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SoL Alerts */}
      {solAlerts && solAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Statute of Limitations Alerts</h3>
            <span className="text-[10px] text-muted-foreground">Automated email alerts coming in Phase 2</span>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-accent/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Attorney</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Deadline</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Days</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {solAlerts.map(c => {
                  const days = c.sol_date ? Math.ceil((new Date(c.sol_date).getTime() - Date.now()) / 86400000) : 999;
                  return (
                    <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className={`cursor-pointer hover:bg-accent/50 transition-colors ${days < 180 ? 'bg-red-50/50' : days < 365 ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-primary font-medium">{c.case_number}</td>
                      <td className="px-5 py-3 text-xs font-medium">{c.patient_name}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{(c as any).attorneys?.firm_name || '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs">{c.sol_date ? format(new Date(c.sol_date), 'MMM d, yyyy') : '—'}</td>
                      <td className="px-5 py-3"><SoLCountdown sol_date={c.sol_date} sol_period_days={c.sol_period_days} accident_state={c.accident_state} /></td>
                      <td className="px-5 py-3"><StatusBadge status={c.status || ''} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
