import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortDirection } from '@/hooks/use-sortable-table';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ label, sortKey, currentKey, direction, onSort, className = '' }: SortableHeaderProps) {
  const isActive = currentKey === sortKey && direction != null;

  return (
    <th
      className={`text-left px-5 py-3 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors group ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-primary" />
          ) : (
            <ArrowDown className="w-3 h-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </span>
    </th>
  );
}
