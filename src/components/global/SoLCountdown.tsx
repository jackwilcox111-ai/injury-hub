import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface SoLCountdownProps {
  sol_date: string | null;
  sol_period_days?: number | null;
  accident_state?: string | null;
}

export function SoLCountdown({ sol_date, sol_period_days, accident_state }: SoLCountdownProps) {
  if (!sol_date) return <span className="font-mono text-muted-foreground">—</span>;

  const days = Math.ceil((new Date(sol_date).getTime() - Date.now()) / 86400000);
  const colorClass = days > 365 ? 'text-success' : days >= 180 ? 'text-warning' : 'text-destructive';
  const formatted = format(new Date(sol_date), 'MMM d, yyyy');
  const tooltip = `${formatted}${accident_state ? ` · ${accident_state}` : ''}${sol_period_days ? ` · ${sol_period_days}d` : ''}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`font-mono text-sm font-medium ${colorClass} cursor-default`}>
          {days}d
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
