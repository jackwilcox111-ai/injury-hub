ALTER TABLE public.documents DROP CONSTRAINT documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check CHECK (document_type = ANY (ARRAY[
  'HIPAA Authorization','Assignment of Benefits','Lien Agreement','Letter of Protection',
  'Medical Record','Demand Package','Settlement Agreement','Funding Agreement',
  'Injury Photos','Vehicle Damage','Insurance Card','Police Report',
  'Discharge Summary','Other'
]));