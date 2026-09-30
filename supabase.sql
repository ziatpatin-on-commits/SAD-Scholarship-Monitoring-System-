-- ============================================================
-- SCHOLARTRACK: STUDENT SCHOLARSHIP MONITORING SYSTEM
-- Supabase PostgreSQL schema, RLS, functions, and sample data
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'User',
  role text not null default 'staff' check (role in ('admin','staff','scholar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SCHOLARSHIP PROGRAMS ----------
create table if not exists public.scholarship_programs (
  id uuid primary key default gen_random_uuid(),
  program_name text not null unique,
  required_gwa numeric(5,2) not null check (required_gwa >= 0 and required_gwa <= 100),
  min_units integer not null default 0 check (min_units >= 0),
  allow_failing boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SCHOLARS ----------
create table if not exists public.scholars (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  full_name text not null,
  degree_program text not null,
  year_level text not null,
  scholarship_id uuid not null references public.scholarship_programs(id),
  status text not null default 'Active' check (
    status in ('Active','Pending Submission','For Verification','Compliant',
               'With Deficiency','Probationary','For Renewal','Renewed','Disqualified')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- GRADE SUBMISSIONS ----------
create table if not exists public.grade_submissions (
  id uuid primary key default gen_random_uuid(),
  scholar_id uuid not null references public.scholars(id) on delete cascade,
  academic_year text not null,
  semester text not null check (semester in ('1st Semester','2nd Semester','Summer')),
  gwa numeric(5,2) not null check (gwa >= 0 and gwa <= 100),
  units_enrolled integer not null check (units_enrolled >= 0),
  failed_subjects integer not null default 0 check (failed_subjects >= 0),
  incomplete_subjects integer not null default 0 check (incomplete_subjects >= 0),
  submission_status text not null default 'Pending' check (submission_status in ('Pending','Verified','Returned')),
  submitted_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  evaluation_status text check (evaluation_status in ('Compliant','With Deficiency')),
  evaluation_reason text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_scholars_student_id on public.scholars(student_id);
create index if not exists idx_scholars_status on public.scholars(status);
create index if not exists idx_grade_submission_status on public.grade_submissions(submission_status);
create index if not exists idx_grade_scholar on public.grade_submissions(scholar_id);

-- ---------- PROFILE TRIGGER ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------- UPDATED_AT ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_programs_updated_at on public.scholarship_programs;
create trigger set_programs_updated_at before update on public.scholarship_programs
for each row execute procedure public.set_updated_at();

drop trigger if exists set_scholars_updated_at on public.scholars;
create trigger set_scholars_updated_at before update on public.scholars
for each row execute procedure public.set_updated_at();

drop trigger if exists set_submissions_updated_at on public.grade_submissions;
create trigger set_submissions_updated_at before update on public.grade_submissions
for each row execute procedure public.set_updated_at();

-- ---------- ROLE HELPER ----------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- COMPLIANCE VERIFICATION ----------
-- Rule used here:
-- Lower GWA is better, so submitted GWA <= required_gwa.
-- Units must be >= min_units.
-- If failing grades are not allowed, failed_subjects must be 0.
-- Incomplete subjects must be 0.
create or replace function public.verify_grade_submission(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_sub public.grade_submissions%rowtype;
  v_program public.scholarship_programs%rowtype;
  v_status text;
  v_reason text;
begin
  v_role := public.current_user_role();

  if v_role not in ('admin','staff') then
    raise exception 'Only authorized staff or admin users may verify grade submissions.';
  end if;

  select * into v_sub
  from public.grade_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Grade submission not found.';
  end if;

  if v_sub.submission_status <> 'Pending' then
    raise exception 'Only Pending submissions can be verified.';
  end if;

  select sp.* into v_program
  from public.scholarship_programs sp
  join public.scholars s on s.scholarship_id = sp.id
  where s.id = v_sub.scholar_id;

  if not found then
    raise exception 'Assigned scholarship program was not found.';
  end if;

  if v_sub.gwa <= v_program.required_gwa
     and v_sub.units_enrolled >= v_program.min_units
     and (v_program.allow_failing or v_sub.failed_subjects = 0)
     and v_sub.incomplete_subjects = 0
  then
    v_status := 'Compliant';
    v_reason := 'All scholarship academic requirements were satisfied.';
  else
    v_status := 'With Deficiency';
    v_reason := concat_ws(', ',
      case when v_sub.gwa > v_program.required_gwa then 'GWA requirement not met' end,
      case when v_sub.units_enrolled < v_program.min_units then 'minimum units not met' end,
      case when not v_program.allow_failing and v_sub.failed_subjects > 0 then 'failing-grade policy not met' end,
      case when v_sub.incomplete_subjects > 0 then 'incomplete subjects present' end
    );
  end if;

  update public.grade_submissions
  set submission_status = 'Verified',
      verified_by = auth.uid(),
      verified_at = now(),
      evaluation_status = v_status,
      evaluation_reason = v_reason
  where id = p_submission_id;

  update public.scholars
  set status = v_status
  where id = v_sub.scholar_id;

  return jsonb_build_object(
    'message', 'Submission verified and evaluated.',
    'evaluation_status', v_status,
    'evaluation_reason', v_reason
  );
end;
$$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
alter table public.scholarship_programs enable row level security;
alter table public.scholars enable row level security;
alter table public.grade_submissions enable row level security;

-- Remove old policies with these names so the script can be re-run safely.
drop policy if exists "profiles self access" on public.profiles;
drop policy if exists "profiles admin access" on public.profiles;
drop policy if exists "authenticated program access" on public.scholarship_programs;
drop policy if exists "authorized scholar access" on public.scholars;
drop policy if exists "authorized grade access" on public.grade_submissions;

create policy "profiles self access"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles admin access"
on public.profiles for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "authenticated program access"
on public.scholarship_programs for select
to authenticated
using (true);

create policy "authorized program insert"
on public.scholarship_programs for insert
to authenticated
with check (public.current_user_role() in ('admin','staff'));

create policy "authorized program update"
on public.scholarship_programs for update
to authenticated
using (public.current_user_role() in ('admin','staff'))
with check (public.current_user_role() in ('admin','staff'));

create policy "authorized scholar access"
on public.scholars for select
to authenticated
using (true);

create policy "authorized scholar insert"
on public.scholars for insert
to authenticated
with check (public.current_user_role() in ('admin','staff'));

create policy "authorized scholar update"
on public.scholars for update
to authenticated
using (public.current_user_role() in ('admin','staff'))
with check (public.current_user_role() in ('admin','staff'));

create policy "authorized grade access"
on public.grade_submissions for select
to authenticated
using (true);

create policy "authorized grade insert"
on public.grade_submissions for insert
to authenticated
with check (public.current_user_role() in ('admin','staff'));

create policy "authorized grade update"
on public.grade_submissions for update
to authenticated
using (public.current_user_role() in ('admin','staff'))
with check (public.current_user_role() in ('admin','staff'));

-- Allow the verification function to be called by authenticated users;
-- the function itself checks role.
grant execute on function public.verify_grade_submission(uuid) to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- ---------- SAMPLE PROGRAMS ----------
insert into public.scholarship_programs
(program_name, required_gwa, min_units, allow_failing, active)
values
('University Academic Scholarship', 2.00, 15, false, true),
('Government Scholarship', 2.50, 15, false, true),
('Private Merit Scholarship', 1.75, 12, false, true)
on conflict (program_name) do nothing;

-- ============================================================
-- SETUP NOTES
-- 1. Run this SQL in Supabase SQL Editor.
-- 2. Create a user under Authentication > Users.
-- 3. The trigger creates a staff profile automatically.
-- 4. To make the first account admin, run:
--
-- update public.profiles
-- set role = 'admin', full_name = 'System Administrator'
-- where id = 'YOUR-AUTH-USER-UUID';
--
-- Never expose service_role keys in frontend code.
-- ============================================================
