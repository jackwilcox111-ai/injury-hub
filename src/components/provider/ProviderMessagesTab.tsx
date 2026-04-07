import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { MessageCircle, Eye, Send, ArrowUpRight, ArrowDownLeft, Plus, User, Building2, Stethoscope } from 'lucide-react';
import { useState } from 'react';

const MESSAGE_TYPES = ['Status Update', 'Appointment Reminder', 'General'] as const;

const RECIPIENT_META: Record<string, { label: string; icon: typeof User; color: string }> = {
  patient: { label: 'Patient', icon: User, color: 'bg-blue-100 text-blue-700' },
  attorney: { label: 'Attorney', icon: Building2, color: 'bg-violet-100 text-violet-700' },
  provider: { label: 'Provider', icon: Stethoscope, color: 'bg-emerald-100 text-emerald-700' },
};

export function ProviderMessagesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [messageType, setMessageType] = useState<string>('General');
  const [recipientRole, setRecipientRole] = useState<string>('attorney');
  const [script, setScript] = useState('');
  const [caseId, setCaseId] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['provider-video-messages', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('video_messages')
        .select('*, cases:case_id(case_number, patient_name, attorney_id, attorneys:attorney_id(firm_name)), sender:created_by(full_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: providerCases } = useQuery({
    queryKey: ['provider-cases-for-messages'],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('id, case_number, patient_name').neq('status', 'Settled').order('case_number');
      return data || [];
    },
  });

  const markViewed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('video_messages')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-video-messages'] }),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!script.trim()) throw new Error('Enter a message.');
      const { error } = await supabase.from('video_messages').insert({
        case_id: caseId || null,
        recipient_role: recipientRole,
        message_type: messageType,
        script: script.trim(),
        ai_generated_script: false,
        sent_at: new Date().toISOString(),
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-video-messages'] });
      setShowCompose(false);
      setScript('');
      setCaseId('');
      setMessageType('General');
      setRecipientRole('attorney');
      toast.success('Message sent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openMessage = (msg: any) => {
    setSelected(msg);
    const isReceived = msg.recipient_id === user?.id;
    if (isReceived && !msg.viewed) markViewed.mutate(msg.id);
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const unread = messages?.filter(m => !m.viewed && m.recipient_id === user?.id).length || 0;

  const getRecipientLabel = (m: any, isSent: boolean) => {
    const firmName = (m as any).cases?.attorneys?.firm_name;
    if (m.recipient_role === 'attorney' && firmName) return firmName;
    if (m.recipient_role === 'patient') return (m as any).cases?.patient_name || 'Patient';
    const meta = RECIPIENT_META[m.recipient_role];
    return meta?.label || m.recipient_role;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowCompose(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Send Message
        </Button>
      </div>

      <div className="space-y-2.5">
        {messages?.map(m => {
          const isSent = m.created_by === user?.id;
          const isReceived = m.recipient_id === user?.id;
          const meta = RECIPIENT_META[m.recipient_role] || RECIPIENT_META.patient;
          const Icon = meta.icon;
          const recipientLabel = getRecipientLabel(m, isSent);

          return (
            <button
              key={m.id}
              onClick={() => openMessage(m)}
              className={`w-full text-left border rounded-xl p-4 hover:bg-accent/20 transition-colors bg-card ${
                isReceived && !m.viewed ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {isSent ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    <ArrowUpRight className="w-3 h-3" /> Sent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    <ArrowDownLeft className="w-3 h-3" /> Received
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                  <Icon className="w-3 h-3" />
                  {isSent ? `To: ${recipientLabel}` : `From: ${(m as any).sender?.full_name || recipientLabel}`}
                </span>
                <Badge variant="outline" className="text-[10px]">{m.message_type}</Badge>
                {m.viewed ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Eye className="w-3 h-3" /> Viewed</span>
                ) : (
                  <Badge className="text-[10px] h-4">Unread</Badge>
                )}
              </div>
              <p className="text-sm text-foreground mt-2 whitespace-pre-wrap line-clamp-2">{m.script}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span>
                  {isSent ? 'Sent by you' : `Sent by ${(m as any).sender?.full_name || 'System'}`}{' '}
                  {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true }) : ''}
                </span>
                {m.viewed_at && <span>• Viewed {format(new Date(m.viewed_at), 'MMM d, h:mm a')}</span>}
              </div>
            </button>
          );
        })}
        {(!messages || messages.length === 0) && (
          <p className="text-center text-muted-foreground text-sm py-12">No messages yet</p>
        )}
      </div>

      {/* Message Detail */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> {selected?.message_type}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{(selected as any).cases?.case_number}</span>
                <span>•</span>
                <span>{(selected as any).cases?.patient_name}</span>
                <span>•</span>
                {selected.created_by === user?.id ? (
                  <Badge variant="outline" className="text-[10px]">Sent by you</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">From: {(selected as any).sender?.full_name || 'System'}</Badge>
                )}
              </div>
              <div className="bg-accent/50 rounded-lg p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selected.script}</p>
              </div>
              {selected.viewed_at && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Viewed {format(new Date(selected.viewed_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send a Message</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Case</Label>
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select case..." /></SelectTrigger>
                  <SelectContent>{providerCases?.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.case_number} — {c.patient_name}</SelectItem>)}</SelectContent>
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
              <Button size="sm" className="gap-1.5" onClick={() => sendMessage.mutate()} disabled={!script.trim() || sendMessage.isPending}>
                <Send className="w-3.5 h-3.5" /> {sendMessage.isPending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
