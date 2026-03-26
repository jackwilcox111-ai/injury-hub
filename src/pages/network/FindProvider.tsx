import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ProviderFilters, FilterState } from '@/components/provider-map/ProviderFilters';
import { ProviderCard, ProviderMapData } from '@/components/provider-map/ProviderCard';
import { ProviderMapView } from '@/components/provider-map/ProviderMap';
import { geocodeLocation } from '@/lib/geocode';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Map, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const DEFAULT_CENTER: [number, number] = [28.0, -82.45];
const DEFAULT_ZOOM = 10;
const PAGE_SIZE = 20;

export default function FindProvider() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    specialties: [],
    radius: 25,
    acceptingOnly: true,
    languages: [],
  });
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'name' | 'specialty'>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [mobileMapOpen, setMobileMapOpen] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced geocoding
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = filters.search.trim();
    if (!query || query.length < 3) {
      // If no search, check if it looks like clearing
      if (!query) {
        setGeoLocation(null);
        setMapCenter(DEFAULT_CENTER);
        setMapZoom(DEFAULT_ZOOM);
        setSortBy('name');
      }
      return;
    }

    // Only geocode if it looks like a zip or city (not a provider name)
    const isZipOrCity = /^\d{5}$/.test(query) || /^[a-zA-Z\s]{3,}$/.test(query);
    if (isZipOrCity) {
      debounceRef.current = setTimeout(async () => {
        const result = await geocodeLocation(query);
        if (result) {
          setGeoLocation({ lat: result.lat, lng: result.lng });
          setMapCenter([result.lat, result.lng]);
          setMapZoom(12);
          setSortBy('distance');
        }
      }, 300);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters.search]);

  // Fetch providers with radius if we have a location
  const { data: radiusProviders } = useQuery({
    queryKey: ['provider-map-radius', geoLocation?.lat, geoLocation?.lng, filters.radius],
    enabled: !!geoLocation,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('providers_within_radius', {
        search_lat: geoLocation!.lat,
        search_lng: geoLocation!.lng,
        radius_miles: filters.radius,
      });
      if (error) throw error;
      return (data || []) as ProviderMapData[];
    },
  });

  // Fetch all active providers (fallback when no location)
  const { data: allProviders, isLoading } = useQuery({
    queryKey: ['provider-map-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('id, name, specialty, phone, languages_spoken, rating, address_street, address_city, address_state, address_zip, latitude, longitude, accepting_patients, logo_url, website_url')
        .eq('status', 'Active')
        .eq('listed_on_map', true);
      if (error) throw error;
      return (data || []) as ProviderMapData[];
    },
  });

  const baseProviders = geoLocation ? (radiusProviders || []) : (allProviders || []);

  // Apply client-side filters
  const filteredProviders = useMemo(() => {
    let result = [...baseProviders];

    // Text search (provider name)
    const q = filters.search.trim().toLowerCase();
    if (q && !/^\d{5}$/.test(q) && !/^[a-zA-Z\s]{3,}$/.test(q)) {
      // Looks like a provider name search
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.specialty && p.specialty.toLowerCase().includes(q))
      );
    }

    // Specialty filter
    if (filters.specialties.length > 0) {
      result = result.filter(p =>
        p.specialty && filters.specialties.some(s =>
          p.specialty!.toLowerCase().includes(s.toLowerCase())
        )
      );
    }

    // Accepting only
    if (filters.acceptingOnly) {
      result = result.filter(p => p.accepting_patients !== false);
    }

    // Languages
    if (filters.languages.length > 0) {
      result = result.filter(p =>
        p.languages_spoken && filters.languages.some(l =>
          p.languages_spoken.includes(l)
        )
      );
    }

    // Sort
    if (sortBy === 'distance' && geoLocation) {
      result.sort((a, b) => (a.distance_miles || 9999) - (b.distance_miles || 9999));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'specialty') {
      result.sort((a, b) => (a.specialty || '').localeCompare(b.specialty || ''));
    }

    return result;
  }, [baseProviders, filters, sortBy, geoLocation]);

  const visibleProviders = filteredProviders.slice(0, visibleCount);

  const handleSelectProvider = useCallback((id: string) => {
    setActiveId(id);
    const p = filteredProviders.find(x => x.id === id);
    if (p?.latitude && p?.longitude) {
      setMapCenter([p.latitude, p.longitude]);
      setMapZoom(14);
    }
  }, [filteredProviders]);

  // JSON-LD structured data
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Got Hurt Injury Network Providers',
    itemListElement: filteredProviders.slice(0, 50).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'MedicalBusiness',
        name: p.name,
        ...(p.phone && { telephone: p.phone }),
        ...(p.address_street && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: p.address_street,
            addressLocality: p.address_city,
            addressRegion: p.address_state,
            postalCode: p.address_zip,
          },
        }),
        ...(p.specialty && { medicalSpecialty: p.specialty }),
      },
    })),
  }), [filteredProviders]);

  return (
    <PublicLayout>
      <Helmet>
        <title>Find a Personal Injury Doctor Near You | Got Hurt Injury Network</title>
        <meta name="description" content="Search our network of medical providers offering lien-based personal injury care. No upfront costs. Orthopedics, chiropractic, pain management, and more." />
        <meta property="og:title" content="Find a Personal Injury Doctor Near You | Got Hurt Injury Network" />
        <meta property="og:description" content="Search our network of medical providers offering lien-based personal injury care. No upfront costs." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${window.location.origin}/find-providers`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Header */}
      <section className="bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-4">
            Find a Provider in Our Network
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Search our network of medical providers specializing in personal injury care.
            All providers accept lien-based treatment — no upfront cost to patients.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left panel */}
          <div className="lg:w-[40%] space-y-4">
            <ProviderFilters
              filters={filters}
              onFiltersChange={setFilters}
              hasLocation={!!geoLocation}
            />

            {/* Sort + count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
              </p>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {geoLocation && <SelectItem value="distance" className="text-xs">Distance</SelectItem>}
                  <SelectItem value="name" className="text-xs">Name A-Z</SelectItem>
                  <SelectItem value="specialty" className="text-xs">Specialty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile map toggle */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={() => setMobileMapOpen(!mobileMapOpen)}
              >
                <Map className="w-3.5 h-3.5" />
                {mobileMapOpen ? 'Hide Map' : 'Show Map'}
                {mobileMapOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              {mobileMapOpen && (
                <div className="mt-3 h-[300px]">
                  <ProviderMapView
                    providers={filteredProviders}
                    center={mapCenter}
                    zoom={mapZoom}
                    activeId={activeId}
                    hoveredId={hoveredId}
                    onSelectProvider={handleSelectProvider}
                  />
                </div>
              )}
            </div>

            {/* Provider cards */}
            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))
              ) : filteredProviders.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-muted-foreground">No providers found matching your criteria.</p>
                  <p className="text-xs text-muted-foreground">Try expanding your search radius or adjusting filters.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ search: '', specialties: [], radius: 25, acceptingOnly: true, languages: [] })}
                    className="text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <>
                  {visibleProviders.map(p => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      isActive={activeId === p.id}
                      onClick={() => handleSelectProvider(p.id)}
                      onHover={(h) => setHoveredId(h ? p.id : null)}
                    />
                  ))}
                  {visibleCount < filteredProviders.length && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    >
                      Load More ({filteredProviders.length - visibleCount} remaining)
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right panel — map (desktop) */}
          <div className="hidden lg:block lg:w-[60%] lg:sticky lg:top-20 lg:h-[calc(100vh-120px)]">
            <ProviderMapView
              providers={filteredProviders}
              center={mapCenter}
              zoom={mapZoom}
              activeId={activeId}
              hoveredId={hoveredId}
              onSelectProvider={handleSelectProvider}
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
