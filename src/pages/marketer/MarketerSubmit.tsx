import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompletenessScoreRing } from '@/components/global/CompletenessScoreRing';
import { US_STATES } from '@/lib/us-states';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, Upload, FileText, X } from 'lucide-react';

const INJURY_TYPES = ['Soft Tissue', 'Orthopedic', 'TBI/Head Injury', 'Spine/Disc', 'Fracture', 'Neurological', 'Other'];
const ACCIDENT_TYPES = ['Auto Accident', 'Slip & Fall', 'Workplace Injury', 'Premises Liability', 'Other'];
const AT_FAULT = ['Other Driver', 'Property Owner', 'Employer', 'Unknown/Other'];
const SEVERITY = ['Minor', 'Moderate', 'Severe'];
const TREATMENT_STATUS = ['No Treatment Yet', 'Scheduled - Not Started', 'Currently in Treatment'];

interface FileState {
  police_report: File | null;
  photos: File[];
  insurance: File | null;
  medical_records: File | null;
}

export default function MarketerSubmit() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const policeRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const insuranceRef = useRef<HTMLInputElement>(null);
  const medicalRef = useRef<HTMLInputElement>(null);

  const { data: marketerProfile } = useQuery({
    queryKey: ['marketer-profile', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase.from('marketer_profiles') as any).select('*').eq('profile_id', profile!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    patient_first: '', patient_last_initial: '', patient_phone: '', patient_email: '',
    accident_date: '', accident_state: '', accident_type: '', at_fault: '',
    police_report: false, accident_description: '',
    injury_types: [] as string[], injury_severity: '', treatment_status: '',
    provider_name: '', provider_specialty: '', has_attorney: false,
    consent_name: '', consent_date: new Date().toISOString().split('T')[0],
    marketer_certified: false,
  });

  const [files, setFiles] = useState<FileState>({
    police_report: null, photos: [], insurance: null, medical_records: null,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleInjury = (t: string) => setForm(p => ({
    ...p, injury_types: p.injury_types.includes(t) ? p.injury_types.filter(i => i !== t) : [...p.injury_types, t],
  }));

  const score = useMemo(() => {
    let s = 0;
    if (form.patient_phone) s += 15;
    if (form.accident_date) s += 10;
    if (form.accident_type) s += 10;
    if (form.injury_types.length > 0) s += 10;
    if (form.injury_severity) s += 10;
    if (form.treatment_status) s += 10;
    if (files.police_report) s += 15;
    if (files.photos.length > 0) s += 10;
    if (files.insurance) s += 10;
    return s;
  }, [form, files]);

  const canSubmit = score >= 60 && form.consent_name && form.marketer_certified && !form.has_attorney;

  const uploadFile = async (caseId: string, file: File, subfolder: string) => {
    const path = `${caseId}/marketer-upload/${subfolder}/${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    await (supabase.from('documents') as any).insert({
      case_id: caseId,
      file_name: file.name,
      document_type: subfolder,
      storage_path: path,
      visible_to: ['admin'],
      uploader_id: profile?.id,
    });
  };

  const handleSubmit = async () => {
    if (!marketerProfile?.id) { toast.error('Marketer profile not found'); return; }
    setLoading(true);
    try {
      const patientName = `${form.patient_first} ${form.patient_last_initial}.`;
      const { data: caseData, error } = await (supabase.from('cases') as any).insert({
        patient_name: patientName,
        patient_phone: form.patient_phone,
        patient_email: form.patient_email || null,
        accident_date: form.accident_date || null,
        accident_state: form.accident_state || null,
        status: 'Marketplace',
        specialty: form.injury_types.join(', '),
        notes: form.accident_description || null,
        marketer_id: marketerProfile.id,
        marketplace_submitted_at: new Date().toISOString(),
        completeness_score: score,
        quality_gate_passed: false,
        marketer_consent_signed: true,
        marketer_consent_signed_at: new Date().toISOString(),
      }).select('id, case_number').single();

      if (error) throw error;

      // Upload files
      if (files.police_report) await uploadFile(caseData.id, files.police_report, 'police-report');
      for (const photo of files.photos) await uploadFile(caseData.id, photo, 'photos');
      if (files.insurance) await uploadFile(caseData.id, files.insurance, 'insurance');
      if (files.medical_records) await uploadFile(caseData.id, files.medical_records, 'medical-records');

      // Notify admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins) {
        await (supabase.from('notifications') as any).insert(
          admins.map((a: any) => ({
            recipient_id: a.id,
            title: 'New Marketer Case Submission',
            message: `New marketer case: ${form.injury_types.join(', ')} - ${form.accident_state} - Score: ${score}`,
            link: '/admin/case-queue',
          }))
        );
      }

      setSubmitted(true);
      toast.success('Case submitted successfully');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-success/8 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Case Submitted</h2>
        <p className="text-sm text-muted-foreground">Our team reviews submissions within 24 hours. You'll be notified when it goes live in the marketplace.</p>
        <Button onClick={() => navigate('/marketer/cases')}>View My Cases</Button>
      </div>
    );
  }

  const progressWidth = `${(step / 4) * 100}%`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">Submit a Case</h2>
        <div className="relative w-24 h-24">
          <CompletenessScoreRing score={score} size={80} />
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {['Accident Details', 'Injury & Treatment', 'Docs & Consent', 'Review'].map((l, i) => (
            <span key={l} className={step > i ? 'text-primary font-medium' : ''}>{l}</span>
          ))}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: progressWidth }} />
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Accident Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Patient First Name *</Label><Input value={form.patient_first} onChange={e => set('patient_first', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Patient Last Initial *</Label><Input maxLength={1} value={form.patient_last_initial} onChange={e => set('patient_last_initial', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Patient Phone *</Label><Input type="tel" value={form.patient_phone} onChange={e => set('patient_phone', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Patient Email</Label><Input type="email" value={form.patient_email} onChange={e => set('patient_email', e.target.value)} /></div>
            <div className="space-y-2"><Label>Date of Accident *</Label><Input type="date" value={form.accident_date} onChange={e => set('accident_date', e.target.value)} required /></div>
            <div className="space-y-2">
              <Label>Accident State *</Label>
              <Select value={form.accident_state} onValueChange={v => set('accident_state', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Accident Type *</Label>
              <Select value={form.accident_type} onValueChange={v => set('accident_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ACCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>At-Fault Party</Label>
              <Select value={form.at_fault} onValueChange={v => set('at_fault', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{AT_FAULT.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.police_report} onCheckedChange={v => set('police_report', v)} />
            <Label>Police report filed?</Label>
          </div>
          <div className="space-y-2">
            <Label>Accident Description</Label>
            <Textarea value={form.accident_description} onChange={e => set('accident_description', e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!form.patient_first || !form.patient_phone || !form.accident_date}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Injury & Treatment</h3>
          <div className="space-y-2">
            <Label>Injury Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INJURY_TYPES.map(t => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.injury_types.includes(t)} onCheckedChange={() => toggleInjury(t)} />{t}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Injury Severity *</Label>
              <Select value={form.injury_severity} onValueChange={v => set('injury_severity', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SEVERITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Treatment Status *</Label>
              <Select value={form.treatment_status} onValueChange={v => set('treatment_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TREATMENT_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {form.treatment_status === 'Currently in Treatment' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Provider Name</Label><Input value={form.provider_name} onChange={e => set('provider_name', e.target.value)} /></div>
              <div className="space-y-2"><Label>Provider Specialty</Label><Input value={form.provider_specialty} onChange={e => set('provider_specialty', e.target.value)} /></div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={form.has_attorney} onCheckedChange={v => set('has_attorney', v)} />
            <Label>Has patient retained an attorney?</Label>
          </div>
          {form.has_attorney && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              Cases with existing representation cannot be submitted to the marketplace.
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={form.has_attorney || form.injury_types.length === 0}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold">Documentation & Consent</h3>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Upload documents to increase your case quality score. Files are visible only to GHIN administrators.</p>

            {/* Police Report */}
            <div className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Police Report (+15 pts)</span>
                {files.police_report && <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setFiles(f => ({ ...f, police_report: null }))}><X className="w-3 h-3" /></Button>}
              </div>
              {files.police_report ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="w-3.5 h-3.5" />{files.police_report.name}</div>
              ) : (
                <>
                  <input ref={policeRef} type="file" className="hidden" accept=".pdf,.jpg,.png,.doc,.docx" onChange={e => { if (e.target.files?.[0]) setFiles(f => ({ ...f, police_report: e.target.files![0] })); }} />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => policeRef.current?.click()}><Upload className="w-3 h-3 mr-1.5" />Choose File</Button>
                </>
              )}
            </div>

            {/* Photos */}
            <div className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Accident/Injury Photos (+10 pts)</span>
                {files.photos.length > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setFiles(f => ({ ...f, photos: [] }))}><X className="w-3 h-3" /></Button>}
              </div>
              {files.photos.length > 0 ? (
                <div className="space-y-1">{files.photos.map((p, i) => <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="w-3.5 h-3.5" />{p.name}</div>)}</div>
              ) : (
                <>
                  <input ref={photosRef} type="file" className="hidden" accept="image/*" multiple onChange={e => { if (e.target.files) setFiles(f => ({ ...f, photos: Array.from(e.target.files!) })); }} />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => photosRef.current?.click()}><Upload className="w-3 h-3 mr-1.5" />Choose Files</Button>
                </>
              )}
            </div>

            {/* Insurance */}
            <div className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Insurance Information (+10 pts)</span>
                {files.insurance && <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setFiles(f => ({ ...f, insurance: null }))}><X className="w-3 h-3" /></Button>}
              </div>
              {files.insurance ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="w-3.5 h-3.5" />{files.insurance.name}</div>
              ) : (
                <>
                  <input ref={insuranceRef} type="file" className="hidden" accept=".pdf,.jpg,.png,.doc,.docx" onChange={e => { if (e.target.files?.[0]) setFiles(f => ({ ...f, insurance: e.target.files![0] })); }} />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => insuranceRef.current?.click()}><Upload className="w-3 h-3 mr-1.5" />Choose File</Button>
                </>
              )}
            </div>

            {/* Medical Records */}
            <div className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Existing Medical Records</span>
                {files.medical_records && <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setFiles(f => ({ ...f, medical_records: null }))}><X className="w-3 h-3" /></Button>}
              </div>
              {files.medical_records ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="w-3.5 h-3.5" />{files.medical_records.name}</div>
              ) : (
                <>
                  <input ref={medicalRef} type="file" className="hidden" accept=".pdf,.jpg,.png,.doc,.docx" onChange={e => { if (e.target.files?.[0]) setFiles(f => ({ ...f, medical_records: e.target.files![0] })); }} />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => medicalRef.current?.click()}><Upload className="w-3 h-3 mr-1.5" />Choose File</Button>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <h4 className="text-sm font-semibold">Patient Consent</h4>
            <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground leading-relaxed">
              "I authorize Got Hurt Injury Network to coordinate my medical care, share my case information with network attorneys for the purpose of legal representation, and present my case in the GHIN case marketplace. I understand that no attorney-client relationship is formed until I separately engage an attorney."
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Patient Signed Name *</Label><Input value={form.consent_name} onChange={e => set('consent_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Consent Date *</Label><Input type="date" value={form.consent_date} onChange={e => set('consent_date', e.target.value)} required /></div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={form.marketer_certified} onCheckedChange={v => set('marketer_certified', !!v)} />
              <span className="text-sm leading-relaxed">I certify that I have obtained the patient's written consent to submit this case to the GHIN network. *</span>
            </label>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)} disabled={!form.consent_name || !form.marketer_certified}>Review & Submit</Button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold">Review & Submit</h3>
          <div className="flex justify-center"><CompletenessScoreRing score={score} size={120} /></div>
          {score < 60 ? (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning">Case score below minimum (60). Add documentation to proceed.</span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm text-success">Case meets quality threshold.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">Patient</span><p>{form.patient_first} {form.patient_last_initial}.</p></div>
            <div><span className="text-muted-foreground text-xs">Phone</span><p>{form.patient_phone}</p></div>
            <div><span className="text-muted-foreground text-xs">Accident Date</span><p>{form.accident_date}</p></div>
            <div><span className="text-muted-foreground text-xs">State</span><p>{form.accident_state}</p></div>
            <div><span className="text-muted-foreground text-xs">Type</span><p>{form.accident_type}</p></div>
            <div><span className="text-muted-foreground text-xs">Severity</span><p>{form.injury_severity}</p></div>
            <div className="col-span-2"><span className="text-muted-foreground text-xs">Injuries</span><p>{form.injury_types.join(', ')}</p></div>
            <div><span className="text-muted-foreground text-xs">Consent By</span><p>{form.consent_name}</p></div>
            <div><span className="text-muted-foreground text-xs">Consent Date</span><p>{form.consent_date}</p></div>
            {(files.police_report || files.photos.length > 0 || files.insurance || files.medical_records) && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">Documents</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {files.police_report && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Police Report</span>}
                  {files.photos.length > 0 && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">{files.photos.length} Photo(s)</span>}
                  {files.insurance && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Insurance</span>}
                  {files.medical_records && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Medical Records</span>}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || loading}>{loading ? 'Submitting...' : 'Submit Case'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
