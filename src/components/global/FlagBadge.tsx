const flagConfig: Record<string, { label: string; className: string }> = {
  noshow: { label: '⚠ No-Show Risk', className: 'text-destructive' },
  records: { label: '📋 Records Due', className: 'text-warning' },
  urgent: { label: '🔴 Urgent', className: 'text-destructive' },
};

export function FlagBadge({ flag }: { flag: string | null | undefined }) {
  if (!flag) return null;
  const config = flagConfig[flag];
  if (!config) return null;
  return <span className={`text-xs font-medium ${config.className}`}>{config.label}</span>;
}
