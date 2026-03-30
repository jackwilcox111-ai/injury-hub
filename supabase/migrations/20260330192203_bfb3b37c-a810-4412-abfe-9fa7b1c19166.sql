
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS request_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS urgent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS law_firm_website text,
  ADD COLUMN IF NOT EXISTS case_manager_email text,
  ADD COLUMN IF NOT EXISTS case_manager_phone text;
