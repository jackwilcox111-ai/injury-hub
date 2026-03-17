import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Upload, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';

const DOC_TYPES = ['Medical Records', 'Imaging', 'Treatment Notes', 'Billing Statement', 'Referral Letter', 'Other'];

export function ProviderDocumentsTab({ cases }: { cases: Array<{ id: string; case_number: string; patient_name: string }> }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [docType, setDocType] = useState('Medical Records');
  const [file, setFile] = useState<File | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['provider-documents'],
    queryFn: async () => {
      const { data } = await supabase.from('documents')
        .select('*, cases:case_id(case_number, patient_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async () => {
      if (!file || !selectedCaseId || !user) throw new Error('Missing required fields');
      const filePath = `${selectedCaseId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('documents').insert({
        case_id: selectedCaseId,
        file_name: file.name,
        storage_path: filePath,
        document_type: docType,
        uploader_id: user.id,
        visible_to: ['admin', 'care_manager', 'provider'],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-documents'] });
      setShowUpload(false);
      setFile(null);
      setSelectedCaseId('');
      toast.success('Document uploaded');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 60);
    if (error) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Upload className="w-3.5 h-3.5 mr-1" /> Upload Document
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">File</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Uploaded</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents?.map(d => (
              <tr key={d.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary">{(d as any).cases?.case_number}</td>
                <td className="px-4 py-3 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  {d.file_name}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">{d.document_type}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : '—'}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleDownload(d.storage_path, d.file_name)}>
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                </td>
              </tr>
            ))}
            {(!documents || documents.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No documents</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); uploadDoc.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Case *</Label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger><SelectValue placeholder="Select case..." /></SelectTrigger>
                <SelectContent>
                  {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.case_number} — {c.patient_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button type="submit" disabled={uploadDoc.isPending || !selectedCaseId || !file}>Upload</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
