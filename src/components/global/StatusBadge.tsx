const statusStyles: Record<string, string> = {
  'Intake': 'bg-blue-50 text-blue-700 border-blue-200',
  'In Treatment': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Records Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'Demand Prep': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Settled': 'bg-violet-50 text-violet-700 border-violet-200',
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Inactive': 'bg-gray-50 text-gray-500 border-gray-200',
  'Scheduled': 'bg-blue-50 text-blue-700 border-blue-200',
  'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'No-Show': 'bg-red-50 text-red-700 border-red-200',
  'Cancelled': 'bg-gray-50 text-gray-500 border-gray-200',
  'Reduced': 'bg-amber-50 text-amber-700 border-amber-200',
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Waived': 'bg-gray-50 text-gray-500 border-gray-200',
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || 'bg-gray-50 text-gray-500 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${style}`}>
      {status}
    </span>
  );
}
