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
import { Plus, Check, X, Star, MapPin, Clock, CheckCircle2, XCircle, Stethoscope, TrendingUp, Users, Languages } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { format, differenceInDays } from 'date-fns';
import { LANGUAGES } from '@/lib/languages';

export default function ProvidersPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', specialty: '', locations: 1, rating: 0, status: 'Active', credentialing_expiry: '', hipaa_baa_on_file: false, interpreter_available: false, languages_spoken: ['English'] as string[], notes: '' });

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
      const { data } = await supabase.from('cases').select('provider_id, status').neq('status', 'Settled');
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
        hipaa_baa_on_file: form.hipaa_baa_on_file, interpreter_available: form.interpreter_available,
        languages_spoken: form.languages_spoken, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['providers'] }); setShowAdd(false); toast.success('Provider added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveApp = useMutation({
    mutationFn: async (app: any) => {
      const { data: provData, error: provErr } = await supabase.from('providers').insert({
        name: app.practice_name,
        specialty: app.specialty || null,
        locations: app.locations || 1,
        hipaa_baa_on_file: app.hipaa_baa_agreed || false,
        status: 'Active',
        notes: `Approved from application. Contact: ${app.contact_name}, ${app.email}, ${app.phone}`,
      }).select('id').single();
      if (provErr) throw provErr;

      const { error: updErr } = await supabase.from('provider_applications').update({ status: 'Approved' }).eq('id', app.id);
      if (updErr) throw updErr;

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
  const activeProviders = providers?.filter(p => p.status === 'Active') || [];
  const totalActiveCases = Object.values(caseCounts || {}).reduce((s, c) => s + c, 0);
  const avgRating = activeProviders.length > 0
    ? activeProviders.filter(p => p.rating).reduce((s, p) => s + (p.rating || 0), 0) / activeProviders.filter(p => p.rating).length
    : 0;

  if (isLoading) {
    return <div className="space-y-6"><h2 className="font-display text-2xl">Providers</h2><Skeleton className="h-96 rounded-xl" /></div>;
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Active Providers', value: activeProviders.length, icon: Users, color: 'text-primary bg-primary/10' },
          { label: 'Total Active Cases', value: totalActiveCases, icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Avg Provider Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-[18px] h-[18px]" />
            </div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
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
            <ProviderTable providers={providers} caseCounts={caseCounts} onSelect={setShowDetail} />
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
        <ProviderTable providers={providers} caseCounts={caseCounts} onSelect={setShowDetail} />
      )}

      {/* Detail Dialog */}
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
              <div className="border-t border-border pt-3 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Languages Spoken</p>
                  {isAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(lang => {
                        const checked = (selectedProvider.languages_spoken || ['English']).includes(lang);
                        return (
                          <label key={lang} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${checked ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                            <Checkbox checked={checked} onCheckedChange={() => {
                              const current: string[] = selectedProvider.languages_spoken || ['English'];
                              const updated = checked ? current.filter(l => l !== lang) : [...current, lang];
                              if (updated.length > 0) updateProvider.mutate({ languages_spoken: updated });
                            }} className="w-3 h-3" />
                            {lang}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedProvider.languages_spoken || ['English']).map((lang: string) => (
                        <span key={lang} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{lang}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Interpreter Available</span>
                  </div>
                  {isAdmin ? (
                    <Switch checked={selectedProvider.interpreter_available || false} onCheckedChange={v => updateProvider.mutate({ interpreter_available: v })} />
                  ) : (
                    <span className={`text-xs font-medium ${selectedProvider.interpreter_available ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {selectedProvider.interpreter_available ? 'Yes' : 'No'}
                    </span>
                  )}
                </div>
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

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Provider</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addProvider.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Name *</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required className="h-10" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-sm font-medium">Specialty</Label><Input value={form.specialty} onChange={e => setForm(p => ({...p, specialty: e.target.value}))} className="h-10" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Locations</Label><Input type="number" value={form.locations} onChange={e => setForm(p => ({...p, locations: Number(e.target.value)}))} className="h-10" /></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Interpreter Available</Label>
                <p className="text-xs text-muted-foreground">This provider can accommodate interpreter patients</p>
              </div>
              <Switch checked={form.interpreter_available} onCheckedChange={v => setForm(p => ({...p, interpreter_available: v}))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Languages Spoken</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => {
                  const checked = form.languages_spoken.includes(lang);
                  return (
                    <label key={lang} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${checked ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                      <Checkbox checked={checked} onCheckedChange={() => {
                        setForm(p => ({
                          ...p,
                          languages_spoken: checked ? p.languages_spoken.filter(l => l !== lang) : [...p.languages_spoken, lang],
                        }));
                      }} className="w-3 h-3" />
                      {lang}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={addProvider.isPending}>Add Provider</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderTable({ providers, caseCounts, onSelect }: { providers: any[] | undefined; caseCounts: Record<string, number> | undefined; onSelect: (id: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border bg-accent/50">
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Provider</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Specialty</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Locations</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Rating</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Active Cases</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Interpreter</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">HIPAA BAA</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Credentials</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-border">
          {providers?.map(p => {
            const daysToExpiry = p.credentialing_expiry ? differenceInDays(new Date(p.credentialing_expiry), new Date()) : null;
            const activeCases = caseCounts?.[p.id] || 0;
            return (
              <tr key={p.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => onSelect(p.id)}>
                <td className="px-5 py-3.5 font-medium text-foreground">{p.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs">{p.specialty || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {p.locations || 1}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1 text-xs">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span className="font-mono tabular-nums">{p.rating || '—'}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-primary">{activeCases}</td>
                <td className="px-5 py-3.5">
                  {p.interpreter_available && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Languages className="w-3 h-3" /> Yes
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`flex items-center gap-1 text-xs ${p.hipaa_baa_on_file ? 'text-emerald-600' : 'text-red-500'}`}>
                    {p.hipaa_baa_on_file ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {p.hipaa_baa_on_file ? 'On File' : 'Missing'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs">
                  {daysToExpiry == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : daysToExpiry < 0 ? (
                    <span className="text-red-500 font-medium">Expired</span>
                  ) : daysToExpiry < 90 ? (
                    <span className="text-amber-600 font-medium">Expiring Soon</span>
                  ) : (
                    <span className="text-muted-foreground">{format(new Date(p.credentialing_expiry!), 'MMM yyyy')}</span>
                  )}
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
