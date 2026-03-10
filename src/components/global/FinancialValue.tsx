import { useAuth } from '@/contexts/AuthContext';

interface FinancialValueProps {
  value: number | null | undefined;
  colorClass?: string;
}

export function FinancialValue({ value, colorClass = 'text-success' }: FinancialValueProps) {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') return null;

  if (value == null) return <span className="font-mono text-muted-foreground">—</span>;

  return (
    <span className={`font-mono text-sm ${colorClass}`}>
      ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}
