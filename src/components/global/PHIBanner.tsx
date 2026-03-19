import { ShieldCheck } from 'lucide-react';

interface PHIBannerProps {
  compact?: boolean;
}

export function PHIBanner({ compact = false }: PHIBannerProps) {
  if (compact) {
    return (
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
        PHI — Handle in accordance with HIPAA policy
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Protected Health Information.</span>{' '}
        This screen contains PHI subject to HIPAA regulations. Do not share or screenshot.
      </p>
    </div>
  );
}
