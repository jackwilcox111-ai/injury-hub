import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText, Download, Plus, ChevronDown, Send, Loader2 } from 'lucide-react';

const DOCUMENT_TYPES = {
  referral_letter: 'Referral Letter',
  imaging_requisition: 'Imaging Requisition',
  work_treatment_note: 'Work/Treatment Note',
} as const;

type DocType = keyof typeof DOCUMENT_TYPES;

const IMAGING_OPTIONS = ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Other'];

interface Props {
  caseId: string;
  caseData: any;
  patientProfile: any;
  allProviders: { id: string; name: string }[];
}

export function CaseDocumentsTab({ caseId, caseData, patientProfile, allProviders }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isStaff = profile?.role === 'admin' || profile?.role === 'care_manager';
  const canGenerate = isStaff || profile?.role === 'provider';

  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedType, setSelectedType] = useState<DocType | null>(null);
  const [receivingProviderId, setReceivingProviderId] = useState('');
  const [referringProviderId, setReferringProviderId] = useState(caseData?.provider_id || '');
  const [additionalNotes, setAdditionalNotes] = useState('');
  // Imaging-specific fields
  const [imagingTypes, setImagingTypes] = useState<string[]>([]);
  const [imagingOther, setImagingOther] = useState('');
  const [bodyParts, setBodyParts] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  // Work/Treatment note fields
  const [treatmentSchedule, setTreatmentSchedule] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('case_documents')
        .select('*, receiving_provider:providers!case_documents_receiving_provider_id_fkey(name), generated_by_profile:profiles!case_documents_generated_by_fkey(full_name)')
        .eq('case_id', caseId)
        .order('generated_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch full provider details for merge fields
  const { data: receivingProvider } = useQuery({
    queryKey: ['provider-detail', receivingProviderId],
    queryFn: async () => {
      if (!receivingProviderId) return null;
      const { data } = await supabase.from('providers').select('*').eq('id', receivingProviderId).single();
      return data;
    },
    enabled: !!receivingProviderId,
  });

  const { data: referringProvider } = useQuery({
    queryKey: ['provider-detail', referringProviderId],
    queryFn: async () => {
      if (!referringProviderId) return null;
      const { data } = await supabase.from('providers').select('*').eq('id', referringProviderId).single();
      return data;
    },
    enabled: !!referringProviderId,
  });

  // Fetch insurance info for merge fields
  const { data: insuranceData } = useQuery({
    queryKey: ['case-insurance-for-doc', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('insurance_eligibility')
        .select('carrier_name, policy_number')
        .eq('case_id', caseId)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const buildMergeData = () => {
    const providerAddress = (p: any) =>
      [p?.address_street, p?.address_city, p?.address_state, p?.address_zip].filter(Boolean).join(', ');
    const patientAddress = [patientProfile?.address, patientProfile?.city, patientProfile?.state, patientProfile?.zip].filter(Boolean).join(', ');

    return {
      patient_name: caseData?.patient_name || '',
      patient_dob: patientProfile?.date_of_birth || '',
      patient_dol: caseData?.accident_date || '',
      patient_phone: caseData?.patient_phone || '',
      patient_address: patientAddress,
      injury_type: caseData?.specialty || '',
      insurance_info: insuranceData ? `${insuranceData.carrier_name || ''} ${insuranceData.policy_number ? '— Policy #' + insuranceData.policy_number : ''}`.trim() : '',
      referring_provider_name: referringProvider?.name || '',
      referring_provider_practice: referringProvider?.name || '',
      referring_provider_phone: referringProvider?.phone || '',
      referring_provider_fax: referringProvider?.fax || '',
      referring_provider_npi: (referringProvider as any)?.npi || '',
      referring_provider_address: providerAddress(referringProvider),
      receiving_provider_name: receivingProvider?.name || '',
      receiving_provider_practice: receivingProvider?.name || '',
      receiving_provider_phone: receivingProvider?.phone || '',
      receiving_provider_fax: receivingProvider?.fax || '',
      receiving_provider_address: providerAddress(receivingProvider),
      case_number: caseData?.case_number || '',
      attorney_name: (caseData as any)?.attorneys?.contact_name || '',
      attorney_firm: (caseData as any)?.attorneys?.firm_name || '',
      attorney_phone: '',
      today_date: format(new Date(), 'MMMM d, yyyy'),
      additional_notes: additionalNotes,
      // Imaging-specific
      imaging_types: imagingTypes,
      imaging_other: imagingOther,
      body_parts: bodyParts,
      clinical_indication: clinicalIndication || caseData?.specialty || '',
      // Work/treatment note
      treatment_schedule: treatmentSchedule,
    };
  };

  const generateMutation = useMutation({
    mutationFn: async ({ sendEmail }: { sendEmail: boolean }) => {
      const mergeData = buildMergeData();

      const { data, error } = await supabase.functions.invoke('generate-case-document', {
        body: {
          case_id: caseId,
          document_type: selectedType,
          merge_data: mergeData,
          receiving_provider_id: receivingProviderId || null,
          referring_provider_id: referringProviderId || null,
          additional_notes: additionalNotes,
          send_email: sendEmail,
          receiving_provider_email: receivingProvider?.email || null,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', caseId] });
      toast.success(vars.sendEmail ? 'Document generated & sent' : 'Document generated');
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || 'Failed to generate document'),
  });

  const resetForm = () => {
    setShowGenerate(false);
    setSelectedType(null);
    setReceivingProviderId('');
    setAdditionalNotes('');
    setImagingTypes([]);
    setImagingOther('');
    setBodyParts('');
    setClinicalIndication('');
    setTreatmentSchedule('');
  };

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 300);
    if (error) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const openGenerator = (type: DocType) => {
    setSelectedType(type);
    setReferringProviderId(caseData?.provider_id || '');
    setClinicalIndication(caseData?.specialty || '');
    setShowGenerate(true);
  };

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Header with Generate button */}
      {isStaff && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Generate Document <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openGenerator('referral_letter')}>Referral Letter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openGenerator('imaging_requisition')}>Imaging Requisition</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openGenerator('work_treatment_note')}>Work/Treatment Note</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Documents table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-accent/50">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Document Type</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Generated</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Receiving Provider</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Generated By</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {documents?.map((doc: any) => (
            <tr key={doc.id} className="hover:bg-accent/30 transition-colors">
              <td className="px-4 py-2.5 text-xs font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                {DOCUMENT_TYPES[doc.document_type as DocType] || doc.document_type}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs">
                {doc.generated_at ? format(new Date(doc.generated_at), 'MMM d, yyyy') : '—'}
              </td>
              <td className="px-4 py-2.5 text-xs">{doc.receiving_provider?.name || '—'}</td>
              <td className="px-4 py-2.5 text-xs">{doc.generated_by_profile?.full_name || '—'}</td>
              <td className="px-4 py-2.5">
                <Badge variant={doc.status === 'sent' ? 'default' : 'outline'} className="text-[10px]">
                  {doc.status === 'sent' ? 'Sent' : 'Generated'}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                {doc.file_path && (
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleDownload(doc.file_path)}>
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {(!documents || documents.length === 0) && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No documents generated yet</td></tr>
          )}
        </tbody>
      </table>

      {/* Generate Document Dialog */}
      <Dialog open={showGenerate} onOpenChange={v => { if (!v) resetForm(); else setShowGenerate(v); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate {selectedType ? DOCUMENT_TYPES[selectedType] : 'Document'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Referring Provider */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Referring Provider</Label>
              <Select value={referringProviderId} onValueChange={setReferringProviderId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select referring provider..." /></SelectTrigger>
                <SelectContent>
                  {allProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Receiving Provider */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Receiving Provider</Label>
              <Select value={receivingProviderId} onValueChange={setReceivingProviderId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select receiving provider..." /></SelectTrigger>
                <SelectContent>
                  {allProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Imaging-specific fields */}
            {selectedType === 'imaging_requisition' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Imaging Requested</Label>
                  <div className="flex flex-wrap gap-3">
                    {IMAGING_OPTIONS.map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={imagingTypes.includes(opt)}
                          onCheckedChange={v => {
                            if (v) setImagingTypes(prev => [...prev, opt]);
                            else setImagingTypes(prev => prev.filter(t => t !== opt));
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {imagingTypes.includes('Other') && (
                    <Input placeholder="Specify other imaging..." value={imagingOther} onChange={e => setImagingOther(e.target.value)} className="h-9 mt-1" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Body Part(s) / Region</Label>
                  <Input value={bodyParts} onChange={e => setBodyParts(e.target.value)} placeholder="e.g. Cervical spine, Lumbar spine" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Clinical Indication / Reason for Exam</Label>
                  <Textarea value={clinicalIndication} onChange={e => setClinicalIndication(e.target.value)} placeholder="Describe clinical reason..." />
                </div>
              </>
            )}

            {/* Work/Treatment note fields */}
            {selectedType === 'work_treatment_note' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Treatment Schedule</Label>
                <Input value={treatmentSchedule} onChange={e => setTreatmentSchedule(e.target.value)} placeholder="e.g. 3x per week for 4 weeks" className="h-10" />
              </div>
            )}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Notes</Label>
              <Textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Add any context or special instructions..." />
            </div>

            {/* Preview section */}
            {selectedType && (
              <div className="border border-border rounded-lg p-4 bg-muted/30 max-h-64 overflow-y-auto">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Preview</h4>
                <DocumentPreview type={selectedType} mergeData={buildMergeData()} />
              </div>
            )}

            <p className="text-xs text-muted-foreground border-t pt-3">PHI — Handle in accordance with HIPAA policy</p>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button
                onClick={() => generateMutation.mutate({ sendEmail: false })}
                disabled={generateMutation.isPending}
                className="gap-1.5"
              >
                {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                Generate PDF
              </Button>
              {receivingProvider?.email && (
                <Button
                  onClick={() => generateMutation.mutate({ sendEmail: true })}
                  disabled={generateMutation.isPending}
                  variant="default"
                  className="gap-1.5"
                >
                  {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Generate & Email
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentPreview({ type, mergeData }: { type: DocType; mergeData: any }) {
  const d = mergeData;

  if (type === 'referral_letter') {
    return (
      <div className="text-xs space-y-2 text-foreground leading-relaxed">
        <p className="font-semibold">{d.referring_provider_practice}</p>
        <p>{d.referring_provider_address}</p>
        <p>Phone: {d.referring_provider_phone} | Fax: {d.referring_provider_fax}</p>
        <p className="pt-2">Date: {d.today_date}</p>
        <p className="pt-2">To: {d.receiving_provider_name}<br />{d.receiving_provider_practice}<br />{d.receiving_provider_address}</p>
        <p className="pt-2">Re: Patient Referral<br />Patient: {d.patient_name}<br />DOB: {d.patient_dob}<br />Date of Injury: {d.patient_dol}<br />Case #: {d.case_number}</p>
        <p className="pt-2">Dear {d.receiving_provider_name},</p>
        <p>I am referring the above patient to your office for evaluation and treatment related to injuries sustained on {d.patient_dol}.</p>
        <p>Injury Type: {d.injury_type}</p>
        <p>Attorney on File: {d.attorney_name} — {d.attorney_firm}</p>
        {d.additional_notes && <p className="pt-1 italic">{d.additional_notes}</p>}
        <p className="pt-2">Sincerely,<br />{d.referring_provider_name}<br />NPI: {d.referring_provider_npi}</p>
      </div>
    );
  }

  if (type === 'imaging_requisition') {
    return (
      <div className="text-xs space-y-2 text-foreground leading-relaxed">
        <p className="font-bold text-center">IMAGING REQUISITION</p>
        <p>Date: {d.today_date}</p>
        <p>Ordering Provider: {d.referring_provider_name}<br />{d.referring_provider_practice}<br />NPI: {d.referring_provider_npi}</p>
        <p className="pt-1">Patient: {d.patient_name}<br />DOB: {d.patient_dob}<br />Phone: {d.patient_phone}</p>
        <p className="pt-1">Date of Injury: {d.patient_dol}<br />Injury Type: {d.injury_type}<br />Case #: {d.case_number}</p>
        <p className="pt-1">Imaging Requested: {(d.imaging_types || []).join(', ')}{d.imaging_other ? ` — ${d.imaging_other}` : ''}</p>
        <p>Body Part(s): {d.body_parts}</p>
        <p>Clinical Indication: {d.clinical_indication}</p>
        <p className="pt-1">Send Results To: {d.referring_provider_name} — Fax: {d.referring_provider_fax}</p>
        {d.additional_notes && <p className="pt-1 italic">{d.additional_notes}</p>}
      </div>
    );
  }

  // work_treatment_note
  return (
    <div className="text-xs space-y-2 text-foreground leading-relaxed">
      <p className="font-bold text-center">WORK/TREATMENT NOTE</p>
      <p>Date: {d.today_date}</p>
      <p>Provider: {d.referring_provider_name}<br />{d.referring_provider_practice}<br />{d.referring_provider_address}</p>
      <p className="pt-2">To Whom It May Concern:</p>
      <p>This letter is to confirm that {d.patient_name} (DOB: {d.patient_dob}) is a patient of {d.referring_provider_practice}.</p>
      <p>The above patient will begin treating at our office for their injuries sustained in a motor vehicle collision on {d.patient_dol}.</p>
      {d.treatment_schedule && <p>Treatment schedule: {d.treatment_schedule}</p>}
      <p>The patient may need to be excused from work/school obligations during the course of treatment.</p>
      {d.additional_notes && <p className="pt-1 italic">{d.additional_notes}</p>}
      <p className="pt-2">Sincerely,<br />{d.referring_provider_name}<br />{d.referring_provider_practice}</p>
    </div>
  );
}
