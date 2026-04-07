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
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, ArrowUpRight, ArrowDownLeft, Eye, Send, Plus } from 'lucide-react';
import { useState } from 'react';

export default function PatientMessages() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [recipientRole, setRecipientRole] = useState<string>('care_manager');
  const [script, setScript] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['patient-messages', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from('video_messages')
        .select('*, sender:created_by(full_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const markViewed = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('video_messages').update({ viewed: true, viewed_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-messages'] }),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!script.trim()) throw new Error('Enter a message.');

      // Get the patient's case_id
      const { data: patientProfile } = await supabase.from('patient_profiles')
        .select('case_id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      const { error } = await supabase.from('video_messages').insert({
        case_id: patientProfile?.case_id || null,
        recipient_role: recipientRole,
        message_type: 'General',
        script: script.trim(),
        ai_generated_script: false,
        sent_at: new Date().toISOString(),
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-messages'] });
      setShowCompose(false);
      setScript('');
      toast.success('Message sent to your care team');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selected = messages?.find(m => m.id === selectedId);

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Messages</h2><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" /> Messages
        </h2>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowCompose(true)}>
          <Plus className="w-3.5 h-3.5" /> New Message
        </Button>
      </div>

      {(!messages || messages.length === 0) ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No messages yet. Your care manager will send updates here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(m => {
            const isSent = m.created_by === user?.id;
            const isReceived = m.recipient_id === user?.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedId(m.id);
                  if (isReceived && !m.viewed) markViewed.mutate(m.id);
                }}
                className={`w-full bg-card border rounded-xl p-4 text-left hover:bg-accent/30 transition-colors ${
                  isReceived && !m.viewed ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isSent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <ArrowUpRight className="w-3 h-3" /> Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        <ArrowDownLeft className="w-3 h-3" /> Received
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">{m.message_type}</Badge>
                    {isReceived && !m.viewed && <Badge className="text-[10px] bg-primary">New</Badge>}
                  </div>
                  {isReceived && (m as any).sender?.full_name && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">From: {(m as any).sender.full_name}</p>
                  )}
                  <p className="text-sm text-foreground mt-1 line-clamp-2">{m.script}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{m.sent_at ? formatDistanceToNow(new Date(m.sent_at), { addSuffix: true }) : ''}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Message Detail */}
      <Dialog open={!!selectedId} onOpenChange={open => !open && setSelectedId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.message_type}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {selected.created_by === user?.id ? (
                  <Badge variant="outline" className="text-[10px]">Sent by you</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">From: {(selected as any).sender?.full_name || 'Care Team'}</Badge>
                )}
              </div>
              <div className="bg-accent/50 rounded-lg p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selected.script}</p>
              </div>
              {selected.viewed_at && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Viewed {formatDistanceToNow(new Date(selected.viewed_at), { addSuffix: true })}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Message Your Care Team</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Your message will be sent to your care coordinator.</p>
            <Textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[120px] text-sm"
            />
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
