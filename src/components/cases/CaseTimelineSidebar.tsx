import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { GitBranch } from 'lucide-react';

const DOT_COLORS: Record<string, string> = {
  // Referral events - blue
  'Provider Matched': 'bg-blue-500',
  'Intake': 'bg-blue-500',
  'Care Manager Assigned': 'bg-blue-500',
  // Appointment events - green
  'First Appointment': 'bg-emerald-500',
  'Appointment Completed': 'bg-emerald-500',
  'No-Show': 'bg-red-500',
  // Record/document events - orange
  'Records Requested': 'bg-orange-500',
  'Records Received': 'bg-orange-500',
  'Records Delivered': 'bg-orange-500',
  // Lien/financial events - purple
  'Demand Sent': 'bg-violet-500',
  'Offer Received': 'bg-violet-500',
  'Counter Sent': 'bg-violet-500',
  'Settlement Reached': 'bg-violet-500',
  'Lien Paid': 'bg-violet-500',
  // Status/misc - gray
  'Case Closed': 'bg-muted-foreground',
};

function getDotColor(eventType: string): string {
  return DOT_COLORS[eventType] || 'bg-muted-foreground';
}

interface Props {
  caseId: string;
  onViewFullTimeline: () => void;
}

export function CaseTimelineSidebar({ caseId, onViewFullTimeline }: Props) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('case_timelines')
        .select('*')
        .eq('case_id', caseId)
        .order('event_date', { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Case Timeline</h3>
      </div>

      {isLoading ? (
        <div className="p-5"><Skeleton className="h-60" /></div>
      ) : events && events.length > 0 ? (
        <ScrollArea className="flex-1" style={{ maxHeight: '400px' }}>
          <div className="p-5">
            <div className="relative ml-2 border-l-2 border-border pl-5 space-y-5">
              {events.map(e => (
                <div key={e.id} className="relative">
                  <div className={`absolute -left-[27px] w-2.5 h-2.5 rounded-full ${getDotColor(e.event_type)}`} />
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {format(new Date(e.event_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {e.event_title}
                    </p>
                    {e.event_detail && (
                      <p className="text-[11px] text-muted-foreground">{e.event_detail}</p>
                    )}
                    {e.auto_generated && (
                      <span className="text-[9px] text-muted-foreground">System</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      ) : (
        <div className="p-5 text-center text-sm text-muted-foreground">
          No timeline events yet
        </div>
      )}

      <div className="px-5 py-3 border-t border-border">
        <button
          onClick={onViewFullTimeline}
          className="text-xs text-primary hover:underline font-medium"
        >
          View Full Timeline →
        </button>
      </div>
    </div>
  );
}
