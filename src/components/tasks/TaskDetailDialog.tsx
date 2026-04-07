import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, UserPlus, CheckSquare, MapPin, Phone, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { SPECIALTIES } from '@/lib/specialties';

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  staff: any[];
  onUpdate: (id: string, updates: Record<string, any>) => void;
}

function extractSpecialty(title: string): string | null {
  const match = title.match(/^Assign\s+(.+?)\s+provider$/i);
  return match ? match[1] : null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function TaskDetailDialog({ open, onOpenChange, task, staff, onUpdate }: TaskDetailDialogProps) {
  const queryClient = useQueryClient();
  const [providerSearch, setProviderSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('');
  const defaultSpecialty = useMemo(() => extractSpecialty(task?.title || ''), [task?.title]);
  const isReferralTask = !!defaultSpecialty;

  // Reset specialty filter when task changes
  useMemo(() => { setSpecialtyFilter(defaultSpecialty || ''); }, [defaultSpecialty]);

  // Fetch patient profile for address/coordinates
  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-for-task', task?.case_id],
    enabled: open && isReferralTask && !!task?.case_id,
    queryFn: async () => {
      const { data } = await supabase.from('patient_profiles')
        .select('address, city, state, zip')
        .eq('case_id', task.case_id)
        .maybeSingle();
      return data;
    },
  });

  // Fetch all active providers (no specialty filter at query level so we can filter client-side)
  const { data: allProviders, isLoading: loadingProviders } = useQuery({
    queryKey: ['task-providers-all'],
    enabled: open && isReferralTask,
    queryFn: async () => {
      const { data } = await supabase.from('providers')
        .select('id, name, specialty, phone, address_city, address_state, accepting_patients, languages_spoken, rating, latitude, longitude')
        .eq('status', 'Active')
        .order('name');
      return data || [];
    },
  });

  const assignProvider = useMutation({
    mutationFn: async (providerId: string) => {
      const { error: caseErr } = await supabase.from('cases').update({ provider_id: providerId }).eq('id', task.case_id);
      if (caseErr) throw caseErr;
      const { error: taskErr } = await supabase.from('case_tasks').update({
        status: 'Complete',
        completed_at: new Date().toISOString(),
      }).eq('id', task.id);
      if (taskErr) throw taskErr;
    },
    onSuccess: () => {
      toast.success('Provider assigned and task completed');
      queryClient.invalidateQueries({ queryKey: ['admin-all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Use a simple geocode lookup for patient city/state if we have it
  // For now we'll match against provider lat/lng if patient has a known location
  const patientLocation = useMemo(() => {
    // We don't have patient lat/lng directly, but we can try to find a rough center
    // For real distance we'd need geocoding. For now, return null and sort alphabetically.
    return null as { lat: number; lng: number } | null;
  }, [patientProfile]);

  const filteredProviders = useMemo(() => {
    if (!allProviders) return [];
    let list = allProviders;

    // Filter by specialty
    if (specialtyFilter) {
      list = list.filter(p => p.specialty?.toLowerCase().includes(specialtyFilter.toLowerCase()));
    }

    // Filter by search text
    if (providerSearch.trim()) {
      const q = providerSearch.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address_city?.toLowerCase().includes(q) ||
        p.address_state?.toLowerCase().includes(q)
      );
    }

    // Calculate distance and sort if we have patient coords
    // We'll use patient city/state to find a matching provider's coords as a proxy
    // Better: sort providers that share the same city/state first
    if (patientProfile?.city || patientProfile?.state) {
      const pCity = patientProfile.city?.toLowerCase() || '';
      const pState = patientProfile.state?.toLowerCase() || '';
      list = [...list].sort((a, b) => {
        const aCity = a.address_city?.toLowerCase() || '';
        const aState = a.address_state?.toLowerCase() || '';
        const bCity = b.address_city?.toLowerCase() || '';
        const bState = b.address_state?.toLowerCase() || '';
        // Same city+state first, then same state, then rest
        const aScore = (aCity === pCity && aState === pState) ? 0 : (aState === pState ? 1 : 2);
        const bScore = (bCity === pCity && bState === pState) ? 0 : (bState === pState ? 1 : 2);
        return aScore - bScore;
      });
    }

    return list;
  }, [allProviders, specialtyFilter, providerSearch, patientProfile]);

  if (!task) return null;

  const patientAddress = patientProfile
    ? [patientProfile.city, patientProfile.state].filter(Boolean).join(', ')
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isReferralTask ? "sm:max-w-2xl max-h-[85vh] overflow-y-auto" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-base">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-[10px] text-muted-foreground">Case</Label>
              <p className="font-mono text-primary">{task.cases?.case_number}</p>
              <p className="text-muted-foreground">{task.cases?.patient_name}</p>
              {patientAddress && (
                <p className="text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {patientAddress}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Status</Label>
              <div className="mt-0.5">
                <Select value={task.status} onValueChange={v => onUpdate(task.id, { status: v, ...(v === 'Complete' ? { completed_at: new Date().toISOString() } : {}) })}>
                  <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Assignee</Label>
              <div className="mt-0.5">
                <Select value={task.assignee_id || ''} onValueChange={v => onUpdate(task.id, { assignee_id: v || null })}>
                  <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>{staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name || 'Unnamed'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Due</Label>
              <p>{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}</p>
            </div>
          </div>

          {task.description && (
            <div>
              <Label className="text-[10px] text-muted-foreground">Description</Label>
              <p className="text-xs text-foreground mt-0.5">{task.description}</p>
            </div>
          )}

          {/* Provider Assignment Section */}
          {isReferralTask && task.status !== 'Complete' && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Assign Provider
                </h3>
                <Badge variant="outline" className="text-[10px]">{filteredProviders.length} found</Badge>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, city, or state..."
                    value={providerSearch}
                    onChange={e => setProviderSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="h-9 w-48 text-xs"><SelectValue placeholder="All Specialties" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Specialties</SelectItem>
                    {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {loadingProviders && <p className="text-xs text-muted-foreground text-center py-4">Loading providers...</p>}
                {!loadingProviders && filteredProviders.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No matching providers found</p>
                )}
                {filteredProviders.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/40 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                        {p.specialty && <Badge variant="secondary" className="text-[9px] shrink-0">{p.specialty}</Badge>}
                        {p.accepting_patients && <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-600 shrink-0">Accepting</Badge>}
                        {p.rating && <span className="text-[10px] text-amber-500">★ {p.rating}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {(p.address_city || p.address_state) && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {[p.address_city, p.address_state].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {p.phone && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {p.phone}
                          </span>
                        )}
                        {p.languages_spoken?.length > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" />
                            {p.languages_spoken.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] shrink-0 opacity-70 group-hover:opacity-100"
                      onClick={() => assignProvider.mutate(p.id)}
                      disabled={assignProvider.isPending}
                    >
                      <UserPlus className="w-3 h-3 mr-1" /> Assign
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isReferralTask && task.status === 'Complete' && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                Provider has been assigned for this referral.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
