-- Documents table for proposals, price sheets, contracts
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  type text not null check (type in ('proposal','price_sheet','contract','counter_proposal')),
  title text not null,
  status text not null default 'draft' check (status in ('draft','final','sent','accepted','rejected')),
  version integer not null default 1,
  content_data jsonb not null default '{}',
  storage_path text,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_documents_client on public.documents(client_id);
create index if not exists idx_documents_type on public.documents(type);
create index if not exists idx_documents_deal on public.documents(deal_id);

alter table public.documents enable row level security;

drop policy if exists "auth_all" on public.documents;
create policy "auth_all" on public.documents
  for all to authenticated using (true) with check (true);

create trigger documents_updated_at before update on public.documents
  for each row execute function update_updated_at();

-- Storage bucket for generated PDFs (private — access via signed URLs)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Authenticated users can read/write the documents bucket
drop policy if exists "documents_auth_read" on storage.objects;
create policy "documents_auth_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_auth_write" on storage.objects;
create policy "documents_auth_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents');

drop policy if exists "documents_auth_update" on storage.objects;
create policy "documents_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_auth_delete" on storage.objects;
create policy "documents_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents');

-- Service role bypasses RLS by default, but if your server-side code uses
-- the anon key with a service token, you may need to also grant to `anon`
-- or `service_role` explicitly depending on your setup.
