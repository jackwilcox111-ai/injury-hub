
-- Add document_id to records table to link each record to its uploaded document
ALTER TABLE public.records ADD COLUMN document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_records_document_id ON public.records(document_id);
