import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ColossusScoreBadge({ score }: { score: number }) {
  const label = score <= 40 ? 'Low' : score <= 70 ? 'Moderate' : 'Strong';
  const color = score <= 40
    ? 'bg-red-100 text-red-700 border-red-200'
    : score <= 70
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
          {score} — {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        GHIN case strength estimate based on injury factors and documentation completeness
      </TooltipContent>
    </Tooltip>
  );
}
