-- Add map/search columns to providers table
ALTER TABLE providers ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS address_state TEXT DEFAULT 'FL';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS accepting_patients BOOLEAN DEFAULT true;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS listed_on_map BOOLEAN DEFAULT true;

-- Indexes for geo queries
CREATE INDEX IF NOT EXISTS idx_providers_geo ON providers (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_providers_zip ON providers (address_zip);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers (status, listed_on_map);

-- RLS policy: allow anonymous users to SELECT active, listed providers
CREATE POLICY "providers_public_map_select" ON providers
  FOR SELECT TO anon
  USING (status = 'Active' AND listed_on_map = true);

-- Radius search RPC function
CREATE OR REPLACE FUNCTION providers_within_radius(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  name text,
  specialty text,
  phone text,
  languages_spoken text[],
  rating numeric,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  latitude double precision,
  longitude double precision,
  accepting_patients boolean,
  logo_url text,
  website_url text,
  distance_miles double precision
) AS $$
  SELECT
    p.id, p.name, p.specialty, p.phone, p.languages_spoken, p.rating,
    p.address_street, p.address_city, p.address_state, p.address_zip,
    p.latitude, p.longitude, p.accepting_patients, p.logo_url, p.website_url,
    (3959 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(search_lat)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(search_lng)) +
        sin(radians(search_lat)) * sin(radians(p.latitude))
      ))
    )) AS distance_miles
  FROM providers p
  WHERE p.status = 'Active'
    AND p.listed_on_map = true
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (
      3959 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(search_lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(search_lng)) +
          sin(radians(search_lat)) * sin(radians(p.latitude))
        ))
      )
    ) <= radius_miles
  ORDER BY distance_miles;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
