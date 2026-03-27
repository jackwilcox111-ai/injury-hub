
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.providers(id) NOT NULL,
  referred_by UUID REFERENCES auth.users(id),
  specialty TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update referrals"
  ON public.referrals FOR UPDATE TO authenticated
  USING (true);
