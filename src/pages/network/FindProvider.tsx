import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ProviderMapView, ProviderMapHandle } from '@/components/provider-map/ProviderMap';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Phone, Navigation, ExternalLink, SlidersHorizontal, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getSpecialtyColor, SPECIALTIES } from '@/lib/specialties';

const LANGUAGES = ['English', 'Spanish', 'Creole', 'Portuguese'];
const PAGE_SIZE = 20;

interface ProviderData {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  languages_spoken: string[];
  rating: number | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  accepting_patients: boolean | null;
  logo_url: string | null;
  website_url: string | null;
}

export default function FindProvider() {
  const [search, setSearch] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [acceptingOnly, setAcceptingOnly] = useState(true);
  const [languages, setLanguages] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'specialty'>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const mapRef = useRef<ProviderMapHandle>(null);

  const handleSelectProvider = useCallback((id: string) => {
    setActiveId(id);
    const p = (providers || []).find(x => x.id === id);
    if (p?.latitude && p?.longitude) {
      mapRef.current?.flyTo(p.latitude, p.longitude);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [providers]);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['provider-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('id, name, specialty, phone, languages_spoken, rating, address_street, address_city, address_state, address_zip, latitude, longitude, accepting_patients, logo_url, website_url')
        .eq('status', 'Active')
        .eq('listed_on_map', true);
      if (error) throw error;
      return (data || []) as ProviderData[];
    },
  });

  const filtered = useMemo(() => {
    let result = [...(providers || [])];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.specialty && p.specialty.toLowerCase().includes(q)) ||
        (p.address_city && p.address_city.toLowerCase().includes(q)) ||
        (p.address_zip && p.address_zip.includes(q))
      );
    }
    if (specialties.length > 0) {
      result = result.filter(p =>
        p.specialty && specialties.some(s => p.specialty!.toLowerCase().includes(s.toLowerCase()))
      );
    }
    if (acceptingOnly) {
      result = result.filter(p => p.accepting_patients !== false);
    }
    if (languages.length > 0) {
      result = result.filter(p =>
        p.languages_spoken && languages.some(l => p.languages_spoken.includes(l))
      );
    }
    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'specialty') result.sort((a, b) => (a.specialty || '').localeCompare(b.specialty || ''));
    return result;
  }, [providers, search, specialties, acceptingOnly, languages, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const hasActiveFilters = specialties.length > 0 || !acceptingOnly || languages.length > 0;

  const clearAll = () => {
    setSearch('');
    setSpecialties([]);
    setAcceptingOnly(true);
    setLanguages([]);
  };

  const toggleSpecialty = (s: string) =>
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleLanguage = (l: string) =>
    setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  return (
    <PublicLayout>
      <Helmet>
        <title>Find a Personal Injury Doctor Near You | Got Hurt Injury Network</title>
        <meta name="description" content="Search our network of medical providers offering lien-based personal injury care. No upfront costs. Orthopedics, chiropractic, pain management, and more." />
        <link rel="canonical" href={`${window.location.origin}/find-providers`} />
      </Helmet>

      {/* Header */}
      <section className="bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-4">
            Find a Provider in Our Network
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Search our network of medical providers specializing in personal injury care.
            All providers accept lien-based treatment — no upfront cost to patients.
          </p>
        </div>
      </section>

      {/* Map */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 mb-6">
        <ProviderMapView
          providers={filtered}
          activeId={activeId}
          onSelectProvider={handleSelectProvider}
        />
      </section>

      {/* Search & Filters */}
      <section className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, zip, or specialty"
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
              className="pl-10 h-11 text-sm bg-background"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="text-xs gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">Clear Filters</Button>
            )}
          </div>

          {filtersOpen && (
            <div className="border border-border rounded-xl p-4 space-y-4 bg-card">
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Specialty</p>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTIES.map(s => (
                    <Badge key={s} variant={specialties.includes(s) ? 'default' : 'outline'} className="cursor-pointer text-[10px]" onClick={() => toggleSpecialty(s)}>
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">Accepting New Patients</p>
                <Switch checked={acceptingOnly} onCheckedChange={setAcceptingOnly} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Language</p>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map(l => (
                    <Badge key={l} variant={languages.includes(l) ? 'default' : 'outline'} className="cursor-pointer text-[10px]" onClick={() => toggleLanguage(l)}>
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sort + count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">
            {filtered.length} provider{filtered.length !== 1 ? 's' : ''} found
          </p>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name" className="text-xs">Name A-Z</SelectItem>
              <SelectItem value="specialty" className="text-xs">Specialty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Provider grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-16">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 space-y-3">
              <p className="text-sm text-muted-foreground">No providers found matching your criteria.</p>
              <Button variant="outline" size="sm" onClick={clearAll} className="text-xs">Reset Filters</Button>
            </div>
          ) : (
            <>
              {visible.map(p => {
                const address = [p.address_street, p.address_city, p.address_state, p.address_zip].filter(Boolean).join(', ');
                const color = getSpecialtyColor(p.specialty);
                const accepting = p.accepting_patients !== false;
                const directionsUrl = address
                  ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                  : null;

                return (
                  <div key={p.id} className="border border-border rounded-xl p-4 bg-card hover:shadow-md transition-shadow space-y-3">
                    <div>
                      <h3 className="font-display font-semibold text-sm text-foreground">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {p.specialty && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                            {p.specialty}
                          </span>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${accepting ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>
                          {accepting ? 'Accepting Patients' : 'Not Accepting'}
                        </Badge>
                      </div>
                    </div>

                    {address && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{address}</span>
                      </div>
                    )}

                    {p.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 shrink-0" />
                        <a href={`tel:${p.phone}`} className="hover:text-foreground">{p.phone}</a>
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      {directionsUrl && (
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                          <Navigation className="w-3 h-3" /> Directions
                        </a>
                      )}
                      {p.website_url && (
                        <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" /> Website
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {visibleCount < filtered.length && (
                <div className="col-span-full text-center pt-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
                    Load More ({filtered.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}