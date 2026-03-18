-- TABLE: marketer_applications
create table if not exists marketer_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text,
  email text not null,
  phone text not null,
  marketing_channels text[] not null default '{}',
  geographic_focus text[] not null default '{}',
  pi_experience boolean default false,
  experience_detail text,
  tos_agreed boolean default false,
  tos_agreed_at timestamptz,
  status text not null default 'Pending',
  notes text,
  created_at timestamptz default now()
);

alter table marketer_applications enable row level security;
create policy "marketer_apps_admin" on marketer_applications
  for all using (public.get_user_role(auth.uid()) = 'admin');
create policy "marketer_apps_anon_insert" on marketer_applications
  for insert to anon with check (true);

-- TABLE: marketer_profiles
create table if not exists marketer_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  company_name text,
  marketing_channels text[] not null default '{}',
  geographic_focus text[] not null default '{}',
  pi_experience boolean default false,
  active boolean default true,
  flagged boolean default false,
  flag_reason text,
  payout_method text,
  payout_details jsonb,
  created_at timestamptz default now()
);

alter table marketer_profiles enable row level security;
create policy "marketer_profiles_own" on marketer_profiles
  for all using (profile_id = auth.uid());
create policy "marketer_profiles_admin" on marketer_profiles
  for all using (public.get_user_role(auth.uid()) = 'admin');

-- Add marketer fields to cases table
alter table cases add column if not exists marketer_id uuid references marketer_profiles(id) on delete set null;
alter table cases add column if not exists marketplace_submitted_at timestamptz;
alter table cases add column if not exists marketplace_accepted_at timestamptz;
alter table cases add column if not exists completeness_score integer default 0;
alter table cases add column if not exists quality_gate_passed boolean default false;
alter table cases add column if not exists marketer_consent_signed boolean default false;
alter table cases add column if not exists marketer_consent_signed_at timestamptz;

-- TABLE: marketer_payouts
create table if not exists marketer_payouts (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references marketer_profiles(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  trigger_event text not null,
  amount numeric(10,2) not null,
  status text not null default 'Pending',
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  notes text,
  created_at timestamptz default now()
);

alter table marketer_payouts enable row level security;
create policy "payouts_admin" on marketer_payouts
  for all using (public.get_user_role(auth.uid()) = 'admin');
create policy "payouts_marketer_own" on marketer_payouts
  for select using (
    marketer_id = (select id from marketer_profiles where profile_id = auth.uid())
    and public.get_user_role(auth.uid()) = 'marketer'
  );

-- TABLE: fee_structures
create table if not exists fee_structures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_event text not null,
  amount numeric(10,2) not null,
  is_percentage boolean default false,
  applies_to text not null default 'All',
  marketer_id uuid references marketer_profiles(id) on delete cascade,
  active boolean default true,
  created_at timestamptz default now()
);

alter table fee_structures enable row level security;
create policy "fee_structures_admin" on fee_structures
  for all using (public.get_user_role(auth.uid()) = 'admin');

-- RLS: marketer sees only their submitted cases
create policy "cases_marketer_own" on cases
  for select using (
    marketer_id = (select id from marketer_profiles where profile_id = auth.uid())
    and public.get_user_role(auth.uid()) = 'marketer'
  );

-- RLS: attorney marketplace view
create policy "cases_attorney_marketplace" on cases
  for select using (
    status = 'Marketplace'
    and quality_gate_passed = true
    and public.get_user_role(auth.uid()) = 'attorney'
  );

-- Seed default fee structure
insert into fee_structures (name, trigger_event, amount, applies_to)
values ('Standard Case Accepted Fee', 'Case Accepted', 500.00, 'All');
