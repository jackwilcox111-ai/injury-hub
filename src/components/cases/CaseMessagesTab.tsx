import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Send, MessageCircle, Eye, User, Building2, Stethoscope, Plus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const MESSAGE_TYPES = ['Welcome', 'Status Update', 'Appointment Reminder', 'Settlement Notification', 'General'] as const;

const RECIPIENT_META: Record<string, { label: string; icon: typeof User; color: string }> = {
  patient: { label: 'Patient', icon: User, color: 'bg-blue-100 text-blue-700' },
  attorney: { label: 'Attorney', icon: Building2, color: 'bg-violet-100 text-violet-700' },
  provider: { label: 'Provider', icon: Stethoscope, color: 'bg-emerald-100 text-emerald-700' },
};

interface Props {
  caseId: string;
  patientName: string;
  attorneyId?: string | null;
  providerId?: string | null;
}

export function CaseMessagesTab({ caseId, patientName, attorneyId, providerId }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [recipientRole, setRecipientRole] = useState<string>('');
  const [messageType, setMessageType] = useState<string>('General');
  const [script, setScript] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['case-messages', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_messages')
        .select('*, profiles:created_by(full_name)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recipientProfiles } = useQuery({
    queryKey: ['case-recipient-profiles', caseId, attorneyId, providerId],
    queryFn: async () => {
      const result: Record<string, { id: string; name: string } | null> = {
        patient: null, attorney: null, provider: null,
      };
      const { data: patientProfile } = await supabase
        .from('patient_profiles')
        .select('profile_id, profiles:profile_id(id, full_name)')
        .eq('case_id', caseId)
        .maybeSingle();
      if (patientProfile?.profile_id) {
        result.patient = { id: patientProfile.profile_id, name: (patientProfile as any).profiles?.full_name || patientName };
      }
      if (attorneyId) {
        const { data: attyProfile } = await supabase.from('profiles').select('id, full_name').eq('firm_id', attorneyId).limit(1).maybeSingle();
        if (attyProfile) result.attorney = { id: attyProfile.id, name: attyProfile.full_name || 'Attorney' };
      }
      if (providerId) {
        const { data: provProfile } = await supabase.from('profiles').select('id, full_name').eq('provider_id', providerId).limit(1).maybeSingle();
        if (provProfile) result.provider = { id: provProfile.id, name: provProfile.full_name || 'Provider' };
      }
      return result;
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!recipientRole || !script.trim()) throw new Error('Select a recipient and enter a message.');
      const recipientProfile = recipientProfiles?.[recipientRole];
      const { error } = await supabase.from('video_messages').insert({
        case_id: caseId, recipient_role: recipientRole, recipient_id: recipientProfile?.id || null,
        message_type: messageType, script: script.trim(), ai_generated_script: false,
        sent_at: new Date().toISOString(), created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-messages', caseId] });
      setScript(''); setRecipientRole(''); setMessageType('General');
      setShowCompose(false);
      toast.success('Message sent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isAttorney = profile?.role === 'attorney';

  const availableRecipients = Object.entries(RECIPIENT_META).filter(([role]) => {
    if (role === 'attorney' && (!attorneyId || isAttorney)) return false;
    if (role === 'provider' && !providerId) return false;
    if (role === 'patient' && isAttorney) return false;
    return true;
  });

  // For attorneys, add "Case Manager" as a recipient option
  const CASE_MANAGER_META = { label: 'Case Manager', icon: User, color: 'bg-amber-100 text-amber-700' };
  const recipientOptions = isAttorney
    ? [['case_manager', CASE_MANAGER_META] as const, ...availableRecipients]
    : availableRecipients;

  return (
    <>
      {/* Header with send button */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          Message History
          {messages && messages.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({messages.length})</span>
          )}
        </h4>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowCompose(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Send Message
        </Button>
      </div>

      {/* Message history */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !messages || messages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No messages sent yet.</p>
      ) : (
        <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
          {messages.map(m => {
            const meta = RECIPIENT_META[m.recipient_role] || RECIPIENT_META.patient;
            const Icon = meta.icon;
            return (
              <div key={m.id} className="border border-border rounded-xl p-4 bg-card hover:bg-accent/20 transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                    <Icon className="w-3 h-3" /> {meta.label}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{m.message_type}</Badge>
                  {m.viewed ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Eye className="w-3 h-3" /> Viewed</span>
                  ) : (
                    <Badge className="text-[10px] h-4">Unread</Badge>
                  )}
                </div>
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{m.script}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>
                    Sent by {(m as any).profiles?.full_name || 'System'}{' '}
                    {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true }) : ''}
                  </span>
                  {m.viewed_at && <span>• Viewed {format(new Date(m.viewed_at), 'MMM d, h:mm a')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send a Message</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Recipient</Label>
                <Select value={recipientRole} onValueChange={setRecipientRole}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select recipient..." /></SelectTrigger>
                  <SelectContent>
                    {recipientOptions.map(([role, meta]) => {
                      const rProfile = recipientProfiles?.[role as string];
                      return <SelectItem key={role} value={role as string} className="text-xs">{meta.label}{rProfile ? ` — ${rProfile.name}` : ''}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Message Type</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{MESSAGE_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Message</Label>
              <Textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Type your message here..." className="min-h-[100px] text-sm" />
            </div>
            <p className="text-[10px] text-muted-foreground">PHI — Handle in accordance with HIPAA policy</p>
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => sendMessage.mutate()} disabled={!recipientRole || !script.trim() || sendMessage.isPending}>
                <Send className="w-3.5 h-3.5" /> {sendMessage.isPending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
