interface CompletenessScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function CompletenessScoreRing({ score, size = 100, label = 'Case Quality Score' }: CompletenessScoreRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  const color = score < 60 ? 'hsl(0 68% 50%)' : score < 80 ? 'hsl(38 88% 50%)' : 'hsl(160 50% 38%)';
  const bgColor = score < 60 ? 'hsl(0 68% 50% / 0.15)' : score < 80 ? 'hsl(38 88% 50% / 0.15)' : 'hsl(160 50% 38% / 0.15)';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute font-display font-bold text-foreground" style={{ fontSize: size * 0.28 }}>
        {score}
      </span>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
