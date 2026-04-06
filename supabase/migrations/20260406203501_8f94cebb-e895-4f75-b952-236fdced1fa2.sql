ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS secondary_email text,
  ADD COLUMN IF NOT EXISTS fax text,
  ADD COLUMN IF NOT EXISTS services_offered text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS extended_hours boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS offers_transportation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS offers_virtual boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS clinic_owner text;