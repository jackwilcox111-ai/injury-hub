import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Send, CheckCircle } from 'lucide-react';

export default function PatientReferral() {
  const { profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    notes: '',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      toast.error('Please provide at least a name and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      // Send a notification to the care team about the referral
      const { error } = await supabase.from('notifications').insert({
        title: 'Patient Referral',
        message: `${profile?.full_name} referred someone: ${form.name} (${form.phone})${form.email ? `, ${form.email}` : ''}${form.relationship ? ` — ${form.relationship}` : ''}${form.notes ? `. Notes: ${form.notes}` : ''}`,
        link: '/cases',
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" /> Make a Referral
        </h2>
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">Thank You!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your referral has been submitted. Our team will reach out to {form.name} shortly. We appreciate you spreading the word!
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setForm({ name: '', phone: '', email: '', relationship: '', notes: '' });
            }}
          >
            Refer Someone Else
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" /> Make a Referral
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Know someone who's been injured? Refer a friend or family member and we'll take care of them.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Their Name *</Label>
          <Input
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Their Phone Number *</Label>
          <Input
            type="tel"
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Their Email (optional)</Label>
          <Input
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Relationship (optional)</Label>
          <Input
            value={form.relationship}
            onChange={e => update('relationship', e.target.value)}
            placeholder="e.g. Brother, Friend, Coworker"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Anything else we should know? (optional)</Label>
          <Textarea
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            rows={3}
            placeholder="Brief description of their situation..."
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !form.name || !form.phone}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? 'Submitting...' : 'Submit Referral'}
        </Button>
      </div>
    </div>
  );
}
