
-- Add NPI field to providers
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS npi text;

-- Create case_documents table
CREATE TABLE public.case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('referral_letter', 'imaging_requisition', 'work_treatment_note')),
  receiving_provider_id uuid REFERENCES public.providers(id),
  referring_provider_id uuid REFERENCES public.providers(id),
  generated_by uuid REFERENCES public.profiles(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  additional_notes text,
  merge_data jsonb DEFAULT '{}',
  file_path text,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- Admin and care_manager: full access
CREATE POLICY "Staff can manage case documents"
  ON public.case_documents
  FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'care_manager'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'care_manager'));

-- Attorneys: read-only on their cases
CREATE POLICY "Attorneys can view their case documents"
  ON public.case_documents
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'attorney'
    AND case_id IN (
      SELECT c.id FROM cases c
      WHERE c.attorney_id = public.get_user_firm_id(auth.uid())
    )
  );
