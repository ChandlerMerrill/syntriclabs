-- Phase 3: custom branded documents
-- Adds 'custom' to the documents.type check constraint and makes client_id nullable
-- so Claude can generate non-client artifacts (briefs, one-pagers, memos).

alter table public.documents
  drop constraint if exists documents_type_check;

alter table public.documents
  add constraint documents_type_check
  check (type in ('proposal','price_sheet','contract','counter_proposal','custom'));

alter table public.documents
  alter column client_id drop not null;
