-- Phase 5B: Semantic Search with pgvector
-- Run this in Supabase SQL editor

-- Enable pgvector
create extension if not exists vector with schema extensions;

-- Embeddings table (polymorphic — one embedding per entity)
create table embeddings (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('client', 'project', 'deal', 'activity')),
  entity_id uuid not null,
  content text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_embeddings_entity on embeddings(entity_type, entity_id);
create index idx_embeddings_vector on embeddings
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index idx_embeddings_entity_type on embeddings(entity_type);

alter table embeddings enable row level security;
create policy "Service role only" on embeddings
  for all to service_role using (true) with check (true);

create trigger embeddings_updated_at before update on embeddings
  for each row execute function update_updated_at();

-- Similarity search RPC
create or replace function search_embeddings(
  query_embedding extensions.vector(1536),
  match_count int default 10,
  match_threshold float default 0.3,
  filter_types text[] default null
)
returns table (
  id uuid, entity_type text, entity_id uuid, content text, similarity float
)
language sql stable
as $$
  select e.id, e.entity_type, e.entity_id, e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  where (filter_types is null or e.entity_type = any(filter_types))
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
