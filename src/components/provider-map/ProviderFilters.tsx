import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SPECIALTIES } from '@/lib/specialties';

const RADIUS_OPTIONS = [5, 10, 25, 50];
const LANGUAGES = ['English', 'Spanish', 'Creole', 'Portuguese'];

export interface FilterState {
  search: string;
  specialties: string[];
  radius: number;
  acceptingOnly: boolean;
  languages: string[];
}

interface Props {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  hasLocation: boolean;
}

export function ProviderFilters({ filters, onFiltersChange, hasLocation }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const update = (partial: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const toggleSpecialty = (s: string) => {
    const next = filters.specialties.includes(s)
      ? filters.specialties.filter(x => x !== s)
      : [...filters.specialties, s];
    update({ specialties: next });
  };

  const toggleLanguage = (l: string) => {
    const next = filters.languages.includes(l)
      ? filters.languages.filter(x => x !== l)
      : [...filters.languages, l];
    update({ languages: next });
  };

  const clearAll = () => {
    onFiltersChange({
      search: '',
      specialties: [],
      radius: 25,
      acceptingOnly: true,
      languages: [],
    });
  };

  const hasActiveFilters = filters.specialties.length > 0 || !filters.acceptingOnly || filters.languages.length > 0 || filters.radius !== 25;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by zip code, city, or provider name"
          value={filters.search}
          onChange={e => update({ search: e.target.value })}
          className="pl-10 h-11 text-sm bg-background"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Toggle filters */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="text-xs gap-1.5 text-muted-foreground"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="border border-border rounded-xl p-4 space-y-4 bg-card">
          {/* Specialty */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Specialty</p>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map(s => (
                <Badge
                  key={s}
                  variant={filters.specialties.includes(s) ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px] transition-colors"
                  onClick={() => toggleSpecialty(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {/* Radius */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">
              Radius {!hasLocation && <span className="text-muted-foreground font-normal">(enter location first)</span>}
            </p>
            <Select
              value={String(filters.radius)}
              onValueChange={v => update({ radius: Number(v) })}
              disabled={!hasLocation}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map(r => (
                  <SelectItem key={r} value={String(r)} className="text-xs">{r} mi</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Accepting */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Accepting New Patients</p>
            <Switch
              checked={filters.acceptingOnly}
              onCheckedChange={v => update({ acceptingOnly: v })}
            />
          </div>

          {/* Languages */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Language</p>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map(l => (
                <Badge
                  key={l}
                  variant={filters.languages.includes(l) ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px] transition-colors"
                  onClick={() => toggleLanguage(l)}
                >
                  {l}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
