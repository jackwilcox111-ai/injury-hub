import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, MapPin } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  patientCity?: string | null;
  patientState?: string | null;
}

export function SendReferralDialog({ open, onOpenChange, caseId, patientCity, patientState }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch providers, prioritizing those near patient address
  const { data: providers, isLoading } = useQuery({
    queryKey: ['referral-providers', patientState, patientCity],
    queryFn: async () => {
      let query = supabase
        .from('providers')
        .select('id, name, specialty, address_city, address_state, accepting_patients, phone')
        .eq('status', 'Active')
        .order('name');

      const { data } = await query;
      if (!data) return [];

      // Sort: same city first, then same state, then others
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

  // Get unique specialties from providers
  const specialties = [...new Set(providers?.map(p => p.specialty).filter(Boolean) || [])].sort();

  const filteredProviders = specialty
    ? providers?.filter(p => p.specialty === specialty)
    : providers;

  const sendReferral = useMutation({
    mutationFn: async () => {
      if (!selectedProvider) throw new Error('Please select a provider');
      const { error } = await supabase.from('referrals').insert({
        case_id: caseId,
        provider_id: selectedProvider,
        referred_by: user?.id,
        specialty: specialty || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral sent successfully');
      queryClient.invalidateQueries({ queryKey: ['case-referrals', caseId] });
      onOpenChange(false);
      setSelectedProvider('');
      setSpecialty('');
      setNotes('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedProviderData = providers?.find(p => p.id === selectedProvider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Send Referral
          </DialogTitle>
        </DialogHeader>

        {patientCity && patientState && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
            <MapPin className="w-3.5 h-3.5" />
            Showing providers near {patientCity}, {patientState}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filter by Specialty</Label>
            <Select value={specialty} onValueChange={(v) => { setSpecialty(v === 'all' ? '' : v); setSelectedProvider(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="All specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map(s => (
                  <SelectItem key={s} value={s!}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Provider *</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading providers...' : 'Choose a provider'} />
              </SelectTrigger>
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
              {selectedProviderData.phone && <p className="text-xs text-muted-foreground">{selectedProviderData.phone}</p>}
              <p className="text-xs">
                {selectedProviderData.accepting_patients !== false
                  ? <span className="text-green-600">✓ Accepting patients</span>
                  : <span className="text-muted-foreground">✗ Not accepting patients</span>}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add referral notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => sendReferral.mutate()}
            disabled={!selectedProvider || sendReferral.isPending}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            {sendReferral.isPending ? 'Sending...' : 'Send Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
