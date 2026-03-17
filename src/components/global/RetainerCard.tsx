import { CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface RetainerCardProps {
  retainerSigned?: boolean | null;
  retainerDate?: string | null;
  feePercent?: number | null;
  show?: boolean;
}

export function RetainerCard({ retainerSigned, retainerDate, feePercent, show = true }: RetainerCardProps) {
  if (!show) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Retainer Status</h4>
      <div className="flex items-center gap-3">
        {retainerSigned ? (
          <>
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-600">Signed</p>
              {retainerDate && <p className="text-xs text-muted-foreground">{format(new Date(retainerDate), 'MMM d, yyyy')}</p>}
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <p className="text-sm font-semibold text-amber-600">Not Signed</p>
          </>
        )}
      </div>
      {feePercent != null && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Attorney Fee</span>
          <span className="font-mono font-medium text-foreground">{feePercent}%</span>
        </div>
      )}
    </div>
  );
}
