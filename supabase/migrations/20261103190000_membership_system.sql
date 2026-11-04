
-- ==========================================
-- MEMBERSHIP REQUESTS SYSTEM
-- Digital Civic Link
-- ==========================================

create table if not exists public.membership_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.membership_admins enable row level security;

create or replace function public.is_membership_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membership_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_membership_admin() from public;
grant execute on function public.is_membership_admin()
to authenticated;

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),

  applicant_id uuid not null
    references auth.users(id) on delete cascade,

  full_name text not null,
  phone text not null,
  governorate text not null,
  district text not null,
  education_level text not null,
  reason text not null,

  id_photo_path text not null,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint valid_full_name
    check (char_length(full_name) between 5 and 150),

  constraint valid_phone
    check (phone ~ '^\+9647[0-9]{9}$'),

  constraint valid_reason
    check (char_length(reason) between 20 and 2000)
);

create index if not exists membership_status_idx
on public.membership_requests(status, created_at desc);

create index if not exists membership_governorate_idx
on public.membership_requests(governorate);

alter table public.membership_requests enable row level security;

-- Applicant can submit their own request only.
create policy "Applicants submit own requests"
on public.membership_requests
for insert
to authenticated
with check (
  applicant_id = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

-- Applicant can see their own request status.
create policy "Applicants read own requests"
on public.membership_requests
for select
to authenticated
using (
  applicant_id = auth.uid()
  or public.is_membership_admin()
);

-- Only designated administrators can review requests.
create policy "Admins review membership requests"
on public.membership_requests
for update
to authenticated
using (public.is_membership_admin())
with check (public.is_membership_admin());

-- ==========================================
-- PRIVATE ID DOCUMENT STORAGE
-- ==========================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'membership-id',
  'membership-id',
  false,
  8388608,
  array['image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg'];

-- Applicant uploads only into their own folder.
create policy "Applicants upload own ID"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'membership-id'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Only membership administrators can read ID images.
create policy "Admins read membership IDs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'membership-id'
  and public.is_membership_admin()
);

create policy "Admins delete membership IDs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'membership-id'
  and public.is_membership_admin()
);
