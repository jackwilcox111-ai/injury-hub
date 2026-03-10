import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface SoLCountdownProps {
  sol_date: string | null;
  sol_period_days?: number | null;
  accident_state?: string | null;
}

export function SoLCountdown({ sol_date, sol_period_days, accident_state }: SoLCountdownProps) {
  if (!sol_date) return <span className="font-mono text-sm text-muted-foreground">—</span>;

  const days = Math.ceil((new Date(sol_date).getTime() - Date.now()) / 86400000);
  const colorClass = days > 365
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : days >= 180
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-red-600 bg-red-50 border-red-200';
  const formatted = format(new Date(sol_date), 'MMM d, yyyy');
  const tooltip = `${formatted}${accident_state ? ` · ${accident_state}` : ''}${sol_period_days ? ` · ${sol_period_days}d` : ''}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-default ${colorClass}`}>
          {days}d
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
