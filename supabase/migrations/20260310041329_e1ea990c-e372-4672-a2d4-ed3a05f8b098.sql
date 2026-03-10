
-- Fix search_path on all functions
alter function handle_new_user() set search_path = public;
alter function next_case_number() set search_path = public;
alter function set_sol_date() set search_path = public;
alter function set_updated_at() set search_path = public;
alter function appointments_bump_case_updated_at() set search_path = public;
alter function sync_noshow_flag() set search_path = public;
alter function sync_case_lien_amount() set search_path = public;
alter function liens_bump_case_updated_at() set search_path = public;
alter function records_bump_case_updated_at() set search_path = public;
