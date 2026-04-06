
ALTER TABLE public.cases
ADD COLUMN initial_appointment_date date,
ADD COLUMN initial_appointment_status text DEFAULT 'Pending';
