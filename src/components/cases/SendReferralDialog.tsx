import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { SPECIALTIES } from '@/lib/specialties';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber?: string;
  patientCity?: string | null;
  patientState?: string | null;
}

export function SendReferralDialog({ open, onOpenChange, caseId, caseNumber }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [specialty, setSpecialty] = useState('');
  const [notes, setNotes] = useState(
    `You have a new patient referral from Got Hurt Injury Network${caseNumber ? ` for case ${caseNumber}` : ''}. Please review and accept or decline this referral.`
  );

  const specialties = useMemo(() => [...SPECIALTIES], []);

  const sendReferral = useMutation({
    mutationFn: async () => {
      if (!specialty) throw new Error('Please select a specialty');
      const { error } = await supabase.from('case_tasks').insert({
        case_id: caseId,
        title: `Assign ${specialty} provider`,
        description: `${specialty} provider referral requested for case ${caseNumber || caseId}. ${notes || ''}`.trim(),
        status: 'Pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral placed — care manager will assign a provider.');
      queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] });
      onOpenChange(false);
      setSpecialty('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Send Referral
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filter by Specialty</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger><SelectValue placeholder="Choose a specialty" /></SelectTrigger>
              <SelectContent>
                {specialties.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => sendReferral.mutate()} disabled={!specialty || sendReferral.isPending}>
            <Send className="w-3.5 h-3.5 mr-1" />
            {sendReferral.isPending ? 'Sending...' : 'Send Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
