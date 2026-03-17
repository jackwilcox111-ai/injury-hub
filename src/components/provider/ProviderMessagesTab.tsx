import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MessageCircle, Eye } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ProviderMessagesTab() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['provider-video-messages'],
    queryFn: async () => {
      const { data } = await supabase.from('video_messages')
        .select('*, cases:case_id(case_number, patient_name)')
        .order('created_at', { ascending: false });
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

  const openMessage = (msg: any) => {
    setSelected(msg);
    if (!msg.viewed) markViewed.mutate(msg.id);
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const unread = messages?.filter(m => !m.viewed).length || 0;

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">{unread} unread message{unread > 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="space-y-2">
        {messages?.map(m => (
          <button
            key={m.id}
            onClick={() => openMessage(m)}
            className={`w-full text-left bg-card border rounded-xl p-4 hover:bg-accent/30 transition-colors ${
              !m.viewed ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{m.message_type}</span>
                  {!m.viewed && <Badge className="text-[9px] h-4">New</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(m as any).cases?.case_number} — {(m as any).cases?.patient_name}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {m.created_at ? format(new Date(m.created_at), 'MMM d, yyyy') : ''}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.script}</p>
          </button>
        ))}
        {(!messages || messages.length === 0) && (
          <p className="text-center text-muted-foreground text-sm py-12">No messages yet</p>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> {selected?.message_type}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{(selected as any)?.cases?.case_number}</span>
              <span>•</span>
              <span>{(selected as any)?.cases?.patient_name}</span>
            </div>
            <div className="bg-accent/50 rounded-lg p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected?.script}</p>
            </div>
            {selected?.viewed_at && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" /> Viewed {format(new Date(selected.viewed_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
