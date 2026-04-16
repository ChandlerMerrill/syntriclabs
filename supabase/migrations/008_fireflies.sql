-- Phase 5E: Fireflies.ai Integration
-- Meeting transcript storage and AI-processed insights

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  fireflies_id text unique not null,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  date timestamptz not null,
  duration_minutes int,
  organizer_email text,
  participants jsonb not null default '[]',
  raw_transcript text,
  summary text,
  action_items jsonb not null default '[]',
  key_decisions jsonb not null default '[]',
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
  topics text[] not null default '{}',
  fireflies_url text,
  matched_contact_ids uuid[] not null default '{}',
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  processing_error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transcripts_client on transcripts(client_id);
create index idx_transcripts_date on transcripts(date desc);
create index idx_transcripts_fireflies on transcripts(fireflies_id);
create index idx_transcripts_status on transcripts(processing_status);

alter table transcripts enable row level security;
create policy "Service role only" on transcripts
  for all to service_role using (true) with check (true);

create trigger transcripts_updated_at before update on transcripts
  for each row execute function update_updated_at();
