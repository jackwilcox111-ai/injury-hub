import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/global/StatusBadge';
import { SortableHeader } from '@/components/global/SortableHeader';
import { useSortableTable } from '@/hooks/use-sortable-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Check, X, Star, MapPin, Clock, CheckCircle2, XCircle, Stethoscope, TrendingUp, Users, Languages, Search } from 'lucide-react';
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
  const [form, setForm] = useState({ name: '', specialty: '', locations: 1, status: 'Active', credentialing_expiry: '', hipaa_baa_on_file: false, interpreter_available: false, languages_spoken: ['English'] as string[], notes: '' });
  const [newLoc, setNewLoc] = useState({ label: '', address_street: '', address_city: '', address_state: '', address_zip: '', phone: '', fax: '' });
  const [showAddLoc, setShowAddLoc] = useState(false);

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

  const { data: providerLocations } = useQuery({
    queryKey: ['provider-locations', showDetail],
    queryFn: async () => {
      if (!showDetail) return [];
      const { data } = await supabase.from('provider_locations').select('*').eq('provider_id', showDetail).order('is_primary', { ascending: false });
      return data || [];
    },
    enabled: !!showDetail,
  });

  const addLocation = useMutation({
    mutationFn: async () => {
      if (!showDetail) throw new Error('No provider');
      const { error } = await supabase.from('provider_locations').insert({
        provider_id: showDetail,
        label: newLoc.label || 'Office',
        address_street: newLoc.address_street || null,
        address_city: newLoc.address_city || null,
        address_state: newLoc.address_state || null,
        address_zip: newLoc.address_zip || null,
        phone: newLoc.phone || null,
        fax: newLoc.fax || null,
        is_primary: (providerLocations?.length || 0) === 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-locations', showDetail] });
      setNewLoc({ label: '', address_street: '', address_city: '', address_state: '', address_zip: '', phone: '', fax: '' });
      setShowAddLoc(false);
      toast.success('Location added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLocation = useMutation({
    mutationFn: async (locId: string) => {
      const { error } = await supabase.from('provider_locations').delete().eq('id', locId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-locations', showDetail] });
      toast.success('Location removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addProvider = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('providers').insert({
        name: form.name, specialty: form.specialty || null, locations: form.locations,
        status: form.status, credentialing_expiry: form.credentialing_expiry || null,
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
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input defaultValue={selectedProvider.name} className="h-9" onBlur={e => { if (e.target.value !== selectedProvider.name) updateProvider.mutate({ name: e.target.value }); }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Primary Specialty</Label>
                    <Input defaultValue={selectedProvider.specialty || ''} className="h-9" onBlur={e => { const v = e.target.value || null; if (v !== selectedProvider.specialty) updateProvider.mutate({ specialty: v }); }} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Services Offered</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Chiropractic', 'Physical Therapy', 'Pain Management', 'Imaging', 'Orthopedic Surgery', 'Neurology', 'Radiology', 'General Practice', 'Surgery', 'Other'].map(svc => {
                        const current: string[] = (selectedProvider as any).services_offered || [];
                        const checked = current.includes(svc);
                        return (
                          <label key={svc} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${checked ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                            <Checkbox checked={checked} onCheckedChange={() => {
                              const updated = checked ? current.filter(s => s !== svc) : [...current, svc];
                              updateProvider.mutate({ services_offered: updated });
                            }} className="w-3 h-3" />
                            {svc}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <Input defaultValue={(selectedProvider as any).phone || ''} placeholder="(555) 555-5555" className="h-9 font-mono" onBlur={e => { const v = e.target.value || null; if (v !== (selectedProvider as any).phone) updateProvider.mutate({ phone: v }); }} />
                  </div>
                  <div className="space-y-1 col-span-2" />
                  {/* Locations managed below */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Credentialing Expiry</Label>
                    <Input type="date" defaultValue={selectedProvider.credentialing_expiry || ''} className="h-9" onBlur={e => { const v = e.target.value || null; if (v !== selectedProvider.credentialing_expiry) updateProvider.mutate({ credentialing_expiry: v }); }} />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">HIPAA BAA On File</Label>
                    <Switch checked={selectedProvider.hipaa_baa_on_file || false} onCheckedChange={v => updateProvider.mutate({ hipaa_baa_on_file: v })} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Input defaultValue={selectedProvider.notes || ''} className="h-9" onBlur={e => { const v = e.target.value || null; if (v !== selectedProvider.notes) updateProvider.mutate({ notes: v }); }} />
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">Status:</span> <StatusBadge status={selectedProvider.status} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Primary Specialty:</span> <span className="font-medium">{selectedProvider.specialty || '—'}</span></div>
                  <div><span className="text-muted-foreground">Services:</span> <span className="font-medium">{((selectedProvider as any).services_offered || []).join('; ') || '—'}</span></div>
                  <div><span className="text-muted-foreground">Locations:</span> <span className="font-medium">{selectedProvider.locations}</span></div>
                  
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-mono text-sm">{(selectedProvider as any).phone || '—'}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedProvider.status} /></div>
                </div>
              )}
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

              {/* Locations */}
              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Locations ({providerLocations?.length || 0})</p>
                  {isAdmin && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddLoc(!showAddLoc)}>
                      <Plus className="w-3 h-3" /> Add Location
                    </Button>
                  )}
                </div>
                {showAddLoc && isAdmin && (
                  <div className="bg-accent/30 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Label (e.g. Main Office)" className="h-8 text-xs" value={newLoc.label} onChange={e => setNewLoc(p => ({ ...p, label: e.target.value }))} />
                      <Input placeholder="Phone" className="h-8 text-xs font-mono" value={newLoc.phone} onChange={e => setNewLoc(p => ({ ...p, phone: e.target.value }))} />
                      <Input placeholder="Street" className="h-8 text-xs col-span-2" value={newLoc.address_street} onChange={e => setNewLoc(p => ({ ...p, address_street: e.target.value }))} />
                      <Input placeholder="City" className="h-8 text-xs" value={newLoc.address_city} onChange={e => setNewLoc(p => ({ ...p, address_city: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="State" className="h-8 text-xs" value={newLoc.address_state} onChange={e => setNewLoc(p => ({ ...p, address_state: e.target.value }))} />
                        <Input placeholder="ZIP" className="h-8 text-xs" value={newLoc.address_zip} onChange={e => setNewLoc(p => ({ ...p, address_zip: e.target.value }))} />
                      </div>
                      <Input placeholder="Fax" className="h-8 text-xs font-mono" value={newLoc.fax} onChange={e => setNewLoc(p => ({ ...p, fax: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddLoc(false)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => addLocation.mutate()} disabled={addLocation.isPending}>Save</Button>
                    </div>
                  </div>
                )}
                {providerLocations && providerLocations.length > 0 ? (
                  <div className="space-y-2">
                    {providerLocations.map((loc: any) => (
                      <div key={loc.id} className="bg-accent/30 rounded-lg px-3 py-2.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-foreground">{loc.label || 'Office'}</span>
                            {loc.is_primary && <span className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">Primary</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                            {[loc.address_street, loc.address_city, loc.address_state, loc.address_zip].filter(Boolean).join(', ') || 'No address'}
                          </p>
                          {(loc.phone || loc.fax) && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-5 font-mono">
                              {loc.phone && `☎ ${loc.phone}`}{loc.phone && loc.fax && ' · '}{loc.fax && `Fax: ${loc.fax}`}
                            </p>
                          )}
                        </div>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm('Remove this location?')) deleteLocation.mutate(loc.id); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No locations added yet</p>
                )}
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
  const [search, setSearch] = useState('');
  
  const filtered = providers?.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.specialty?.toLowerCase().includes(s);
  });

  // Enrich with activeCases for sorting
  const enriched = filtered?.map(p => ({ ...p, activeCases: caseCounts?.[p.id] || 0 }));
  const { sortedData, sortConfig, requestSort } = useSortableTable(enriched, { key: 'name', direction: 'asc' });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers, specialties..." className="pl-9 h-10" />
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-accent/50">
            <SortableHeader label="Provider" sortKey="name" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
            <SortableHeader label="Phone" sortKey="phone" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
            <SortableHeader label="Specialty" sortKey="specialty" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Languages / Interpreter</th>
            <SortableHeader label="Locations" sortKey="locations" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
            
            <SortableHeader label="Active Cases" sortKey="activeCases" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
            <SortableHeader label="HIPAA BAA" sortKey="hipaa_baa_on_file" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
            <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Credentials</th>
            <SortableHeader label="Status" sortKey="status" currentKey={sortConfig.key} direction={sortConfig.direction} onSort={requestSort} />
          </tr></thead>
          <tbody className="divide-y divide-border">
            {sortedData?.map(p => {
              const daysToExpiry = p.credentialing_expiry ? differenceInDays(new Date(p.credentialing_expiry), new Date()) : null;
              const langs: string[] = p.languages_spoken || ['English'];
              return (
                <tr key={p.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => onSelect(p.id)}>
                  <td className="px-5 py-3.5 font-medium text-foreground">{p.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{(p as any).phone || '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">{p.specialty || '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {langs.map(l => (
                        <span key={l} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{l}</span>
                      ))}
                      {p.interpreter_available && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          <Languages className="w-3 h-3" /> Interpreter
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {p.locations || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-primary">{p.activeCases}</td>
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
    </div>
  );
}
