import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { US_STATES, SPECIALTIES } from '@/lib/us-states';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

const INSURANCE_OPTIONS = ['None', 'MedPay', 'PIP', 'Health Insurance', 'Medicare', 'Medicaid'];
const CARE_TYPES = ['Pain Management', 'Chiropractic', 'Physical Therapy', 'Orthopedic', 'Imaging/MRI', 'Surgery Consultation', 'Other'];

export default function PatientIntake() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [caseNumber, setCaseNumber] = useState('');

  // Step 1
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accidentDate, setAccidentDate] = useState('');
  const [accidentState, setAccidentState] = useState('');
  const [description, setDescription] = useState('');

  // Step 2
  const [insurance, setInsurance] = useState('None');
  const [hasTreatment, setHasTreatment] = useState(false);
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [hasAttorney, setHasAttorney] = useState(false);
  const [attorneyInfo, setAttorneyInfo] = useState('');

  // Step 3
  const [hipaaConsent, setHipaaConsent] = useState(false);
  const [aobConsent, setAobConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  const toggleCareType = (type: string) => {
    setCareTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const canAdvance = () => {
    if (step === 1) return fullName && dob && phone && email && accidentDate && accidentState;
    if (step === 2) return true;
    if (step === 3) return hipaaConsent && aobConsent && signatureName.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-intake', {
        body: {
          full_name: fullName, date_of_birth: dob, phone, email,
          accident_date: accidentDate, accident_state: accidentState,
          accident_description: description, insurance_status: insurance,
          has_treatment: hasTreatment, care_types: careTypes,
          has_attorney: hasAttorney, attorney_info: attorneyInfo,
          sms_consent: smsConsent, signature_name: signatureName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCaseNumber(data.case_number || 'Pending');
      setStep(4);
      toast.success('Intake submitted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step === 3) { handleSubmit(); return; }
    setStep(s => s + 1);
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6 font-mono-data">
          {step < 4 ? `Step ${step} of 3` : 'Complete'}
        </p>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">About Your Accident</h2>
              <p className="text-sm text-muted-foreground mt-1">Tell us what happened so we can connect you with the right care.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Date of Birth *</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Accident Date *</Label><Input type="date" value={accidentDate} onChange={e => setAccidentDate(e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>Accident State *</Label>
                <Select value={accidentState} onValueChange={setAccidentState}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Briefly describe what happened</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="e.g., I was rear-ended at a stoplight..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Your Medical Situation</h2>
              <p className="text-sm text-muted-foreground mt-1">Help us match you with the right providers.</p>
            </div>
            <div className="space-y-2">
              <Label>Insurance Status</Label>
              <Select value={insurance} onValueChange={setInsurance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSURANCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={hasTreatment} onCheckedChange={v => setHasTreatment(!!v)} id="treatment" />
              <Label htmlFor="treatment">I have already received some medical treatment</Label>
            </div>
            <div className="space-y-3">
              <Label>What type of care are you looking for?</Label>
              <div className="grid grid-cols-2 gap-2">
                {CARE_TYPES.map(ct => (
                  <div key={ct} className="flex items-center gap-2">
                    <Checkbox checked={careTypes.includes(ct)} onCheckedChange={() => toggleCareType(ct)} id={ct} />
                    <Label htmlFor={ct} className="text-sm">{ct}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={hasAttorney} onCheckedChange={v => setHasAttorney(!!v)} id="attorney" />
              <Label htmlFor="attorney">I already have an attorney</Label>
            </div>
            {hasAttorney && (
              <div className="space-y-2">
                <Label>Attorney name and firm</Label>
                <Input value={attorneyInfo} onChange={e => setAttorneyInfo(e.target.value)} placeholder="e.g., John Smith, Smith & Associates" />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Consent & Authorization</h2>
              <p className="text-sm text-muted-foreground mt-1">Required authorizations for care coordination.</p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-foreground">HIPAA Authorization</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I authorize Got Hurt Injury Network to use and disclose my protected health information (PHI) for purposes of coordinating medical treatment related to my personal injury case. This includes sharing information with treating medical providers, my legal representative, and care coordinators within the GHIN network. This authorization remains in effect until my case is resolved or I revoke it in writing.
              </p>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox checked={hipaaConsent} onCheckedChange={v => setHipaaConsent(!!v)} id="hipaa" />
                <Label htmlFor="hipaa" className="text-sm leading-relaxed">
                  I authorize Got Hurt Injury Network to coordinate my medical care and share necessary health information with treating providers and my legal representative. *
                </Label>
              </div>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-foreground">Assignment of Benefits</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By using GHIN's medical care coordination services, you acknowledge that treatment will be provided on a medical lien basis. This means that payment for your medical treatment will be deferred and made from the proceeds of any settlement or judgment in your personal injury case.
              </p>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox checked={aobConsent} onCheckedChange={v => setAobConsent(!!v)} id="aob" />
                <Label htmlFor="aob" className="text-sm leading-relaxed">
                  I understand that payment for medical treatment will be made from the proceeds of any settlement or judgment in my case. *
                </Label>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={smsConsent} onCheckedChange={v => setSmsConsent(!!v)} id="sms" />
              <Label htmlFor="sms" className="text-sm">I agree to receive appointment reminders and case updates via text message.</Label>
            </div>
            <div className="space-y-2">
              <Label>E-Signature — Type your full name *</Label>
              <Input value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Your full legal name" className="font-mono-data text-lg" />
              <p className="text-xs text-muted-foreground">By typing your name above, you are providing a legally binding electronic signature.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-12 space-y-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Thank You, {fullName.split(' ')[0]}!</h2>
              <p className="text-muted-foreground mt-2">Your intake has been submitted. Our team will contact you within 24 hours.</p>
              {caseNumber && <p className="text-xs font-mono-data text-muted-foreground mt-2">Reference: {caseNumber}</p>}
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-6 text-left max-w-md mx-auto">
              <h4 className="font-medium text-sm text-foreground mb-3">What happens next:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary">1.</span> A care manager is assigned to your case</li>
                <li className="flex gap-2"><span className="text-primary">2.</span> We match you with a provider in your area</li>
                <li className="flex gap-2"><span className="text-primary">3.</span> Your first appointment is scheduled</li>
              </ul>
            </div>
            <Button onClick={() => navigate('/login')} className="gap-2">
              Create Your Account <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step < 4 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : <div />}
            <Button onClick={next} disabled={!canAdvance() || loading} className="gap-2">
              {step === 3 ? (loading ? 'Submitting...' : 'Submit') : 'Continue'} {step < 3 && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {step < 4 && (
          <p className="text-[10px] text-muted-foreground mt-6 text-center">PHI — Handle in accordance with HIPAA policy</p>
        )}
      </div>
    </PublicLayout>
  );
}
