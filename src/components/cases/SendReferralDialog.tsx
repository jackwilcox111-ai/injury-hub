import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Send, MapPin, CheckSquare } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber?: string;
  patientCity?: string | null;
  patientState?: string | null;
}

export function SendReferralDialog({ open, onOpenChange, caseId, caseNumber, patientCity, patientState }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isAttorney = profile?.role === 'attorney';

  const [selectedProvider, setSelectedProvider] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [referralMethod, setReferralMethod] = useState('Email');
  const [notes, setNotes] = useState(
    `You have a new patient referral from Got Hurt Injury Network${caseNumber ? ` for case ${caseNumber}` : ''}. Please review and accept or decline this referral.`
  );

  const { data: providers, isLoading } = useQuery({
    queryKey: ['referral-providers', patientState, patientCity],
    queryFn: async () => {
      const { data } = await supabase
        .from('providers')
        .select('id, name, specialty, address_city, address_state, accepting_patients, phone')
        .eq('status', 'Active')
        .order('name');
      if (!data) return [];
      return data.sort((a, b) => {
        const aCity = patientCity && a.address_city?.toLowerCase() === patientCity.toLowerCase();
        const bCity = patientCity && b.address_city?.toLowerCase() === patientCity.toLowerCase();
        const aState = patientState && a.address_state?.toLowerCase() === patientState.toLowerCase();
        const bState = patientState && b.address_state?.toLowerCase() === patientState.toLowerCase();
        if (aCity && !bCity) return -1;
        if (!aCity && bCity) return 1;
        if (aState && !bState) return -1;
        if (!aState && bState) return 1;
        return a.name.localeCompare(b.name);
      });
    },
    enabled: open,
  });

  const specialties = [...new Set(providers?.map(p => p.specialty).filter(Boolean) || [])].sort();
  const filteredProviders = specialty ? providers?.filter(p => p.specialty === specialty) : providers;

  // Attorney flow: create a task for the care manager
  const createTask = useMutation({
    mutationFn: async () => {
      if (!specialty) throw new Error('Please select a specialty');
      const { error } = await supabase.from('case_tasks').insert({
        case_id: caseId,
        title: `Assign ${specialty} provider`,
        description: `Attorney requested a ${specialty} provider referral for case ${caseNumber || caseId}. ${notes || ''}`.trim(),
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task created for case manager to assign provider');
      queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] });
      onOpenChange(false);
      setSpecialty('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Admin/CM flow: send referral directly
  const sendReferral = useMutation({
    mutationFn: async () => {
      if (!selectedProvider) throw new Error('Please select a provider');
      const token = crypto.randomUUID();
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('referrals').insert({
        case_id: caseId,
        provider_id: selectedProvider,
        referred_by: user?.id,
        specialty: specialty || null,
        notes: notes || null,
        referral_method: referralMethod,
        token,
        token_expires_at: tokenExpiresAt,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral sent successfully');
      queryClient.invalidateQueries({ queryKey: ['case-referrals', caseId] });
      onOpenChange(false);
      setSelectedProvider('');
      setSpecialty('');
      setReferralMethod('Email');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedProviderData = providers?.find(p => p.id === selectedProvider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAttorney ? <CheckSquare className="w-4 h-4 text-primary" /> : <Send className="w-4 h-4 text-primary" />}
            {isAttorney ? 'Request Provider Referral' : 'Send Referral'}
          </DialogTitle>
        </DialogHeader>

        {isAttorney && (
          <p className="text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
            Select a specialty and a task will be created for the care manager to assign a provider.
          </p>
        )}

        {!isAttorney && patientCity && patientState && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
            <MapPin className="w-3.5 h-3.5" />
            Showing providers near {patientCity}, {patientState}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{isAttorney ? 'Specialty *' : 'Filter by Specialty'}</Label>
            <Select value={specialty} onValueChange={(v) => { setSpecialty(v === 'all' ? '' : v); setSelectedProvider(''); }}>
              <SelectTrigger><SelectValue placeholder="All specialties" /></SelectTrigger>
              <SelectContent>
                {!isAttorney && <SelectItem value="all">All specialties</SelectItem>}
                {specialties.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Provider selection — only for admin/care_manager */}
          {!isAttorney && (
            <>
              <div className="space-y-2">
                <Label>Select Provider *</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger><SelectValue placeholder={isLoading ? 'Loading providers...' : 'Choose a provider'} /></SelectTrigger>
                  <SelectContent>
                    {filteredProviders?.map(p => {
                      const isNear = patientCity && p.address_city?.toLowerCase() === patientCity.toLowerCase();
                      const isSameState = patientState && p.address_state?.toLowerCase() === patientState.toLowerCase();
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.specialty && <span className="text-xs text-muted-foreground">· {p.specialty}</span>}
                            {isNear && <span className="text-[10px] bg-primary/10 text-primary rounded px-1">Nearby</span>}
                            {!isNear && isSameState && <span className="text-[10px] bg-accent text-muted-foreground rounded px-1">Same state</span>}
                          </div>
                        </SelectItem>
                      );
                    })}
                    {filteredProviders?.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">No providers found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedProviderData && (
                <div className="bg-accent/50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-foreground">{selectedProviderData.name}</p>
                  {selectedProviderData.specialty && <p className="text-xs text-muted-foreground">{selectedProviderData.specialty}</p>}
                  {selectedProviderData.address_city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedProviderData.address_city}, {selectedProviderData.address_state}
                    </p>
                  )}
                  {selectedProviderData.phone && <p className="text-xs text-muted-foreground">☎ {selectedProviderData.phone}</p>}
                  <p className="text-xs">
                    {selectedProviderData.accepting_patients !== false
                      ? <span className="text-emerald-600">✓ Accepting patients</span>
                      : <span className="text-muted-foreground">✗ Not accepting patients</span>}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Referral Method</Label>
                <RadioGroup value={referralMethod} onValueChange={setReferralMethod} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Email" id="method-email" />
                    <Label htmlFor="method-email" className="text-sm font-normal">Email</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="SMS" id="method-sms" />
                    <Label htmlFor="method-sms" className="text-sm font-normal">SMS</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Both" id="method-both" />
                    <Label htmlFor="method-both" className="text-sm font-normal">Both</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>{isAttorney ? 'Notes (optional)' : 'Message'}</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {isAttorney ? (
            <Button
              onClick={() => createTask.mutate()}
              disabled={!specialty || createTask.isPending}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          ) : (
            <Button
              onClick={() => sendReferral.mutate()}
              disabled={!selectedProvider || sendReferral.isPending}
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              {sendReferral.isPending ? 'Sending...' : 'Send Referral'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
