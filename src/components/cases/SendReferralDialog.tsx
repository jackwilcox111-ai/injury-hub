import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, UserPlus, Send, MapPin, Phone, Globe } from 'lucide-react';
import { SPECIALTIES, getSpecialtyColor } from '@/lib/specialties';
import { geocodeLocation } from '@/lib/geocode';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber?: string;
  patientCity?: string | null;
  patientState?: string | null;
}

export function SendReferralDialog({ open, onOpenChange, caseId, caseNumber, patientCity, patientState }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isStaff = profile?.role === 'admin' || profile?.role === 'care_manager';

  const [specialty, setSpecialty] = useState<string>('__all__');
  const [providerSearch, setProviderSearch] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setSpecialty('__all__');
      setProviderSearch('');
      setNotes(
        isStaff
          ? `You have a new patient referral from Got Hurt Injury Network${caseNumber ? ` for case ${caseNumber}` : ''}. Please review and accept or decline this referral.`
          : ''
      );
    }
  }, [open, caseNumber, isStaff]);

  // --- Staff-only: patient geocoding & provider list ---
  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-for-referral', caseId],
    enabled: open && isStaff,
    queryFn: async () => {
      const { data } = await supabase.from('patient_profiles')
        .select('address, city, state, zip')
        .eq('case_id', caseId)
        .maybeSingle();
      return data;
    },
  });

  const [patientCoords, setPatientCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!patientProfile) { setPatientCoords(null); return; }
    const addr = [patientProfile.address, patientProfile.city, patientProfile.state, patientProfile.zip].filter(Boolean).join(', ');
    if (!addr) { setPatientCoords(null); return; }
    let cancelled = false;
    geocodeLocation(addr).then(result => {
      if (!cancelled && result) setPatientCoords({ lat: result.lat, lng: result.lng });
    });
    return () => { cancelled = true; };
  }, [patientProfile]);

  const { data: allProviders, isLoading: loadingProviders } = useQuery({
    queryKey: ['referral-providers-all'],
    enabled: open && isStaff,
    queryFn: async () => {
      const { data } = await supabase.from('providers')
        .select('id, name, specialty, phone, address_city, address_state, accepting_patients, languages_spoken, rating, latitude, longitude')
        .eq('status', 'Active')
        .order('name');
      return data || [];
    },
  });

  // Staff: assign provider directly
  const assignProvider = useMutation({
    mutationFn: async (providerId: string) => {
      const provider = allProviders?.find(p => p.id === providerId);
      const providerSpecialty = provider?.specialty || 'General';
      const { error: caseErr } = await supabase.from('cases').update({ provider_id: providerId }).eq('id', caseId);
      if (caseErr) throw caseErr;
      const { error: taskErr } = await supabase.from('case_tasks').insert({
        case_id: caseId,
        title: `Assign ${providerSpecialty} provider`,
        description: `${providerSpecialty} provider referral requested for case ${caseNumber || caseId}. ${notes}`.trim(),
        status: 'In Progress',
      });
      if (taskErr) throw taskErr;
    },
    onSuccess: () => {
      toast.success('Referral sent to provider — awaiting their response');
      queryClient.invalidateQueries({ queryKey: ['case-referrals', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-tasks-section', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Attorney: request specialty (creates task for care manager)
  const requestReferral = useMutation({
    mutationFn: async () => {
      if (!specialty || specialty === '__all__') throw new Error('Please select a specialty');
      const { error } = await supabase.from('case_tasks').insert({
        case_id: caseId,
        title: `Assign ${specialty} provider`,
        description: `Attorney requested a ${specialty} provider referral for case ${caseNumber || caseId}. ${notes}`.trim(),
        status: 'Pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral request submitted — care team will assign a provider');
      queryClient.invalidateQueries({ queryKey: ['case-tasks-section', caseId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredProviders = useMemo(() => {
    if (!allProviders) return [];
    let list = allProviders;
    if (specialty && specialty !== '__all__') {
      list = list.filter(p => p.specialty?.toLowerCase().includes(specialty.toLowerCase()));
    }
    if (providerSearch.trim()) {
      const q = providerSearch.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address_city?.toLowerCase().includes(q) ||
        p.address_state?.toLowerCase().includes(q)
      );
    }
    if (patientCoords) {
      list = [...list].map(p => ({
        ...p,
        _distance: (p.latitude && p.longitude)
          ? haversineDistance(patientCoords.lat, patientCoords.lng, p.latitude, p.longitude)
          : null,
      })).sort((a, b) => {
        if (a._distance == null && b._distance == null) return 0;
        if (a._distance == null) return 1;
        if (b._distance == null) return -1;
        return a._distance - b._distance;
      });
    }
    return list;
  }, [allProviders, specialty, providerSearch, patientCoords]);

  const patientAddress = patientProfile
    ? [patientProfile.address, patientProfile.city, patientProfile.state, patientProfile.zip].filter(Boolean).join(', ')
    : [patientCity, patientState].filter(Boolean).join(', ') || null;

  // ─── Attorney view: simple specialty request ───
  if (!isStaff) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4 text-primary" />
              Request Provider Referral
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-xs">
              <Label className="text-[10px] text-muted-foreground">Case</Label>
              <p className="font-mono text-primary">{caseNumber}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Specialty Needed <span className="text-destructive">*</span></Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select a specialty..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" disabled>Select a specialty...</SelectItem>
                  {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="text-xs"
                placeholder="Any special requirements, urgency notes, or preferences..."
              />
            </div>

            <Button
              className="w-full gap-1.5"
              onClick={() => requestReferral.mutate()}
              disabled={requestReferral.isPending || !specialty || specialty === '__all__'}
            >
              <Send className="w-3.5 h-3.5" />
              {requestReferral.isPending ? 'Submitting...' : 'Submit Referral Request'}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Your request will be sent to the care team for provider assignment.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Staff view: full provider search & assign ───
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-primary" />
            Send Referral
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-[10px] text-muted-foreground">Case</Label>
              <p className="font-mono text-primary">{caseNumber}</p>
              {patientAddress && (
                <p className="text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {patientAddress}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Message</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" />
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-primary" />
                Select Provider
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
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="h-9 w-48 text-xs"><SelectValue placeholder="All Specialties" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Specialties</SelectItem>
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
                      {p.specialty && (
                        <span
                          className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ backgroundColor: getSpecialtyColor(p.specialty) }}
                        >
                          {p.specialty}
                        </span>
                      )}
                      {p.accepting_patients && <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-600 shrink-0">Accepting</Badge>}
                      {p.rating && <span className="text-[10px] text-amber-500">★ {p.rating}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {(p.address_city || p.address_state) && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {[p.address_city, p.address_state].filter(Boolean).join(', ')}
                          {(p as any)._distance != null && (
                            <span className="ml-1 font-medium text-primary">({(p as any)._distance.toFixed(1)} mi)</span>
                          )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
