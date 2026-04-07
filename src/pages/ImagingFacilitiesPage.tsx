import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Search, Building2, Upload } from 'lucide-react';
import { US_STATES } from '@/lib/us-states';

const IMAGING_TYPE_OPTIONS = [
  { value: 'xray', label: 'X-Ray' },
  { value: 'mri', label: 'MRI' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'other', label: 'Other' },
];

interface Facility {
  id: string;
  name: string;
  state: string;
  city: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  accepted_imaging_types: string[];
  is_preferred: boolean;
  status: string;
  custom_form_url: string | null;
  notes: string | null;
}

const emptyForm = {
  name: '', state: '', city: '', address: '', phone: '', fax: '', email: '',
  accepted_imaging_types: [] as string[], is_preferred: false, status: 'active', notes: '',
};

export default function ImagingFacilitiesPage() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['imaging-facilities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('imaging_facilities')
        .select('*')
        .order('state')
        .order('city')
        .order('name');
      return (data || []) as Facility[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      const payload = {
        name: f.name, state: f.state, city: f.city, address: f.address || null,
        phone: f.phone || null, fax: f.fax || null, email: f.email || null,
        accepted_imaging_types: f.accepted_imaging_types, is_preferred: f.is_preferred,
        status: f.status, notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from('imaging_facilities').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('imaging_facilities').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imaging-facilities'] });
      toast.success(editing ? 'Facility updated' : 'Facility added');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (f: Facility) => {
    setEditing(f);
    setForm({
      name: f.name, state: f.state, city: f.city, address: f.address || '',
      phone: f.phone || '', fax: f.fax || '', email: f.email || '',
      accepted_imaging_types: f.accepted_imaging_types, is_preferred: f.is_preferred,
      status: f.status, notes: f.notes || '',
    });
    setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditing(null); };

  const handleUploadForm = async (facilityId: string, file: File) => {
    setUploadingFile(true);
    try {
      const path = `imaging-facility-forms/${facilityId}/${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { error: updateErr } = await supabase.from('imaging_facilities').update({ custom_form_url: path }).eq('id', facilityId);
      if (updateErr) throw updateErr;
      queryClient.invalidateQueries({ queryKey: ['imaging-facilities'] });
      toast.success('Custom form uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const filtered = (facilities || []).filter(f => {
    if (filterState && f.state !== filterState) return false;
    if (filterCity && !f.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterType && !f.accepted_imaging_types.includes(filterType)) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Imaging Facilities</h1>
          <p className="text-sm text-muted-foreground">Manage imaging facility directory by location</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Facility</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-8 w-48" />
        </div>
        <Select value={filterState} onValueChange={v => setFilterState(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All States" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Filter city..." value={filterCity} onChange={e => setFilterCity(e.target.value)} className="h-9 w-36" />
        <Select value={filterType} onValueChange={v => setFilterType(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {IMAGING_TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-accent/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Facility</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Location</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Phone / Fax</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Imaging Types</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Custom Form</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(f => (
              <tr key={f.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{f.name}</p>
                      {f.is_preferred && <Badge variant="outline" className="text-[9px] mt-0.5">Preferred</Badge>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs">{f.city}, {f.state}{f.address ? <><br /><span className="text-muted-foreground">{f.address}</span></> : ''}</td>
                <td className="px-4 py-2.5 text-xs">
                  {f.phone && <span>P: {f.phone}</span>}
                  {f.fax && <><br />F: {f.fax}</>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {f.accepted_imaging_types.map(t => (
                      <Badge key={t} variant="secondary" className="text-[9px]">
                        {IMAGING_TYPE_OPTIONS.find(o => o.value === t)?.label || t}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={f.status === 'active' ? 'default' : 'outline'} className="text-[10px]">
                    {f.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {f.custom_form_url ? (
                    <Badge variant="outline" className="text-[9px] text-success">Uploaded</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <label className="ml-2 cursor-pointer">
                    <Upload className="w-3 h-3 inline text-muted-foreground hover:text-foreground" />
                    <input type="file" accept=".pdf" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadForm(f.id, file);
                      e.target.value = '';
                    }} />
                  </label>
                </td>
                <td className="px-4 py-2.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openEdit(f)}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                {isLoading ? 'Loading...' : 'No imaging facilities found'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Facility' : 'Add Imaging Facility'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm">Facility Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">State *</Label>
                <Select value={form.state} onValueChange={v => setForm(p => ({ ...p, state: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">City *</Label>
                <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="h-9" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm">Address</Label>
                <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Fax</Label>
                <Input value={form.fax} onChange={e => setForm(p => ({ ...p, fax: e.target.value }))} className="h-9" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Accepted Imaging Types</Label>
              <div className="flex flex-wrap gap-3">
                {IMAGING_TYPE_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={form.accepted_imaging_types.includes(opt.value)}
                      onCheckedChange={v => {
                        if (v) setForm(p => ({ ...p, accepted_imaging_types: [...p.accepted_imaging_types, opt.value] }));
                        else setForm(p => ({ ...p, accepted_imaging_types: p.accepted_imaging_types.filter(t => t !== opt.value) }));
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={form.is_preferred} onCheckedChange={v => setForm(p => ({ ...p, is_preferred: !!v }))} />
                Preferred facility
              </label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Internal Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g., fast turnaround, preferred facility..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate(editing ? { ...form, id: editing.id } : form)}
                disabled={!form.name || !form.state || !form.city || saveMutation.isPending}
              >
                {editing ? 'Update' : 'Add'} Facility
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
