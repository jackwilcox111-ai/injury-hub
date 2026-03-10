const flagConfig: Record<string, { label: string; className: string }> = {
  noshow: { label: '⚠ No-Show Risk', className: 'text-red-600 bg-red-50 border-red-200' },
  records: { label: '📋 Records Due', className: 'text-amber-600 bg-amber-50 border-amber-200' },
  urgent: { label: '🔴 Urgent', className: 'text-red-600 bg-red-50 border-red-200' },
};

export function FlagBadge({ flag }: { flag: string | null | undefined }) {
  if (!flag) return null;
  const config = flagConfig[flag];
  if (!config) return null;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${config.className}`}>
      {config.label}
    </span>
  );
}
