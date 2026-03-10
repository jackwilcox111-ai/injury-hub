const statusStyles: Record<string, string> = {
  'Intake': 'bg-primary/20 text-primary border-primary/30',
  'In Treatment': 'bg-success/20 text-success border-success/30',
  'Records Pending': 'bg-warning/20 text-warning border-warning/30',
  'Demand Prep': 'bg-primary/20 text-primary border-primary/30',
  'Settled': 'bg-settled/20 text-settled border-settled/30',
  'Active': 'bg-success/20 text-success border-success/30',
  'Inactive': 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30',
  'Scheduled': 'bg-primary/20 text-primary border-primary/30',
  'Completed': 'bg-success/20 text-success border-success/30',
  'No-Show': 'bg-destructive/20 text-destructive border-destructive/30',
  'Cancelled': 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30',
  'Reduced': 'bg-warning/20 text-warning border-warning/30',
  'Paid': 'bg-success/20 text-success border-success/30',
  'Waived': 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30',
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${style}`}>
      {status}
    </span>
  );
}
