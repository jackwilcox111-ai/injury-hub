-- Allow marketer_applications insert for authenticated users too
create policy "marketer_apps_auth_insert" on marketer_applications
  for insert to authenticated with check (true);
