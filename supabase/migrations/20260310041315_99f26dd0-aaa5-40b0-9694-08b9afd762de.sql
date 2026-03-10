
-- TABLE: attorneys
create table attorneys (
  id uuid primary key default gen_random_uuid(),
  firm_name text not null,
  contact_name text,
  email text,
  phone text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz default now()
);

-- TABLE: providers
create table providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  locations integer default 1,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  rating numeric(3,1),
  credentialing_expiry date,
  hipaa_baa_on_file boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- TABLE: profiles
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text not null default 'care_manager' check (role in ('admin','care_manager','attorney','provider')),
  firm_id uuid references attorneys(id) on delete set null,
  provider_id uuid references providers(id) on delete set null,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'care_manager')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- TABLE: case_sequence
create table case_sequence (
  year integer primary key,
  last_seq integer not null default 0
);

-- FUNCTION: next_case_number
create or replace function next_case_number()
returns text as $$
declare
  current_year integer := extract(year from now())::integer;
  next_seq integer;
begin
  insert into case_sequence (year, last_seq)
  values (current_year, 1)
  on conflict (year) do update
    set last_seq = case_sequence.last_seq + 1
  returning last_seq into next_seq;
  return 'GHN-' || current_year || '-' || lpad(next_seq::text, 3, '0');
end;
$$ language plpgsql;

-- TABLE: cases
create table cases (
  id uuid primary key default gen_random_uuid(),
  case_number text unique not null default next_case_number(),
  patient_name text not null,
  patient_phone text,
  patient_email text,
  attorney_id uuid references attorneys(id) on delete set null,
  provider_id uuid references providers(id) on delete set null,
  specialty text,
  status text not null default 'Intake' check (status in ('Intake','In Treatment','Records Pending','Demand Prep','Settled')),
  accident_state text,
  accident_date date,
  opened_date date not null default current_date,
  sol_period_days integer not null default 730,
  sol_date date,
  lien_amount numeric(12,2) not null default 0,
  settlement_estimate numeric(12,2),
  settlement_final numeric(12,2),
  flag text check (flag in ('noshow','records','urgent') or flag is null),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TRIGGER: auto-calculate sol_date
create or replace function set_sol_date()
returns trigger as $$
begin
  if new.accident_date is not null then
    new.sol_date := new.accident_date + (new.sol_period_days || ' days')::interval;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger cases_set_sol
  before insert or update of accident_date, sol_period_days on cases
  for each row execute procedure set_sol_date();

-- TRIGGER: auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger cases_updated_at
  before update on cases
  for each row execute procedure set_updated_at();

-- TABLE: appointments
create table appointments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  scheduled_date timestamptz,
  status text not null default 'Scheduled' check (status in ('Scheduled','Completed','No-Show','Cancelled')),
  specialty text,
  notes text,
  created_at timestamptz default now()
);

-- TRIGGER: bump cases.updated_at on appointment change
create or replace function appointments_bump_case_updated_at()
returns trigger as $$
declare
  target_case_id uuid;
begin
  target_case_id := coalesce(new.case_id, old.case_id);
  update cases set updated_at = now() where id = target_case_id;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger appointments_touch_case
  after insert or update or delete on appointments
  for each row execute procedure appointments_bump_case_updated_at();

-- TRIGGER: auto-set/clear noshow flag
create or replace function sync_noshow_flag()
returns trigger as $$
begin
  if new.status = 'No-Show' then
    update cases set flag = 'noshow'
    where id = new.case_id and (flag is null or flag = 'noshow');
  elsif new.status = 'Completed' then
    update cases set flag = null
    where id = new.case_id and flag = 'noshow';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger appointments_noshow_flag
  after insert or update of status on appointments
  for each row execute procedure sync_noshow_flag();

-- VIEW: cases_with_counts
create view cases_with_counts
  with (security_invoker = true)
as
select
  c.*,
  coalesce(apt.total, 0) as appointments_total,
  coalesce(apt.completed, 0) as appointments_completed
from cases c
left join (
  select
    case_id,
    count(*) filter (where status != 'Cancelled') as total,
    count(*) filter (where status = 'Completed') as completed
  from appointments
  group by case_id
) apt on apt.case_id = c.id;

-- TABLE: liens
create table liens (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  amount numeric(12,2) not null default 0,
  status text not null default 'Active' check (status in ('Active','Reduced','Paid','Waived')),
  reduction_amount numeric(12,2) not null default 0,
  payment_date date,
  notes text,
  created_at timestamptz default now()
);

-- TRIGGER: sync lien amount to cases
create or replace function sync_case_lien_amount()
returns trigger as $$
declare
  total numeric(12,2);
  target_case_id uuid;
begin
  target_case_id := coalesce(new.case_id, old.case_id);
  select coalesce(sum(amount - coalesce(reduction_amount, 0)), 0)
  into total
  from liens
  where case_id = target_case_id
    and status in ('Active', 'Reduced');
  update cases set lien_amount = total where id = target_case_id;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger liens_sync_case
  after insert or update or delete on liens
  for each row execute procedure sync_case_lien_amount();

-- TRIGGER: bump cases.updated_at on lien change
create or replace function liens_bump_case_updated_at()
returns trigger as $$
declare
  target_case_id uuid;
begin
  target_case_id := coalesce(new.case_id, old.case_id);
  update cases set updated_at = now() where id = target_case_id;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger liens_touch_case
  after insert or update or delete on liens
  for each row execute procedure liens_bump_case_updated_at();

-- TABLE: records
create table records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  record_type text check (record_type in ('Treatment Notes','Billing','Imaging','Surgical Report','Other')),
  received_date date,
  delivered_to_attorney_date date,
  hipaa_auth_on_file boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- TRIGGER: bump cases.updated_at on record change
create or replace function records_bump_case_updated_at()
returns trigger as $$
declare
  target_case_id uuid;
begin
  target_case_id := coalesce(new.case_id, old.case_id);
  update cases set updated_at = now() where id = target_case_id;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger records_touch_case
  after insert or update or delete on records
  for each row execute procedure records_bump_case_updated_at();

-- TABLE: case_updates
create table case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  message text not null,
  created_at timestamptz default now()
);

-- RLS POLICIES
alter table profiles enable row level security;
create policy "profiles_admin_all" on profiles for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "profiles_self_select" on profiles for select using (id = auth.uid());

alter table attorneys enable row level security;
create policy "attorneys_admin_all" on attorneys for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "attorneys_care_manager_select" on attorneys for select using ((select role from profiles where id = auth.uid()) = 'care_manager');
create policy "attorneys_attorney_select" on attorneys for select using ((select role from profiles where id = auth.uid()) = 'attorney');

alter table providers enable row level security;
create policy "providers_admin_all" on providers for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "providers_care_manager_select" on providers for select using ((select role from profiles where id = auth.uid()) = 'care_manager');
create policy "providers_provider_self_select" on providers for select using (id = (select provider_id from profiles where id = auth.uid()));

alter table cases enable row level security;
create policy "cases_admin_all" on cases for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "cases_care_manager_all" on cases for all using ((select role from profiles where id = auth.uid()) = 'care_manager');
create policy "cases_attorney_select" on cases for select using (attorney_id = (select firm_id from profiles where id = auth.uid()) and (select role from profiles where id = auth.uid()) = 'attorney');
create policy "cases_provider_select" on cases for select using (provider_id = (select provider_id from profiles where id = auth.uid()) and (select role from profiles where id = auth.uid()) = 'provider');

alter table appointments enable row level security;
create policy "appointments_admin_all" on appointments for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "appointments_care_manager_all" on appointments for all using ((select role from profiles where id = auth.uid()) = 'care_manager');
create policy "appointments_attorney_select" on appointments for select using (case_id in (select id from cases where attorney_id = (select firm_id from profiles where id = auth.uid())));
create policy "appointments_provider_select" on appointments for select using (provider_id = (select provider_id from profiles where id = auth.uid()));

alter table liens enable row level security;
create policy "liens_admin_all" on liens for all using ((select role from profiles where id = auth.uid()) = 'admin');

alter table records enable row level security;
create policy "records_admin_all" on records for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "records_care_manager_all" on records for all using ((select role from profiles where id = auth.uid()) = 'care_manager');

alter table case_updates enable row level security;
create policy "case_updates_admin_all" on case_updates for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "case_updates_care_manager_all" on case_updates for all using ((select role from profiles where id = auth.uid()) = 'care_manager');
create policy "case_updates_attorney_select" on case_updates for select using (case_id in (select id from cases where attorney_id = (select firm_id from profiles where id = auth.uid())));

alter table case_sequence enable row level security;
create policy "case_sequence_admin_all" on case_sequence for all using ((select role from profiles where id = auth.uid()) = 'admin');
