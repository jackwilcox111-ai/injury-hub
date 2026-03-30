import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'Intake', label: 'In Intake' },
  { key: 'Referrals Sent', label: 'Referral' },
  { key: 'In Treatment', label: 'Treatment' },
  { key: 'Records Pending', label: 'Records Pending' },
  { key: 'Demand Prep', label: 'Demand Prep' },
  { key: 'Settled', label: 'Settled' },
];

interface Props {
  currentStatus: string;
}

export function CaseProgressStepper({ currentStatus }: Props) {
  const currentIndex = STAGES.findIndex(s => s.key === currentStatus);

  return (
    <div className="flex items-center w-full">
      {STAGES.map((stage, i) => {
        const isCompleted = currentIndex > i;
        const isCurrent = currentIndex === i;
        const isPending = currentIndex < i;

        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            {/* Step */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-card',
                  isPending && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap transition-colors',
                  isCompleted && 'text-primary',
                  isCurrent && 'text-foreground font-semibold',
                  isPending && 'text-muted-foreground'
                )}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 rounded-full transition-colors',
                  currentIndex > i ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
