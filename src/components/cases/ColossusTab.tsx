import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColossusScoreBadge } from '@/components/global/ColossusScoreBadge';
import { calculateColossusScore, colossusRange, type ColossusFactors } from '@/lib/colossus-score';
import { toast } from 'sonner';

const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'Severe', 'Catastrophic'];
const LIABILITIES = ['Clear', 'Disputed', 'Weak'];

export function ColossusTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: colossus, isLoading } = useQuery({
    queryKey: ['colossus', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('insurance_colossus_data').select('*').eq('case_id', caseId).maybeSingle();
      return data;
    },
  });

  // Auto-fill from case data
  const { data: caseCharges } = useQuery({
    queryKey: ['colossus-charges', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('charges').select('charge_amount').eq('case_id', caseId);
      return data || [];
    },
  });

  const { data: caseAppts } = useQuery({
    queryKey: ['colossus-appts', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('appointments').select('scheduled_date, specialty').eq('case_id', caseId).order('scheduled_date');
      return data || [];
    },
  });

  const { data: policyData } = useQuery({
    queryKey: ['colossus-policy', caseId],
    queryFn: async () => {
      const { data } = await supabase.from('policy_details').select('policy_limit_bodily_injury').eq('case_id', caseId).maybeSingle();
      return data;
    },
  });

  const autoSpecials = useMemo(() => caseCharges?.reduce((sum, c) => sum + (c.charge_amount || 0), 0) || 0, [caseCharges]);
  const autoSpecialties = useMemo(() => new Set(caseAppts?.map(a => a.specialty).filter(Boolean)).size, [caseAppts]);
  const autoDuration = useMemo(() => {
    if (!caseAppts || caseAppts.length < 2) return 0;
    const dates = caseAppts.filter(a => a.scheduled_date).map(a => new Date(a.scheduled_date!).getTime());
    return Math.round((Math.max(...dates) - Math.min(...dates)) / 86400000);
  }, [caseAppts]);
  const autoImaging = useMemo(() => caseAppts?.some(a => a.specialty?.toLowerCase().includes('imaging') || a.specialty?.toLowerCase().includes('mri')), [caseAppts]);

  useEffect(() => {
    if (colossus) setForm(colossus);
    else setForm({
      case_id: caseId,
      total_medical_specials: autoSpecials,
      specialty_count: autoSpecialties,
      treatment_duration_days: autoDuration,
      imaging_performed: autoImaging || false,
      policy_limit: policyData?.policy_limit_bodily_injury || null,
    });
  }, [colossus, caseId, autoSpecials, autoSpecialties, autoDuration, autoImaging, policyData]);

  const score = calculateColossusScore(form as ColossusFactors);
  const specials = form.total_medical_specials || 0;
  const range = colossusRange(specials, score, form.policy_limit);

  const save = useMutation({
    mutationFn: async () => {
      const { low, high } = colossusRange(form.total_medical_specials || 0, score, form.policy_limit);
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = form;
      const payload = { ...rest, case_id: caseId, estimated_colossus_range_low: low, estimated_colossus_range_high: high };
      if (colossus?.id) {
        const { error } = await supabase.from('insurance_colossus_data').update(payload).eq('id', colossus.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('insurance_colossus_data').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['colossus', caseId] }); toast.success('Colossus data saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const f = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  // Recommendations
  const recs: string[] = [];
  if (!form.imaging_performed) recs.push('Order MRI or X-Ray — imaging significantly increases settlement value');
  if (!form.permanent_impairment) recs.push('Refer for impairment rating evaluation');
  if ((form.treatment_duration_days || 0) < 90) recs.push('Ensure treatment is complete before demand — shorter treatment windows reduce scores');
  if (form.liability_strength === 'Disputed') recs.push('Gather additional liability documentation (police report, witness statements)');
  if (!form.lost_wages_claimed) recs.push('Verify whether patient missed work — lost wages increase total demand');

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Insurance Valuation Intelligence</h3>
        <p className="text-[10px] text-muted-foreground">Structure treatment documentation and demands to maximize settlement outcomes.</p>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Injury Severity</Label>
            <Select value={form.injury_severity || ''} onValueChange={v => f('injury_severity', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label className="text-xs">Treatment Duration (days)</Label><Input type="number" value={form.treatment_duration_days ?? ''} onChange={e => f('treatment_duration_days', parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label className="text-xs">Medical Specials ($)</Label><Input type="number" step="0.01" value={form.total_medical_specials ?? ''} onChange={e => f('total_medical_specials', parseFloat(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label className="text-xs">Specialty Count</Label><Input type="number" value={form.specialty_count ?? ''} onChange={e => f('specialty_count', parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label className="text-xs">Policy Limit ($)</Label><Input type="number" step="0.01" value={form.policy_limit ?? ''} onChange={e => f('policy_limit', e.target.value ? parseFloat(e.target.value) : null)} /></div>
          </div>

          <div className="space-y-2">
            {[
              { key: 'imaging_performed', label: 'Imaging Performed' },
              { key: 'surgery_performed', label: 'Surgery Performed' },
              { key: 'pre_existing_conditions', label: 'Pre-Existing Conditions' },
              { key: 'lost_wages_claimed', label: 'Lost Wages Claimed' },
              { key: 'permanent_impairment', label: 'Permanent Impairment' },
            ].map(t => (
              <div key={t.key} className="flex items-center gap-2">
                <Switch checked={form[t.key] || false} onCheckedChange={v => f(t.key, v)} />
                <Label className="text-xs">{t.label}</Label>
              </div>
            ))}
          </div>

          {form.permanent_impairment && (
            <div className="space-y-2"><Label className="text-xs">Impairment Rating %</Label><Input type="number" min={0} max={100} value={form.impairment_rating_percent ?? ''} onChange={e => f('impairment_rating_percent', parseInt(e.target.value) || 0)} /></div>
          )}
          {form.lost_wages_claimed && (
            <div className="space-y-2"><Label className="text-xs">Lost Wages Amount ($)</Label><Input type="number" step="0.01" value={form.lost_wages_amount ?? ''} onChange={e => f('lost_wages_amount', parseFloat(e.target.value) || 0)} /></div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Liability Strength</Label>
            <Select value={form.liability_strength || ''} onValueChange={v => f('liability_strength', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{LIABILITIES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2"><Label className="text-xs">Pain Duration Description</Label><Textarea value={form.pain_duration_description || ''} onChange={e => f('pain_duration_description', e.target.value)} rows={2} placeholder="Plaintiff reports daily pain..." /></div>
          <div className="space-y-2"><Label className="text-xs">Insurance Carrier</Label><Input value={form.insurance_carrier || ''} onChange={e => f('insurance_carrier', e.target.value)} /></div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">{save.isPending ? 'Saving...' : 'Save Colossus Data'}</Button>
        </div>
      </div>

      {/* Right: Live Scoring */}
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-0">
          <div className="text-center space-y-2">
            <ColossusScoreBadge score={score} />
            <p className="text-3xl font-bold font-mono tabular-nums text-foreground">{score}</p>
            <p className="text-xs text-muted-foreground">Colossus Score</p>
          </div>

          <div className="bg-accent/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Est. Insurance Range</p>
            <p className="font-mono font-semibold text-foreground tabular-nums">
              ${range.low.toLocaleString()} – ${range.high.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Documentation Recommendations</h4>
            {recs.length === 0 ? (
              <p className="text-xs text-emerald-600">All key factors documented ✓</p>
            ) : (
              recs.map((r, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="text-amber-500 shrink-0">→</span>
                  <span className="text-foreground">{r}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
