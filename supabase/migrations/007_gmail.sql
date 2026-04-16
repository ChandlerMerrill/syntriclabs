-- Phase 5D: Gmail Integration
-- Gmail account OAuth storage and email messages

-- Gmail accounts (single-user, one active row)
create table gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email_address text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  history_id bigint,
  last_sync_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table gmail_accounts enable row level security;
create policy "Service role only" on gmail_accounts
  for all to service_role using (true) with check (true);

create trigger gmail_accounts_updated_at before update on gmail_accounts
  for each row execute function update_updated_at();

-- Emails
create table emails (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text unique not null,
  gmail_thread_id text,
  client_id uuid references clients(id) on delete set null,
  from_address text not null,
  from_name text,
  to_addresses jsonb not null default '[]',
  cc_addresses jsonb not null default '[]',
  bcc_addresses jsonb not null default '[]',
  subject text,
  body_text text,
  body_html text,
  snippet text,
  label_ids text[],
  is_read boolean not null default true,
  is_starred boolean not null default false,
  is_draft boolean not null default false,
  has_attachments boolean not null default false,
  internal_date timestamptz not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  matched_contact_id uuid references client_contacts(id) on delete set null,
  raw_headers jsonb,
  created_at timestamptz not null default now()
);

create index idx_emails_thread_date on emails(gmail_thread_id, internal_date);
create index idx_emails_client on emails(client_id);
create index idx_emails_from on emails(from_address);
create index idx_emails_date on emails(internal_date desc);
create index idx_emails_unmatched on emails(direction, client_id) where client_id is null;

alter table emails enable row level security;
create policy "Service role only" on emails
  for all to service_role using (true) with check (true);

-- Email attachments (metadata only — blobs fetched on-demand from Gmail)
create table email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references emails(id) on delete cascade,
  gmail_attachment_id text,
  filename text,
  mime_type text,
  size_bytes int
);

alter table email_attachments enable row level security;
create policy "Service role only" on email_attachments
  for all to service_role using (true) with check (true);

-- Update embeddings entity_type constraint to include email and transcript
alter table embeddings drop constraint if exists embeddings_entity_type_check;
alter table embeddings add constraint embeddings_entity_type_check
  check (entity_type in ('client', 'project', 'deal', 'activity', 'email', 'transcript'));
