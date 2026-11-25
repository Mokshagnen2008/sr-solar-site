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

alter table public.project_photos enable row level security;

grant select on public.project_photos to anon, authenticated;
grant insert, delete on public.project_photos to authenticated;

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
