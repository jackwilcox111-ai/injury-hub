import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Phone } from 'lucide-react';
import { differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { FlagBadge } from '@/components/global/FlagBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const KANBAN_STATUSES = [
  { key: 'Intake', label: 'Intake' },
  { key: 'Treatment Referrals Sent', label: 'Referrals Sent' },
  { key: 'In Treatment', label: 'In Treatment' },
  { key: 'Records Pending', label: 'Records Pending' },
  { key: 'Demand Prep', label: 'Demand Prep' },
];

type SortField = 'patient_name' | 'updated_at' | 'lien_amount' | 'sol_date' | 'case_number' | 'attorney';
type SortDir = 'asc' | 'desc';

interface CasePipelineProps {
  cases: any[];
  isAdmin: boolean;
}

export function CasePipeline({ cases, isAdmin }: CasePipelineProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const now = new Date();

  const filtered = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(c =>
      c.patient_name?.toLowerCase().includes(q) ||
      c.case_number?.toLowerCase().includes(q) ||
      (c as any).attorneys?.firm_name?.toLowerCase().includes(q) ||
      c.patient_phone?.includes(q)
    );
  }, [cases, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any = sortField === 'attorney' ? (a as any).attorneys?.firm_name : a[sortField];
      let bVal: any = sortField === 'attorney' ? (b as any).attorneys?.firm_name : b[sortField];
      if (sortField === 'updated_at' || sortField === 'sol_date') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filtered, sortField, sortDir]);

  const casesByStatus = useMemo(() => {
    const map: Record<string, typeof sorted> = {};
    for (const col of KANBAN_STATUSES) {
      map[col.key] = sorted.filter(c => c.status === col.key);
    }
    return map;
  }, [sorted]);

  const toggleDir = () => setSortDir(d => d === 'asc' ? 'desc' : 'asc');

  const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'patient_name', label: 'Patient Name' },
    { value: 'case_number', label: 'Case Number' },
    { value: 'lien_amount', label: 'Lien Amount' },
    { value: 'sol_date', label: 'SoL Date' },
    { value: 'attorney', label: 'Attorney' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      {/* Header with search + sort */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">Case Pipeline</h3>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cases..."
              className="pl-8 h-8 w-52 text-xs"
            />
          </div>
          <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={toggleDir}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-accent transition-colors"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-5 min-w-[950px] divide-x divide-border">
          {KANBAN_STATUSES.map(col => {
            const columnCases = casesByStatus[col.key] || [];
            return (
              <div key={col.key} className="flex flex-col">
                <div className="px-3 py-2.5 border-b border-border bg-accent/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                    <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                      {columnCases.length}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-2">
                  {columnCases.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-[11px] text-muted-foreground">No cases</p>
                    </div>
                  )}
                  {columnCases.map(c => {
                    const solDays = c.sol_date ? differenceInCalendarDays(new Date(c.sol_date), now) : null;
                    const isUrgentSol = solDays !== null && solDays > 0 && solDays <= 180;
                    return (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className={`group rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                          isUrgentSol ? 'border-orange-200 bg-orange-50/40 hover:border-orange-300' :
                          c.flag ? 'border-red-200 bg-red-50/30 hover:border-red-300' :
                          'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="font-mono text-[10px] text-primary font-medium leading-none">{c.case_number}</span>
                          {c.flag && <FlagBadge flag={c.flag} />}
                        </div>
                        <p className="text-xs font-medium text-foreground leading-tight mb-1 truncate">{c.patient_name}</p>
                        {c.patient_phone && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                            <Phone className="w-2.5 h-2.5" />{c.patient_phone}
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate mb-2">
                          {(c as any).attorneys?.firm_name || 'No attorney'}
                        </p>
                        <div className="flex items-center justify-between gap-1">
                          {isAdmin && (
                            <span className="text-[10px] font-mono text-emerald-600 tabular-nums">
                              ${(c.lien_amount || 0).toLocaleString()}
                            </span>
                          )}
                          {isUrgentSol && (
                            <span className="text-[9px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                              {solDays}d SoL
                            </span>
                          )}
                        </div>
                        {c.updated_at && (
                          <p className="text-[9px] text-muted-foreground mt-1.5">
                            {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
