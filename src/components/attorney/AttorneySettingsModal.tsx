import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  attorneyId: string;
  firmName: string;
  contactName?: string | null;
  open: boolean;
  onClose: () => void;
}

const TOGGLES = [
  { key: 'show_policy_limits', label: 'Policy Limits & Coverage', desc: 'Show policy limit, adjuster info, claim number' },
  { key: 'show_retainer_status', label: 'Retainer Status', desc: 'Show retainer signed status and fee percentage' },
  { key: 'show_lien_amounts', label: 'Lien Amounts', desc: 'Show individual and total lien amounts' },
  { key: 'show_medical_specials', label: 'Medical Specials', desc: 'Show billing totals and charge breakdown' },
  { key: 'show_demand_letters', label: 'Demand Letters', desc: 'Show finalized demand letters' },
  { key: 'show_video_messages', label: 'Video Messages', desc: 'Show care manager messages' },
  { key: 'show_case_timeline', label: 'Interactive Timeline', desc: 'Show case event timeline' },
  { key: 'show_settlement_worksheet', label: 'Settlement Worksheet', desc: 'Show settlement distribution calculator' },
  { key: 'show_funding_status', label: 'Case Funding Status', desc: 'Show pre-settlement funding details' },
  { key: 'show_provider_details', label: 'Provider Details', desc: 'Show provider name, specialty, contact' },
] as const;

export function AttorneySettingsModal({ attorneyId, firmName, contactName, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({
    update_cadence: 'Weekly',
    simplified_mode: false,
    custom_welcome_message: '',
    ...Object.fromEntries(TOGGLES.map(t => [t.key, true])),
  });

  const { data: settings } = useQuery({
    queryKey: ['atty-settings', attorneyId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('attorney_portal_settings')
        .select('*')
        .eq('attorney_id', attorneyId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        update_cadence: settings.update_cadence || 'Weekly',
        simplified_mode: settings.simplified_mode || false,
        custom_welcome_message: settings.custom_welcome_message || '',
        ...Object.fromEntries(TOGGLES.map(t => [t.key, (settings as any)[t.key] ?? true])),
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { attorney_id: attorneyId, ...form };
      if (settings?.id) {
        const { error } = await supabase.from('attorney_portal_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attorney_portal_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atty-settings'] });
      toast.success('Settings saved');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{firmName}</DialogTitle>
          {contactName && <p className="text-sm text-muted-foreground">{contactName}</p>}
        </DialogHeader>

        <div className="space-y-6">
          {/* Update Cadence */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Cadence</Label>
            <Select value={form.update_cadence} onValueChange={v => setForm(p => ({ ...p, update_cadence: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="On Change">On Change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature Toggles</Label>
            {TOGGLES.map(t => (
              <div key={t.key} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                </div>
                <Switch
                  checked={form[t.key] ?? true}
                  onCheckedChange={v => setForm(p => ({ ...p, [t.key]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Simplified Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interface Mode</Label>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-medium text-foreground">Simplified Mode</p>
                <p className="text-[10px] text-muted-foreground">Minimal view — case list, visits, next step only</p>
              </div>
              <Switch
                checked={form.simplified_mode}
                onCheckedChange={v => setForm(p => ({ ...p, simplified_mode: v }))}
              />
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Welcome Message</Label>
            <Textarea
              value={form.custom_welcome_message}
              onChange={e => setForm(p => ({ ...p, custom_welcome_message: e.target.value }))}
              placeholder="Welcome, Smith & Jones LLP. Your dedicated care manager is Sarah."
              rows={3}
            />
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
            {save.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
