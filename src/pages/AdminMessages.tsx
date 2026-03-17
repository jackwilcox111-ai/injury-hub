import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Video, Plus, Eye, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';

const MESSAGE_TYPES = ['Welcome', 'Status Update', 'Appointment Reminder', 'Settlement Notification', 'General'];

export default function AdminMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('All');
  const [showCompose, setShowCompose] = useState(false);
  const [recipientRole, setRecipientRole] = useState('patient');
  const [caseId, setCaseId] = useState('');
  const [messageType, setMessageType] = useState('Status Update');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-video-messages'],
    queryFn: async () => {
      const { data } = await supabase.from('video_messages')
        .select('*, cases!video_messages_case_id_fkey(case_number, patient_name), profiles!video_messages_recipient_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: cases } = useQuery({
    queryKey: ['active-cases-for-messages'],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('id, case_number, patient_name').neq('status', 'Settled').order('case_number');
      return data || [];
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('video_messages').insert({
        case_id: caseId || null,
        recipient_role: recipientRole,
        message_type: messageType,
        script,
        ai_generated_script: false,
        created_by: user?.id,
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-video-messages'] });
      setShowCompose(false);
      setScript('');
      toast.success('Message sent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateScript = async () => {
    if (!caseId) { toast.error('Select a case first'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-message-script', {
        body: { case_id: caseId, message_type: messageType, recipient_role: recipientRole },
      });
      if (error) throw error;
      setScript(data.script || '');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) return <div className="space-y-6"><h2 className="font-display text-2xl">Messages</h2><Skeleton className="h-96 rounded-xl" /></div>;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const sentThisWeek = messages?.filter(m => m.sent_at && new Date(m.sent_at) >= weekAgo).length || 0;
  const viewedThisWeek = messages?.filter(m => m.viewed && m.viewed_at && new Date(m.viewed_at) >= weekAgo).length || 0;
  const viewRate = sentThisWeek > 0 ? Math.round(viewedThisWeek / sentThisWeek * 100) : 0;
  const pending = messages?.filter(m => !m.sent_at).length || 0;

  const filtered = filter === 'All' ? messages :
    filter === 'Unsent' ? messages?.filter(m => !m.sent_at) :
    filter === 'Sent' ? messages?.filter(m => m.sent_at && !m.viewed) :
    filter === 'Viewed' ? messages?.filter(m => m.viewed) : messages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2"><Video className="w-6 h-6 text-primary" /> Messages</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Personalized video/audio/text messages</p>
        </div>
        <Button onClick={() => setShowCompose(true)}><Plus className="w-4 h-4 mr-1" /> New Message</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Sent This Week', value: sentThisWeek, color: 'text-blue-600' },
          { label: 'Viewed This Week', value: viewedThisWeek, color: 'text-emerald-600' },
          { label: 'View Rate', value: `${viewRate}%`, color: 'text-violet-600' },
          { label: 'Pending', value: pending, color: 'text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <p className={`text-3xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {['All', 'Unsent', 'Sent', 'Viewed'].map(s => <TabsTrigger key={s} value={s} className="text-xs">{s}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Recipient</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Case</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Sent</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Viewed</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered?.map(m => (
              <tr key={m.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs">{(m as any).profiles?.full_name || '—'}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">{m.recipient_role}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-primary">{(m as any).cases?.case_number || '—'}</td>
                <td className="px-4 py-3 text-xs">{m.message_type}</td>
                <td className="px-4 py-3">
                  <Badge variant={m.viewed ? 'default' : m.sent_at ? 'secondary' : 'outline'} className="text-[10px]">
                    {m.viewed ? 'Viewed' : m.sent_at ? 'Sent' : 'Pending'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{m.sent_at ? formatDistanceToNow(new Date(m.sent_at), { addSuffix: true }) : '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{m.viewed_at ? formatDistanceToNow(new Date(m.viewed_at), { addSuffix: true }) : '—'}</td>
              </tr>
            ))}
            {(!filtered || filtered.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No messages</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Recipient Role</Label>
                <Select value={recipientRole} onValueChange={setRecipientRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="attorney">Attorney</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Message Type</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MESSAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Case</Label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger><SelectValue placeholder="Select case..." /></SelectTrigger>
                <SelectContent>{cases?.map(c => <SelectItem key={c.id} value={c.id}>{c.case_number} — {c.patient_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Script</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={generateScript} disabled={generating}>
                  <Sparkles className="w-3 h-3 mr-1" /> {generating ? 'Generating...' : 'AI Generate'}
                </Button>
              </div>
              <Textarea value={script} onChange={e => setScript(e.target.value)} rows={6} placeholder="Write your message..." />
              <p className="text-[10px] text-muted-foreground">{script.split(/\s+/).filter(Boolean).length} words · ~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 150)} min read</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button onClick={() => sendMessage.mutate()} disabled={!script || sendMessage.isPending}>
                <Send className="w-3.5 h-3.5 mr-1" /> Send Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
