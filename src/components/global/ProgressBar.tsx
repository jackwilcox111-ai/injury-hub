interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDone = completed === total && total > 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
        {completed}/{total}
      </span>
    </div>
  );
}
