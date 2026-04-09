ALTER TABLE public.liens
ADD COLUMN lien_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;