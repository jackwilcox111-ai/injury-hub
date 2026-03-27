import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Plus, CheckCircle2, Clock, AlertCircle, Send, Upload } from 'lucide-react';

const SPECIALTY_RECORDS: Record<string, string[]> = {
  'Pain Management': ['Initial Evaluation', 'Treatment Notes', 'Injection Records', 'Imaging', 'Billing'],
  'Chiropractic': ['Initial Evaluation', 'Treatment Notes', 'X-rays', 'Billing'],
  'Physical Therapy': ['Initial Evaluation', 'Progress Notes', 'Discharge Summary', 'Billing'],
  'Orthopedic': ['Initial Evaluation', 'Surgical Report', 'Imaging', 'Post-Op Notes', 'Billing'],
  'Imaging/MRI': ['MRI Report', 'X-ray Report', 'CT Report', 'Billing'],
  'Surgery Consultation': ['Consultation Notes', 'Pre-Op Evaluation', 'Surgical Report', 'Anesthesia Records', 'Billing'],
};

interface RecordsManagementTabProps {
  caseId: string;
  specialty?: string | null;
  providers: { id: string; name: string }[];
}

export function RecordsManagementTab({ caseId, specialty, providers }: RecordsManagementTabProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const isAdminOrCM = profile?.role === 'admin' || profile?.role === 'care_manager';

  const { data: records, isLoading } = useQuery({
    queryKey: ['case-records-mgmt', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('records').select('*, providers(name), documents(id, file_name, storage_path)')
        .eq('case_id', caseId).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: documents } = useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('*')
        .eq('case_id', caseId).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const [newRecord, setNewRecord] = useState({
    record_type: '', provider_id: '', received_date: '', delivered_to_attorney_date: '', hipaa_auth_on_file: false, notes: '',
  });
  const [recordFile, setRecordFile] = useState<File | null>(null);

  const addRecord = useMutation({
    mutationFn: async () => {
      let documentId: string | null = null;

      // Upload file first if provided, so we can link it
      if (recordFile) {
        const path = `${caseId}/${Date.now()}-${recordFile.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, recordFile);
        if (uploadError) throw uploadError;
        const { data: docData, error: docError } = await supabase.from('documents').insert({
          case_id: caseId,
          file_name: recordFile.name,
          storage_path: path,
          document_type: 'Medical Record',
          uploader_id: profile?.id,
          visible_to: ['admin', 'care_manager', 'attorney'],
        }).select('id').single();
        if (docError) throw docError;
        documentId = docData.id;
      }

      // Insert the record metadata with document link
      const { error } = await supabase.from('records').insert({
        case_id: caseId,
        provider_id: newRecord.provider_id || null,
        record_type: newRecord.record_type || null,
        received_date: newRecord.received_date || null,
        delivered_to_attorney_date: newRecord.delivered_to_attorney_date || null,
        hipaa_auth_on_file: newRecord.hipaa_auth_on_file,
        notes: newRecord.notes || null,
        document_id: documentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-records-mgmt', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-documents', caseId] });
      setShowAdd(false);
      setNewRecord({ record_type: '', provider_id: '', received_date: '', delivered_to_attorney_date: '', hipaa_auth_on_file: false, notes: '' });
      setRecordFile(null);
      toast.success('Record added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const requestAllMissing = useMutation({
    mutationFn: async (missing: string[]) => {
      // Create record entries
      const inserts = missing.map(rt => ({
        case_id: caseId,
        record_type: rt,
        notes: 'Auto-requested — missing record',
      }));
      const { error } = await supabase.from('records').insert(inserts);
      if (error) throw error;

      // Notify admin/CM staff about the request
      const { data: staff } = await supabase.from('profiles')
        .select('id').in('role', ['admin', 'care_manager']);
      if (staff && staff.length > 0) {
        await supabase.from('notifications').insert(
          staff.map((s: any) => ({
            recipient_id: s.id,
            title: 'Records Requested',
            message: `${missing.length} missing records requested for case. Types: ${missing.join(', ')}`,
            link: `/cases/${caseId}`,
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-records-mgmt', caseId] });
      toast.success('All missing records requested — staff notified');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadDoc = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 300);
    if (error) { toast.error('Failed to get download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const expectedTypes = specialty && SPECIALTY_RECORDS[specialty] ? SPECIALTY_RECORDS[specialty] : [];
  const receivedTypes = new Set(records?.map((r: any) => r.record_type) || []);
  const missingTypes = expectedTypes.filter(t => !receivedTypes.has(t));
  const deliveredCount = records?.filter((r: any) => r.delivered_to_attorney_date).length || 0;
  const receivedCount = records?.filter((r: any) => r.received_date).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Records Pipeline</h3>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrCM && missingTypes.length > 0 && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={() => requestAllMissing.mutate(missingTypes)} disabled={requestAllMissing.isPending}>
              <Send className="w-3.5 h-3.5 mr-1" /> Request All Missing ({missingTypes.length})
            </Button>
          )}
          {isAdminOrCM && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-foreground tabular-nums">{expectedTypes.length}</p>
          <p className="text-[10px] text-muted-foreground">Expected</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-foreground tabular-nums">{records?.length || 0}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-emerald-600 tabular-nums">{receivedCount}</p>
          <p className="text-[10px] text-muted-foreground">Received</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-blue-600 tabular-nums">{deliveredCount}</p>
          <p className="text-[10px] text-muted-foreground">Delivered to Atty</p>
        </div>
      </div>

      {/* Expected Records Checklist */}
      {expectedTypes.length > 0 && (
        <div className="bg-accent/30 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground mb-1">Expected Records Checklist — {specialty}</p>
          {expectedTypes.map(type => {
            const received = receivedTypes.has(type);
            return (
              <div key={type} className="flex items-center gap-2 text-xs">
                {received ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                <span className={received ? 'text-foreground' : 'text-muted-foreground'}>{type}</span>
                <span className={`text-[10px] ml-auto ${received ? 'text-emerald-600' : 'text-amber-500'}`}>{received ? 'Received' : 'Missing'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Uploaded Documents */}
      {documents && documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Uploaded Documents</p>
          <div className="space-y-1">
            {documents.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">{d.file_name}</span>
                  <span className="text-[10px] text-muted-foreground">{d.document_type}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => downloadDoc(d.storage_path, d.file_name)}>
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Records Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : !records?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">No records on file</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
           <thead><tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Document</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Received</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Delivered to Atty</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">HIPAA</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {records.map((r: any) => {
                const doc = r.documents;
                return (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium">{r.record_type || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">{r.providers?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {doc ? (
                        <button onClick={() => downloadDoc(doc.storage_path, doc.file_name)}
                          className="flex items-center gap-1 text-primary hover:underline">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[140px]">{doc.file_name}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.received_date || <span className="text-amber-500"><Clock className="w-3 h-3 inline" /> Pending</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.delivered_to_attorney_date || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">{r.hipaa_auth_on_file ? <span className="text-emerald-600">✓</span> : <span className="text-destructive">✗ Missing</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Record Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Record</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addRecord.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Record Type</Label>
              <Select value={newRecord.record_type} onValueChange={v => setNewRecord(p => ({ ...p, record_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {['Treatment Notes', 'Billing', 'Imaging', 'Surgical Report', 'Initial Evaluation', 'Progress Notes', 'Discharge Summary', 'X-rays', 'MRI Report', 'Other'].map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={newRecord.provider_id} onValueChange={v => setNewRecord(p => ({ ...p, provider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Received Date</Label><Input type="date" value={newRecord.received_date} onChange={e => setNewRecord(p => ({ ...p, received_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Delivered to Attorney</Label><Input type="date" value={newRecord.delivered_to_attorney_date} onChange={e => setNewRecord(p => ({ ...p, delivered_to_attorney_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Upload Document</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png,.tiff" onChange={e => setRecordFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG, or TIFF — max 20MB</p>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addRecord.isPending}>{addRecord.isPending ? 'Uploading...' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
