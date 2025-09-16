-- Create bucket only if it doesn't already exist (do NOT change existing visibility)
insert into storage.buckets (id, name, public)
select 'documents', 'documents', true
where not exists (
  select 1 from storage.buckets b where b.id = 'documents'
);

-- Enable RLS on storage objects (default is enabled). Add read policy for public bucket
-- Note: With public=true, files are accessible via public URL; this policy allows SQL reads if needed.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read access for documents bucket'
  ) then
    create policy "Public read access for documents bucket"
    on storage.objects for select
    to public
    using (bucket_id = 'documents');
  end if;
end $$;

-- Optional: allow authenticated users to upload directly (not required for service key scripts)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated can upload to documents bucket'
  ) then
    create policy "Authenticated can upload to documents bucket"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'documents');
  end if;
end $$;

-- Documents metadata table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_bucket text not null default 'documents',
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- RLS for documents table
alter table public.documents enable row level security;

-- Allow anyone to read documents metadata (for public listing on website)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'Anyone can read documents'
  ) then
    create policy "Anyone can read documents"
    on public.documents for select
    to anon, authenticated
    using (true);
  end if;
end $$;

-- Allow authenticated users to insert metadata; service_role bypasses RLS
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'Authenticated can insert documents'
  ) then
    create policy "Authenticated can insert documents"
    on public.documents for insert
    to authenticated
    with check (true);
  end if;
end $$;

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
begin
  if not exists (
    select 1
    from   pg_trigger t
    join   pg_class c on c.oid = t.tgrelid
    join   pg_namespace n on n.oid = c.relnamespace
    where  n.nspname = 'public' and c.relname = 'documents' and t.tgname = 'trg_documents_updated_at'
  ) then
    create trigger trg_documents_updated_at
    before update on public.documents
    for each row execute function public.set_updated_at();
  end if;
end $$;


-- Computed view for public URL (avoids subqueries in generated columns)
create or replace view public.documents_with_url as
select 
  d.*,
  case 
    when d.storage_bucket = 'documents' and d.storage_path is not null then
      'https://' || replace((current_setting('request.jwt.claims', true)::json->>'iss'), 'auth', 'storage') || '/object/public/' || d.storage_bucket || '/' || d.storage_path
    else null 
  end as public_url
from public.documents d;
