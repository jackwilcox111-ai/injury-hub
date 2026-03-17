
-- Add languages_spoken to providers
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS languages_spoken text[] NOT NULL DEFAULT '{English}';

-- Add languages_spoken to attorneys
ALTER TABLE public.attorneys
  ADD COLUMN IF NOT EXISTS languages_spoken text[] NOT NULL DEFAULT '{English}';
