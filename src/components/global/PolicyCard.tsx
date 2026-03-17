import { AlertTriangle, Phone } from 'lucide-react';

interface PolicyData {
  insurance_carrier?: string | null;
  claim_number?: string | null;
  adjuster_name?: string | null;
  adjuster_phone?: string | null;
  policy_limit_bodily_injury?: number | null;
  coverage_disputed?: boolean | null;
}

interface PolicyCardProps {
  policy: PolicyData;
  show?: boolean;
}

export function PolicyCard({ policy, show = true }: PolicyCardProps) {
  if (!show) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Policy & Coverage</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Carrier</span>
          <span className="font-medium text-foreground">{policy.insurance_carrier || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Claim #</span>
          <span className="font-mono text-xs text-foreground">{policy.claim_number || '—'}</span>
        </div>
        {policy.adjuster_name && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Adjuster</span>
            <div className="flex items-center gap-2">
              <span className="text-foreground">{policy.adjuster_name}</span>
              {policy.adjuster_phone && (
                <a href={`tel:${policy.adjuster_phone}`} className="text-primary hover:underline">
                  <Phone className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
        {policy.policy_limit_bodily_injury != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Policy Limit (BI)</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              ${policy.policy_limit_bodily_injury.toLocaleString()}
            </span>
          </div>
        )}
        {policy.coverage_disputed && (
          <div className="flex items-center gap-1.5 text-amber-600 text-xs bg-amber-50 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-medium">Coverage Disputed</span>
          </div>
        )}
      </div>
    </div>
  );
}
