import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MediaPlayer } from '@/components/global/MediaPlayer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

export default function PatientMessages() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['patient-messages', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from('video_messages')
        .select('*')
        .eq('recipient_id', profile!.id)
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

  const selected = messages?.find(m => m.id === selectedId);

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Messages</h2><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-foreground flex items-center gap-2"><MessageCircle className="w-6 h-6 text-primary" /> Messages</h2>

      {(!messages || messages.length === 0) ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No messages yet. Your care manager will send updates here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(m => (
            <button
              key={m.id}
              onClick={() => { setSelectedId(m.id); if (!m.viewed) markViewed.mutate(m.id); }}
              className="w-full bg-card border border-border rounded-xl p-4 text-left hover:bg-accent/30 transition-colors flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{m.message_type}</Badge>
                  {!m.viewed && <Badge className="text-[10px] bg-primary">New</Badge>}
                </div>
                <p className="text-sm text-foreground mt-1 line-clamp-2">{m.script}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{m.sent_at ? formatDistanceToNow(new Date(m.sent_at), { addSuffix: true }) : ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selectedId} onOpenChange={open => !open && setSelectedId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.message_type}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <MediaPlayer
                storageUrl={selected.storage_path || ''}
                mediaType={selected.storage_path ? (selected.storage_path.includes('audio') ? 'audio' : 'video') : 'text'}
                transcript={selected.script}
                onViewed={() => { if (!selected.viewed) markViewed.mutate(selected.id); }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
