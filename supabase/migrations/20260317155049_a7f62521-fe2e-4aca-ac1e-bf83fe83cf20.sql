
-- Add needs_interpreter to patient_profiles
ALTER TABLE public.patient_profiles
  ADD COLUMN IF NOT EXISTS needs_interpreter boolean NOT NULL DEFAULT false;

-- Add interpreter_available to providers
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS interpreter_available boolean NOT NULL DEFAULT false;

-- Add interpreter_confirmed to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS interpreter_confirmed boolean NOT NULL DEFAULT false;
