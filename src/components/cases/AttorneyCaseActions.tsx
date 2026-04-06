import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, AlertTriangle } from 'lucide-react';

const ATTORNEY_CASE_STATUSES = ['Open', 'Closed', 'Dropped'] as const;
type AttorneyCaseStatus = typeof ATTORNEY_CASE_STATUSES[number];

interface Props {
  caseId: string;
  caseNumber: string;
  patientName: string;
  currentFlag: string | null;
  providerId: string | null;
}

export function AttorneyCaseActions({ caseId, caseNumber, patientName, currentFlag, providerId }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showDropConfirm, setShowDropConfirm] = useState(false);
  const [dropReason, setDropReason] = useState('');
  const [terminationFile, setTerminationFile] = useState<File | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Derive current attorney-facing status from case flag
  const currentStatus: AttorneyCaseStatus = currentFlag === 'dropped' ? 'Dropped' : currentFlag === 'closed_by_attorney' ? 'Closed' : 'Open';

  const dropCase = useMutation({
    mutationFn: async () => {
      // Upload termination letter if provided
      if (terminationFile) {
        const path = `${caseId}/${Date.now()}_${terminationFile.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, terminationFile);
        if (uploadError) throw uploadError;
        const { error: docError } = await supabase.from('documents').insert({
          case_id: caseId,
          file_name: terminationFile.name,
          storage_path: path,
          document_type: 'Termination Letter',
          uploader_id: user?.id,
          visible_to: ['admin', 'care_manager', 'attorney'],
        });
        if (docError) throw docError;
      }

      // Update case flag to dropped
      const { error } = await supabase.from('cases').update({ flag: 'dropped' }).eq('id', caseId);
      if (error) throw error;

      // Add case update log
      await supabase.from('case_updates').insert({
        case_id: caseId,
        author_id: user?.id,
        message: `Case dropped by attorney (${profile?.full_name}). Reason: ${dropReason || 'Not specified'}`,
      });

      // Add timeline event
      await supabase.from('case_timelines').insert({
        case_id: caseId,
        event_date: new Date().toISOString().split('T')[0],
        event_type: 'Case Closed',
        event_title: `Case dropped by attorney — ${profile?.full_name}`,
        event_detail: dropReason || null,
        visible_to: ['admin', 'care_manager', 'attorney', 'provider'],
      });

      // Trigger notification email via edge function
      try {
        await supabase.functions.invoke('case-dropped-notify', {
          body: { case_id: caseId, case_number: caseNumber, patient_name: patientName, attorney_name: profile?.full_name, reason: dropReason, provider_id: providerId },
        });
      } catch (e) {
        console.warn('Notification email failed (non-blocking):', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-updates', caseId] });
      setShowDropConfirm(false);
      setDropReason('');
      setTerminationFile(null);
      toast.success('Case marked as dropped. Notifications sent.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async (status: AttorneyCaseStatus) => {
      if (status === 'Dropped') {
        setShowDropConfirm(true);
        return;
      }
      const flag = status === 'Closed' ? 'closed_by_attorney' : null;
      const { error } = await supabase.from('cases').update({ flag }).eq('id', caseId);
      if (error) throw error;
      await supabase.from('case_updates').insert({
        case_id: caseId,
        author_id: user?.id,
        message: `Case marked as "${status}" by attorney (${profile?.full_name})`,
      });
    },
    onSuccess: (_data, status) => {
      if (status === 'Dropped') return; // handled by dialog
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-updates', caseId] });
      toast.success('Case status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadTerminationLetter = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('No file selected');
      const path = `${caseId}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, uploadFile);
      if (uploadError) throw uploadError;
      const { error: docError } = await supabase.from('documents').insert({
        case_id: caseId,
        file_name: uploadFile.name,
        storage_path: path,
        document_type: 'Termination Letter',
        uploader_id: user?.id,
        visible_to: ['admin', 'care_manager', 'attorney'],
      });
      if (docError) throw docError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-detail', caseId] });
      setShowUpload(false);
      setUploadFile(null);
      toast.success('Termination letter uploaded');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Label className="text-xs text-muted-foreground">Case Disposition</Label>
      <div className="flex items-center gap-2">
        <Select
          value={currentStatus}
          onValueChange={(v) => changeStatus.mutate(v as AttorneyCaseStatus)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTORNEY_CASE_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <span className={s === 'Dropped' ? 'text-destructive font-medium' : ''}>
                  {s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Upload Termination Letter" onClick={() => setShowUpload(true)}>
          <Upload className="w-3.5 h-3.5" />
        </Button>
      </div>

      {currentStatus === 'Dropped' && (
        <div className="col-span-full flex items-center gap-2 bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          This case has been dropped by the attorney.
        </div>
      )}

      {/* Drop confirmation dialog */}
      <Dialog open={showDropConfirm} onOpenChange={setShowDropConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Drop Case
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will notify the care management team and providers on the case. This action can be reversed by setting the case back to "Open".
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for dropping (optional)</Label>
              <Textarea
                value={dropReason}
                onChange={e => setDropReason(e.target.value)}
                placeholder="e.g. Client non-responsive, liability issues..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Letter of Representation Termination (optional)</Label>
              <Input type="file" onChange={e => setTerminationFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDropConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => dropCase.mutate()} disabled={dropCase.isPending}>
                {dropCase.isPending ? 'Processing...' : 'Confirm Drop'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload termination letter dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Termination Letter</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); uploadTerminationLetter.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>File *</Label>
              <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button type="submit" disabled={uploadTerminationLetter.isPending || !uploadFile}>Upload</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
