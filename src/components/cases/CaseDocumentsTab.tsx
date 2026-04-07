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
import { FileText, Download, Plus, ChevronDown, Send, Loader2, AlertTriangle } from 'lucide-react';

const DOCUMENT_TYPES = {
  referral_letter: 'Referral Letter',
  imaging_requisition: 'Imaging Requisition',
  work_treatment_note: 'Work/Treatment Note',
  medical_necessity_md_referral: 'Medical Necessity — MD Referral',
} as const;

type DocType = keyof typeof DOCUMENT_TYPES;

const IMAGING_OPTIONS = ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Other'];
const IMAGING_TYPE_MAP: Record<string, string> = {
  'X-Ray': 'xray', 'MRI': 'mri', 'CT Scan': 'ct_scan', 'Ultrasound': 'ultrasound', 'Other': 'other',
};

const MEDICAL_NECESSITY_REASONS = [
  'Patient\'s condition has not responded adequately to conservative care',
  'Patient presents with symptoms beyond the scope of my practice',
  'Patient requires medication management for pain/inflammation',
  'Patient may require interventional procedures (injections, nerve blocks, etc.)',
  'Diagnostic workup requires MD oversight',
  'Patient\'s neurological findings warrant urgent medical evaluation',
];

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
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [clinicalIndication, setClinicalIndication] = useState<string[]>([]);
  const [contrastOption, setContrastOption] = useState('without');
  // Work/Treatment note fields
  const [treatmentSchedule, setTreatmentSchedule] = useState('');
  // Medical necessity fields
  const [mnPrimaryComplaints, setMnPrimaryComplaints] = useState('');
  const [mnObjectiveFindings, setMnObjectiveFindings] = useState('');
  const [mnCurrentTreatment, setMnCurrentTreatment] = useState('');
  const [mnPatientResponse, setMnPatientResponse] = useState('');
  const [mnReasons, setMnReasons] = useState<string[]>([]);
  const [mnReasonOther, setMnReasonOther] = useState('');
  const [mnAdditionalClinical, setMnAdditionalClinical] = useState('');
  // Imaging facility
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  // Medical necessity warning for referral letters
  const [showMnWarning, setShowMnWarning] = useState(false);

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

  // Fetch imaging facilities for auto-selection
  const patientState = patientProfile?.state || caseData?.accident_state || '';
  const patientCity = patientProfile?.city || '';

  const { data: matchingFacilities } = useQuery({
    queryKey: ['imaging-facilities-match', patientState, patientCity, imagingTypes],
    queryFn: async () => {
      if (!patientState) return [];
      let q = supabase.from('imaging_facilities').select('*').eq('status', 'active').eq('state', patientState);
      if (patientCity) q = q.ilike('city', `%${patientCity}%`);
      const { data } = await q;
      if (!data) return [];
      // Filter by imaging types
      const mappedTypes = imagingTypes.map(t => IMAGING_TYPE_MAP[t]).filter(Boolean);
      if (mappedTypes.length === 0) return data;
      return data.filter((f: any) => mappedTypes.some(t => f.accepted_imaging_types.includes(t)));
    },
    enabled: selectedType === 'imaging_requisition' && imagingTypes.length > 0,
  });

  const selectedFacility = matchingFacilities?.find((f: any) => f.id === selectedFacilityId);

  // Check if MN form exists for this case
  const { data: existingMnDocs } = useQuery({
    queryKey: ['case-mn-docs', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('case_documents')
        .select('id, status')
        .eq('case_id', caseId)
        .eq('document_type', 'medical_necessity_md_referral');
      return data || [];
    },
  });

  const buildMergeData = () => {
    const providerAddress = (p: any) =>
      [p?.address_street, p?.address_city, p?.address_state, p?.address_zip].filter(Boolean).join(', ');
    const patientAddress = [patientProfile?.address, patientProfile?.city, patientProfile?.state, patientProfile?.zip].filter(Boolean).join(', ');

    const base: Record<string, any> = {
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
      body_parts: bodyParts.join(', '),
      clinical_indication: clinicalIndication.length > 0 ? clinicalIndication.join(', ') : (caseData?.specialty || ''),
      contrast_option: contrastOption,
      // Work/treatment note
      treatment_schedule: treatmentSchedule,
    };

    // Imaging facility data
    if (selectedType === 'imaging_requisition' && selectedFacility) {
      base.imaging_facility_name = selectedFacility.name;
      base.imaging_facility_address = selectedFacility.address || `${selectedFacility.city}, ${selectedFacility.state}`;
      base.imaging_facility_phone = selectedFacility.phone || '';
      base.imaging_facility_fax = selectedFacility.fax || '';
    }

    // Medical necessity fields
    if (selectedType === 'medical_necessity_md_referral') {
      base.mn_primary_complaints = mnPrimaryComplaints;
      base.mn_objective_findings = mnObjectiveFindings;
      base.mn_current_treatment = mnCurrentTreatment;
      base.mn_patient_response = mnPatientResponse;
      base.mn_reasons = mnReasons;
      base.mn_reason_other = mnReasonOther;
      base.mn_additional_clinical = mnAdditionalClinical;
    }

    return base;
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
    setBodyParts([]);
    setClinicalIndication([]);
    setContrastOption('without');
    setTreatmentSchedule('');
    setMnPrimaryComplaints('');
    setMnObjectiveFindings('');
    setMnCurrentTreatment('');
    setMnPatientResponse('');
    setMnReasons([]);
    setMnReasonOther('');
    setMnAdditionalClinical('');
    setSelectedFacilityId('');
    setShowMnWarning(false);
  };

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 300);
    if (error) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const openGenerator = (type: DocType) => {
    // Soft warning check for referral letters to MD
    if (type === 'referral_letter' && (!existingMnDocs || existingMnDocs.length === 0)) {
      setSelectedType(type);
      setShowMnWarning(true);
      return;
    }
    setSelectedType(type);
    setReferringProviderId(caseData?.provider_id || '');
    setClinicalIndication(caseData?.specialty || '');
    setShowGenerate(true);
  };

  const proceedWithReferral = () => {
    setShowMnWarning(false);
    setReferringProviderId(caseData?.provider_id || '');
    setClinicalIndication(caseData?.specialty || '');
    setShowGenerate(true);
  };

  const switchToMnForm = () => {
    setShowMnWarning(false);
    setSelectedType('medical_necessity_md_referral');
    setReferringProviderId(caseData?.provider_id || '');
    setClinicalIndication(caseData?.specialty || '');
    setShowGenerate(true);
  };

  // Auto-select facility when matches change
  const autoSelectedFacility = (() => {
    if (!matchingFacilities || matchingFacilities.length === 0) return null;
    if (selectedFacilityId) return matchingFacilities.find((f: any) => f.id === selectedFacilityId);
    const preferred = matchingFacilities.find((f: any) => f.is_preferred);
    return preferred || matchingFacilities[0];
  })();

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Header with Generate button */}
      {canGenerate && (
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
              <DropdownMenuItem onClick={() => openGenerator('medical_necessity_md_referral')}>Medical Necessity — MD Referral</DropdownMenuItem>
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

      {/* Medical Necessity Warning Dialog */}
      <Dialog open={showMnWarning} onOpenChange={v => { if (!v) { setShowMnWarning(false); setSelectedType(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" /> Medical Necessity Check
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A Medical Necessity form has not been completed for this case. MD referrals require a completed 
            <strong> Medical Necessity — MD Referral Authorization</strong> from the treating provider. Generate the Medical Necessity form first?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={proceedWithReferral}>Proceed Anyway</Button>
            <Button onClick={switchToMnForm}>Generate Medical Necessity Form</Button>
          </div>
        </DialogContent>
      </Dialog>

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

                {/* Facility auto-selection */}
                {imagingTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Imaging Facility</Label>
                    {!matchingFacilities || matchingFacilities.length === 0 ? (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>No imaging facility configured for {patientCity ? `${patientCity}, ` : ''}{patientState || 'this location'}. Please add one under Admin &gt; Imaging Facilities before generating this requisition.</span>
                      </div>
                    ) : matchingFacilities.length === 1 ? (
                      <div className="bg-accent/50 rounded-lg p-3 text-xs">
                        <p className="font-medium">{matchingFacilities[0].name}</p>
                        <p className="text-muted-foreground">{matchingFacilities[0].address || `${matchingFacilities[0].city}, ${matchingFacilities[0].state}`}</p>
                        {matchingFacilities[0].custom_form_url && (
                          <Badge variant="outline" className="text-[9px] mt-1 text-success">Has custom requisition form</Badge>
                        )}
                      </div>
                    ) : (
                      <Select value={selectedFacilityId || autoSelectedFacility?.id || ''} onValueChange={setSelectedFacilityId}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select facility..." /></SelectTrigger>
                        <SelectContent>
                          {matchingFacilities.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name} — {f.city}, {f.state} {f.is_preferred ? '⭐' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

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

            {/* Medical Necessity fields */}
            {selectedType === 'medical_necessity_md_referral' && (
              <>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    This form documents medical necessity for an MD referral. Sections 1-3 should be completed by the treating provider. 
                    You may pre-fill known information; the provider will complete and sign the final form.
                  </p>
                </div>

                <h4 className="text-sm font-semibold pt-2">Section 1 — Clinical Findings</h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Primary Complaint(s)</Label>
                    <Textarea value={mnPrimaryComplaints} onChange={e => setMnPrimaryComplaints(e.target.value)} placeholder="Describe patient's primary complaints..." rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Objective Findings from Examination/Treatment</Label>
                    <Textarea value={mnObjectiveFindings} onChange={e => setMnObjectiveFindings(e.target.value)} placeholder="ROM deficits, orthopedic test results, neurological findings, imaging results..." rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current Treatment Provided</Label>
                    <Textarea value={mnCurrentTreatment} onChange={e => setMnCurrentTreatment(e.target.value)} placeholder="Adjustments, PT, modalities, frequency, duration..." rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Patient Response to Treatment</Label>
                    <Textarea value={mnPatientResponse} onChange={e => setMnPatientResponse(e.target.value)} placeholder="Improving, plateauing, or worsening..." rows={2} />
                  </div>
                </div>

                <h4 className="text-sm font-semibold pt-2">Section 2 — Medical Necessity Statement</h4>
                <div className="space-y-2">
                  <Label className="text-xs">Reason(s) for MD Referral</Label>
                  <div className="space-y-2">
                    {MEDICAL_NECESSITY_REASONS.map(reason => (
                      <label key={reason} className="flex items-start gap-2 text-xs">
                        <Checkbox
                          checked={mnReasons.includes(reason)}
                          onCheckedChange={v => {
                            if (v) setMnReasons(prev => [...prev, reason]);
                            else setMnReasons(prev => prev.filter(r => r !== reason));
                          }}
                          className="mt-0.5"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                    <label className="flex items-start gap-2 text-xs">
                      <Checkbox
                        checked={mnReasons.includes('Other')}
                        onCheckedChange={v => {
                          if (v) setMnReasons(prev => [...prev, 'Other']);
                          else { setMnReasons(prev => prev.filter(r => r !== 'Other')); setMnReasonOther(''); }
                        }}
                        className="mt-0.5"
                      />
                      <span>Other</span>
                    </label>
                    {mnReasons.includes('Other') && (
                      <Input value={mnReasonOther} onChange={e => setMnReasonOther(e.target.value)} placeholder="Specify other reason..." className="h-8 text-xs ml-6" />
                    )}
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs">Additional Clinical Notes</Label>
                    <Textarea value={mnAdditionalClinical} onChange={e => setMnAdditionalClinical(e.target.value)} placeholder="Optional additional clinical justification..." rows={2} />
                  </div>
                </div>
              </>
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
        {d.imaging_facility_name && (
          <p className="text-center">Facility: {d.imaging_facility_name}<br />{d.imaging_facility_address}{d.imaging_facility_phone ? ` | Phone: ${d.imaging_facility_phone}` : ''}{d.imaging_facility_fax ? ` | Fax: ${d.imaging_facility_fax}` : ''}</p>
        )}
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

  if (type === 'medical_necessity_md_referral') {
    return (
      <div className="text-xs space-y-2 text-foreground leading-relaxed">
        <p className="font-bold text-center">MEDICAL NECESSITY — MD REFERRAL AUTHORIZATION</p>
        <p>Date: {d.today_date} | Case #: {d.case_number}</p>
        <p className="pt-1"><strong>Patient:</strong> {d.patient_name} | DOB: {d.patient_dob} | DOI: {d.patient_dol}</p>
        <p><strong>Injury Type:</strong> {d.injury_type}</p>
        <p className="pt-1"><strong>Treating Provider:</strong> {d.referring_provider_name}<br />{d.referring_provider_practice} | NPI: {d.referring_provider_npi}</p>
        <p className="pt-1"><strong>Referred To:</strong> {d.receiving_provider_name}<br />{d.receiving_provider_practice}</p>

        <p className="pt-2 font-semibold">Section 1 — Clinical Findings</p>
        <p><strong>Primary complaints:</strong> {d.mn_primary_complaints || '(Provider to complete)'}</p>
        <p><strong>Objective findings:</strong> {d.mn_objective_findings || '(Provider to complete)'}</p>
        <p><strong>Current treatment:</strong> {d.mn_current_treatment || '(Provider to complete)'}</p>
        <p><strong>Patient response:</strong> {d.mn_patient_response || '(Provider to complete)'}</p>

        <p className="pt-2 font-semibold">Section 2 — Medical Necessity Statement</p>
        {d.mn_reasons?.length > 0 ? (
          <ul className="list-disc pl-4">
            {d.mn_reasons.map((r: string, i: number) => (
              <li key={i}>{r === 'Other' ? `Other: ${d.mn_reason_other || '___'}` : r}</li>
            ))}
          </ul>
        ) : <p className="italic">(Provider to select reasons)</p>}
        {d.mn_additional_clinical && <p><strong>Additional notes:</strong> {d.mn_additional_clinical}</p>}

        <p className="pt-2 font-semibold">Section 3 — Provider Attestation</p>
        <p>Provider Signature: ________________________<br />Print Name: {d.referring_provider_name}<br />Date: _______________ | NPI: {d.referring_provider_npi}</p>

        <p className="pt-1">Attorney: {d.attorney_name} — {d.attorney_firm}</p>
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
