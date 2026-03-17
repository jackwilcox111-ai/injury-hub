import { StatusBadge } from '@/components/global/StatusBadge';
import { SoLCountdown } from '@/components/global/SoLCountdown';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  cases: any[];
  welcomeMessage?: string | null;
}

export function SimplifiedDashboard({ cases, welcomeMessage }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Your Cases</h2>
      {welcomeMessage && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-foreground">
          {welcomeMessage}
        </div>
      )}
      <div className="grid gap-4">
        {cases.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.patient_name?.split(' ')[0]}</p>
                <StatusBadge status={c.status || ''} />
              </div>
              <SoLCountdown sol_date={c.sol_date} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Visits</span>
              <span className="font-mono font-medium tabular-nums">
                {c.appointments_completed || 0} / {c.appointments_total || 0}
              </span>
            </div>
          </div>
        ))}
        {cases.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No active cases</p>
        )}
      </div>
      <Button variant="outline" className="w-full gap-2">
        <Phone className="w-4 h-4" /> Contact Your Care Manager
      </Button>
    </div>
  );
}
