import { Check } from 'lucide-react';

const STEPS = [
  'Submitted', 'Under Review', 'In Marketplace', 'Accepted', 'In Treatment', 'Demand Prep', 'Settled'
];

const STATUS_MAP: Record<string, number> = {
  'Pending Review': 0, 'Marketplace': 2, 'Intake': 3, 'In Treatment': 4,
  'Records Pending': 4, 'Demand Prep': 5, 'Settled': 6, 'Rejected': -1,
};

interface Props { status: string; }

export function MarketerStatusTimeline({ status }: Props) {
  const currentIndex = STATUS_MAP[status] ?? 0;

  if (status === 'Rejected') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <span className="text-sm font-medium text-destructive">Case Rejected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STEPS.map((step, i) => {
        const completed = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center gap-1 shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
              completed ? 'bg-success text-success-foreground' :
              active ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {step}
            </span>
            {i < STEPS.length - 1 && <div className={`w-4 h-px ${completed ? 'bg-success' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
}
