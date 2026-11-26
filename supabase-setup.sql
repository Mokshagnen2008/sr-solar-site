insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'project-photos',
    'project-photos',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.project_photos (
    id uuid primary key default gen_random_uuid(),
    storage_path text not null unique,
    alt_text text not null check (char_length(btrim(alt_text)) between 1 and 160),
    created_at timestamptz not null default now()
);

create table if not exists public.site_visits (
    id uuid primary key default gen_random_uuid(),
    visited_at timestamptz not null default now()
);

create table if not exists public.contact_inquiries (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 1 and 100),
    email text not null check (char_length(btrim(email)) between 3 and 254),
    phone text check (phone is null or char_length(phone) <= 32),
    message text not null check (char_length(btrim(message)) between 1 and 2000),
    created_at timestamptz not null default now()
);

alter table public.project_photos enable row level security;
alter table public.site_visits enable row level security;
alter table public.contact_inquiries enable row level security;

grant select on public.project_photos to anon, authenticated;
grant insert, delete on public.project_photos to authenticated;
revoke all on public.site_visits from anon, authenticated;
grant insert on public.site_visits to anon, authenticated;
grant select on public.site_visits to authenticated;
revoke all on public.contact_inquiries from public, anon, authenticated;

create or replace function public.get_public_site_visit_count()
returns bigint
language sql
security definer
set search_path = ''
set row_security = off
as $$
    select count(*)::bigint from public.site_visits;
$$;

revoke all on function public.get_public_site_visit_count() from public;
grant execute on function public.get_public_site_visit_count() to anon, authenticated;

drop policy if exists "Anyone can view project photo records" on public.project_photos;
create policy "Anyone can view project photo records"
on public.project_photos
for select
to anon, authenticated
using (true);

drop policy if exists "SR Solar admin can add project photo records" on public.project_photos;
create policy "SR Solar admin can add project photo records"
on public.project_photos
for insert
to authenticated
with check (lower(auth.jwt() ->> 'email') = 'smoksha1989@gmail.com');

drop policy if exists "SR Solar admin can delete project photo records" on public.project_photos;
create policy "SR Solar admin can delete project photo records"
on public.project_photos
for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'smoksha1989@gmail.com');

drop policy if exists "Anyone can record site visits" on public.site_visits;
create policy "Anyone can record site visits"
on public.site_visits
for insert
to anon, authenticated
with check (true);

drop policy if exists "SR Solar admin can view site visits" on public.site_visits;
create policy "SR Solar admin can view site visits"
on public.site_visits
for select
to authenticated
using (lower(auth.jwt() ->> 'email') = 'smoksha1989@gmail.com');

drop policy if exists "Anyone can view project photo files" on storage.objects;
create policy "Anyone can view project photo files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'project-photos');

drop policy if exists "SR Solar admin can upload project photo files" on storage.objects;
create policy "SR Solar admin can upload project photo files"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'project-photos'
    and lower(auth.jwt() ->> 'email') = 'smoksha1989@gmail.com'
);

drop policy if exists "SR Solar admin can delete project photo files" on storage.objects;
create policy "SR Solar admin can delete project photo files"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'project-photos'
    and lower(auth.jwt() ->> 'email') = 'smoksha1989@gmail.com'
);
