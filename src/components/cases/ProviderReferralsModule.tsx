import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Send, RotateCcw, Save, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Sent: 'bg-blue-100 text-blue-700 border-blue-200',
  Accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Declined: 'bg-red-100 text-red-700 border-red-200',
  Expired: 'bg-muted text-muted-foreground border-border',
};

const REFERRAL_STATUSES = ['Pending', 'Sent', 'Accepted', 'Declined', 'Expired'];
const REFERRAL_METHODS = ['Platform', 'Email', 'Phone', 'Fax', 'In-Person'];

interface Props {
  caseId: string;
  onSendReferral: () => void;
}

export function ProviderReferralsModule({ caseId, onSendReferral }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isAttorney = profile?.role === 'attorney';
  const canEdit = profile?.role === 'admin' || profile?.role === 'care_manager';
  const canRequestReferral = isAttorney;
  const [editingReferral, setEditingReferral] = useState<any>(null);

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['case-referrals', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals')
        .select('*, providers(name, specialty, email, phone)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (referralId: string) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('referrals')
        .update({ token, token_expires_at: expiresAt, status: 'Pending', responded_at: null } as any)
        .eq('id', referralId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-referrals', caseId] });
      toast.success('Referral resent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { id, ...fields } = updates;
      const { error } = await supabase.from('referrals').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-referrals', caseId] });
      setEditingReferral(null);
      toast.success('Referral updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (referralId: string) => {
      const { error } = await supabase.from('referrals').delete().eq('id', referralId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-referrals', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setEditingReferral(null);
      toast.success('Referral deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = {
    sent: referrals?.length || 0,
    accepted: referrals?.filter(r => r.status === 'Accepted').length || 0,
    pending: referrals?.filter(r => r.status === 'Pending').length || 0,
  };

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Provider Referrals</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts.sent} sent · {counts.accepted} accepted · {counts.pending} pending
            </p>
          </div>
          {canEdit && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onSendReferral}>
              <Send className="w-3.5 h-3.5" /> Send Referral
            </Button>
          )}
          {canRequestReferral && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onSendReferral}>
              <Send className="w-3.5 h-3.5" /> Request Referral
            </Button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Referred Date</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Method</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Responded</th>
              {canEdit && <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {referrals?.map(r => {
              const provider = (r as any).providers;
              const isResendable = r.status === 'Pending' || r.status === 'Expired';
              return (
                <tr
                  key={r.id}
                  className={`hover:bg-accent/30 transition-colors ${canEdit ? 'cursor-pointer' : ''}`}
                  onClick={() => canEdit && setEditingReferral(r)}
                >
                  <td className="px-5 py-3 text-xs font-medium text-primary">{provider?.name || '—'}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{r.specialty || provider?.specialty || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs">{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3 text-xs">{(r as any).referral_method || 'Email'}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[r.status] || ''}`}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {(r as any).responded_at ? format(new Date((r as any).responded_at), 'MMM d, yyyy') : '—'}
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {isResendable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] gap-1"
                            onClick={(e) => { e.stopPropagation(); resendMutation.mutate(r.id); }}
                            disabled={resendMutation.isPending}
                          >
                            <RotateCcw className="w-3 h-3" /> Resend
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {(!referrals || referrals.length === 0) && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  No referrals sent yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Referral Dialog */}
      <EditReferralDialog
        referral={editingReferral}
        onClose={() => setEditingReferral(null)}
        onSave={(updates) => updateMutation.mutate(updates)}
        onDelete={(id) => deleteMutation.mutate(id)}
        isPending={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}

function EditReferralDialog({ referral, onClose, onSave, onDelete, isPending, isDeleting }: {
  referral: any;
  onClose: () => void;
  onSave: (updates: Record<string, any>) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
  isDeleting: boolean;
}) {
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [notes, setNotes] = useState('');

  // Sync form when referral changes
  const referralId = referral?.id;
  useState(() => {
    if (referral) {
      setStatus(referral.status || 'Pending');
      setMethod(referral.referral_method || 'Email');
      setSpecialty(referral.specialty || '');
      setNotes(referral.notes || '');
    }
  });

  // Re-sync when a new referral is opened
  if (referral && status === '' && referral.status) {
    setStatus(referral.status);
    setMethod(referral.referral_method || 'Email');
    setSpecialty(referral.specialty || '');
    setNotes(referral.notes || '');
  }

  const provider = referral?.providers;

  return (
    <Dialog open={!!referral} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Referral — {provider?.name || 'Unknown'}</DialogTitle>
        </DialogHeader>
        {referral && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave({
                id: referral.id,
                status,
                referral_method: method,
                specialty: specialty || null,
                notes: notes || null,
                responded_at: (status === 'Accepted' || status === 'Declined') && !referral.responded_at
                  ? new Date().toISOString()
                  : referral.responded_at,
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Specialty</Label>
              <Input value={specialty} onChange={e => setSpecialty(e.target.value)} className="h-9" placeholder="e.g. Chiropractic" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes..." />
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Provider: <span className="text-foreground font-medium">{provider?.name}</span></p>
              <p>Phone: <span className="font-mono">{provider?.phone || '—'}</span></p>
              <p>Email: <span className="font-mono">{provider?.email || '—'}</span></p>
              <p>Referred: <span className="font-mono">{referral.created_at ? format(new Date(referral.created_at), 'MMM d, yyyy') : '—'}</span></p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                <Save className="w-3.5 h-3.5 mr-1" /> Save Changes
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
