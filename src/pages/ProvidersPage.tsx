import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Check, X, Star } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function ProvidersPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', specialty: '', locations: 1, rating: 0, status: 'Active', credentialing_expiry: '', hipaa_baa_on_file: false, notes: '' });

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data } = await supabase.from('providers').select('*').order('name');
      return data || [];
    },
  });

  const { data: caseCounts } = useQuery({
    queryKey: ['provider-case-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('provider_id').neq('status', 'Settled');
      const counts: Record<string, number> = {};
      data?.forEach(c => { if (c.provider_id) counts[c.provider_id] = (counts[c.provider_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: linkedCases } = useQuery({
    queryKey: ['provider-cases', showDetail],
    queryFn: async () => {
      if (!showDetail) return [];
      const { data } = await supabase.from('cases').select('id, case_number, patient_name, status').eq('provider_id', showDetail).neq('status', 'Settled');
      return data || [];
    },
    enabled: !!showDetail,
  });

  const addProvider = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('providers').insert({
        name: form.name, specialty: form.specialty || null, locations: form.locations,
        rating: form.rating || null, status: form.status, credentialing_expiry: form.credentialing_expiry || null,
        hipaa_baa_on_file: form.hipaa_baa_on_file, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setShowAdd(false); toast.success('Provider added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProvider = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from('providers').update(updates).eq('id', showDetail!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); toast.success('Provider updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedProvider = providers?.find(p => p.id === showDetail);

  if (isLoading) {
    return <div className="space-y-6"><h2 className="font-display text-xl">Providers</h2><div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Provider Network</h2>
        {isAdmin && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Provider</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providers?.map(p => {
          const daysToExpiry = p.credentialing_expiry ? differenceInDays(new Date(p.credentialing_expiry), new Date()) : null;
          return (
            <button key={p.id} onClick={() => setShowDetail(p.id)} className="bg-card border border-border rounded p-6 text-left hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.specialty || '—'}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Locations: </span>
                  <span className="font-mono text-foreground">{p.locations}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rating: </span>
                  <span className="font-mono text-foreground"><Star className="w-3 h-3 inline text-warning" /> {p.rating || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Cases: </span>
                  <span className="font-mono text-foreground">{caseCounts?.[p.id] || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1">
                  {p.hipaa_baa_on_file ? <Check className="w-3 h-3 text-success" /> : <X className="w-3 h-3 text-destructive" />}
                  <span className="text-muted-foreground">HIPAA BAA</span>
                </div>
                {p.credentialing_expiry && (
                  <div className="flex items-center gap-1">
                    <span className={daysToExpiry != null && daysToExpiry < 0 ? 'text-destructive' : daysToExpiry != null && daysToExpiry < 90 ? 'text-warning' : 'text-muted-foreground'}>
                      {daysToExpiry != null && daysToExpiry < 0 ? 'Expired' : daysToExpiry != null && daysToExpiry < 90 ? 'Expiring Soon' : format(new Date(p.credentialing_expiry), 'MMM yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{selectedProvider?.name}</DialogTitle></DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><span className="text-muted-foreground">Specialty:</span> <span className="text-foreground">{selectedProvider.specialty}</span></div>
                <div><span className="text-muted-foreground">Locations:</span> <span className="font-mono text-foreground">{selectedProvider.locations}</span></div>
                <div><span className="text-muted-foreground">Rating:</span> <span className="font-mono text-foreground">{selectedProvider.rating}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedProvider.status} /></div>
              </div>
              {linkedCases && linkedCases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Active Cases</p>
                  {linkedCases.map(c => (
                    <button key={c.id} onClick={() => { setShowDetail(null); navigate(`/cases/${c.id}`); }} className="w-full flex items-center justify-between py-1.5 text-xs hover:bg-secondary rounded px-2 transition-colors">
                      <span className="font-mono text-primary">{c.case_number}</span>
                      <span className="text-foreground">{c.patient_name}</span>
                      <StatusBadge status={c.status} />
                    </button>
                  ))}
                </div>
              )}
              {isAdmin && (
                <Button variant="destructive" size="sm" onClick={() => {
                  if (confirm('Deactivate this provider?')) updateProvider.mutate({ status: 'Inactive' });
                }}>Deactivate</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Provider Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display">Add Provider</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addProvider.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Specialty</Label>
                <Input value={form.specialty} onChange={e => setForm(p => ({...p, specialty: e.target.value}))} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Locations</Label>
                <Input type="number" value={form.locations} onChange={e => setForm(p => ({...p, locations: Number(e.target.value)}))} className="bg-background border-border" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={addProvider.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
