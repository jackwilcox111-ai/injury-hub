import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { ShoppingBag, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';

export default function AttorneyMarketplace() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acceptCase, setAcceptCase] = useState<any>(null);
  const [conflictCheck, setConflictCheck] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const { data: cases, isLoading } = useQuery({
    queryKey: ['marketplace-cases'],
    queryFn: async () => {
      const { data } = await (supabase.from('marketplace_cases') as any)
        .select('id, case_number, specialty, accident_state, accident_date, notes, completeness_score, status, marketplace_submitted_at')
        .order('marketplace_submitted_at', { ascending: false });
      return data || [];
    },
  });

  const accept = useMutation({
    mutationFn: async (c: any) => {
      // Update case
      await (supabase.from('cases') as any).update({
        status: 'Intake',
        attorney_id: profile!.firm_id,
        marketplace_accepted_at: new Date().toISOString(),
      }).eq('id', c.id);

      await (supabase.from('notifications') as any).insert({
        recipient_id: profile!.id,
        title: 'Case Accepted',
        message: `You have accepted case ${c.case_number}. GHIN care coordination is now active.`,
        link: `/attorney-portal`,
      });

      // Notify admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      const { data: firm } = await supabase.from('attorneys').select('firm_name').eq('id', profile!.firm_id).single();
      if (admins) {
        await (supabase.from('notifications') as any).insert(
          admins.map((a: any) => ({
            recipient_id: a.id,
            title: 'Marketplace Case Accepted',
            message: `Case ${c.case_number} accepted by ${firm?.firm_name || 'an attorney'}.`,
            link: `/cases`,
          }))
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-cases'] });
      setAcceptCase(null);
      setConflictCheck(false);
      toast.success('Case accepted. GHIN care coordination is now active.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sorted = [...(cases || [])].sort((a: any, b: any) => {
    if (sortBy === 'newest') return new Date(b.marketplace_submitted_at).getTime() - new Date(a.marketplace_submitted_at).getTime();
    if (sortBy === 'score') return (b.completeness_score || 0) - (a.completeness_score || 0);
    return 0;
  });

  const scorePill = (score: number) => {
    const cls = score < 60 ? 'bg-destructive/10 text-destructive' : score < 80 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success';
    return <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${cls}`}>{score}</span>;
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-foreground">Case Marketplace</h2>
        <div className="mt-3 p-4 rounded-xl bg-primary/5 border border-primary/15 text-sm text-foreground">
          <Info className="w-4 h-4 text-primary inline mr-2" />
          Browse unrepresented PI cases submitted to the GHIN network. Patient consent is on file. Accepting initiates GHIN care coordination.
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="score">Highest Score</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{sorted.length} cases available</span>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No cases match your filters. Check back soon.</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((c: any) => (
          <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                <span className="font-mono text-xs text-primary">{c.case_number}</span>
                <Badge variant="secondary" className="text-[10px]">{c.specialty || 'PI'}</Badge>
                <Badge variant="outline" className="text-[10px]">{c.accident_state}</Badge>
                {scorePill(c.completeness_score || 0)}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  {expanded === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Details
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => setAcceptCase(c)}>Accept Case</Button>
              </div>
            </div>
            {expanded === c.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-2 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><span className="text-[11px] text-muted-foreground">Accident Date</span><p>{c.accident_date ? format(new Date(c.accident_date), 'MMM d, yyyy') : '—'}</p></div>
                  <div><span className="text-[11px] text-muted-foreground">Score</span><p>{c.completeness_score}</p></div>
                  <div><span className="text-[11px] text-muted-foreground">Consent</span><p className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success" /> On file</p></div>
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-2">{c.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Accept Modal */}
      <Dialog open={!!acceptCase} onOpenChange={v => { if (!v) { setAcceptCase(null); setConflictCheck(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Accept Case</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Case:</span> {acceptCase?.case_number}</p>
              <p><span className="text-muted-foreground">Injury:</span> {acceptCase?.specialty}</p>
              <p><span className="text-muted-foreground">State:</span> {acceptCase?.accident_state}</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={conflictCheck} onCheckedChange={v => setConflictCheck(!!v)} />
              <span className="text-sm">I confirm there is no conflict of interest.</span>
            </label>
            <p className="text-xs text-muted-foreground">GHIN coordinates all medical care. Lien management fees apply per your attorney agreement.</p>
            <Button className="w-full" disabled={!conflictCheck || accept.isPending} onClick={() => accept.mutate(acceptCase)}>
              {accept.isPending ? 'Accepting...' : 'Confirm & Accept'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
