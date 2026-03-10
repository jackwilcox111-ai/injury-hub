import { useAuth } from '@/contexts/AuthContext';

interface FinancialValueProps {
  value: number | null | undefined;
  colorClass?: string;
}

export function FinancialValue({ value, colorClass = 'text-emerald-600' }: FinancialValueProps) {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') return null;

  if (value == null) return <span className="font-mono text-sm text-muted-foreground">—</span>;

  return (
    <span className={`font-mono text-sm font-medium tabular-nums ${colorClass}`}>
      ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}
