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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Check, X, Star, MapPin, Clock, CheckCircle2, XCircle } from 'lucide-react';
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

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['provider-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('provider_applications').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  const pendingCount = applications?.filter(a => a.status === 'Pending').length || 0;

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

  const approveApp = useMutation({
    mutationFn: async (app: any) => {
      // Create provider record
      const { data: provData, error: provErr } = await supabase.from('providers').insert({
        name: app.practice_name,
        specialty: app.specialty || null,
        locations: app.locations || 1,
        hipaa_baa_on_file: app.hipaa_baa_agreed || false,
        status: 'Active',
        notes: `Approved from application. Contact: ${app.contact_name}, ${app.email}, ${app.phone}`,
      }).select('id').single();
      if (provErr) throw provErr;

      // Update application status
      const { error: updErr } = await supabase.from('provider_applications').update({ status: 'Approved' }).eq('id', app.id);
      if (updErr) throw updErr;

      // Invite provider user with login credentials
      const { error: inviteErr } = await supabase.functions.invoke('invite-user', {
        body: {
          email: app.email,
          full_name: app.contact_name,
          role: 'provider',
          provider_id: provData.id,
        },
      });
      if (inviteErr) throw inviteErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['provider-applications'] });
      toast.success('Provider approved — login invitation sent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.from('provider_applications').update({ status: 'Rejected' }).eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-applications'] });
      toast.success('Application rejected');
    },
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
    return <div className="space-y-6"><h2 className="font-display text-2xl">Providers</h2><div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Provider Network</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{providers?.length || 0} providers</p>
        </div>
        {isAdmin && <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Provider</Button>}
      </div>

      {isAdmin ? (
        <Tabs defaultValue="providers">
          <TabsList>
            <TabsTrigger value="providers">Active Providers</TabsTrigger>
            <TabsTrigger value="applications" className="relative">
              Applications
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="mt-4">
            <ProviderGrid providers={providers} caseCounts={caseCounts} onSelect={setShowDetail} />
          </TabsContent>

          <TabsContent value="applications" className="mt-4">
            {appsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : applications?.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">No applications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications?.map(app => (
                  <div key={app.id} className="bg-card border border-border rounded-xl p-5 shadow-card">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{app.practice_name}</p>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{app.contact_name} · {app.specialty} · {app.state}</p>
                        <p className="text-xs text-muted-foreground">{app.email} · {app.phone}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(app.created_at!), 'MMM d, yyyy')}</p>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {app.locations || 1} location{(app.locations || 1) > 1 ? 's' : ''}
                      </span>
                      {app.license_number && <span className="text-muted-foreground">Lic: {app.license_number}</span>}
                      <span className={`flex items-center gap-1 ${app.lien_experience ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {app.lien_experience ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Lien Experience
                      </span>
                      <span className={`flex items-center gap-1 ${app.hipaa_baa_agreed ? 'text-emerald-600' : 'text-red-500'}`}>
                        {app.hipaa_baa_agreed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} HIPAA BAA
                      </span>
                    </div>

                    {app.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{app.notes}"</p>}

                    {app.status === 'Pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => approveApp.mutate(app)} disabled={approveApp.isPending}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { if (confirm('Reject this application?')) rejectApp.mutate(app.id); }} disabled={rejectApp.isPending}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <ProviderGrid providers={providers} caseCounts={caseCounts} onSelect={setShowDetail} />
      )}

      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedProvider?.name}</DialogTitle></DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Specialty:</span> <span className="font-medium">{selectedProvider.specialty}</span></div>
                <div><span className="text-muted-foreground">Locations:</span> <span className="font-medium">{selectedProvider.locations}</span></div>
                <div><span className="text-muted-foreground">Rating:</span> <span className="font-medium">{selectedProvider.rating}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedProvider.status} /></div>
              </div>
              {linkedCases && linkedCases.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Active Cases</p>
                  <div className="space-y-1">
                    {linkedCases.map(c => (
                      <button key={c.id} onClick={() => { setShowDetail(null); navigate(`/cases/${c.id}`); }} className="w-full flex items-center justify-between py-2 text-sm hover:bg-accent rounded-lg px-2 transition-colors">
                        <span className="font-mono text-primary text-xs font-medium">{c.case_number}</span>
                        <span className="text-foreground">{c.patient_name}</span>
                        <StatusBadge status={c.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isAdmin && (
                <Button variant="destructive" size="sm" onClick={() => { if (confirm('Deactivate this provider?')) updateProvider.mutate({ status: 'Inactive' }); }}>
                  Deactivate Provider
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Provider</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addProvider.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Name *</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required className="h-10" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Specialty</Label><Input value={form.specialty} onChange={e => setForm(p => ({...p, specialty: e.target.value}))} className="h-10" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Locations</Label><Input type="number" value={form.locations} onChange={e => setForm(p => ({...p, locations: Number(e.target.value)}))} className="h-10" /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={addProvider.isPending}>Add Provider</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderGrid({ providers, caseCounts, onSelect }: { providers: any[] | undefined; caseCounts: Record<string, number> | undefined; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {providers?.map(p => {
        const daysToExpiry = p.credentialing_expiry ? differenceInDays(new Date(p.credentialing_expiry), new Date()) : null;
        return (
          <button key={p.id} onClick={() => onSelect(p.id)} className="bg-card border border-border rounded-xl p-5 text-left shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.specialty || '—'}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.locations} location{(p.locations || 1) > 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {p.rating || '—'}</span>
              <span className="font-medium text-primary">{caseCounts?.[p.id] || 0} active cases</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <span className={`flex items-center gap-1 ${p.hipaa_baa_on_file ? 'text-emerald-600' : 'text-red-500'}`}>
                {p.hipaa_baa_on_file ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} HIPAA BAA
              </span>
              {daysToExpiry != null && (
                <span className={daysToExpiry < 0 ? 'text-red-500 font-medium' : daysToExpiry < 90 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                  {daysToExpiry < 0 ? 'Credentials Expired' : daysToExpiry < 90 ? 'Expiring Soon' : `Exp. ${format(new Date(p.credentialing_expiry!), 'MMM yyyy')}`}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
