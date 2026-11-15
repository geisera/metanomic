-- Theia knowledge foundation.
-- Apply only to a dedicated Metanomic Supabase project, never Book Formatter.
-- Administrative accounts are provisioned explicitly through Supabase Auth + SQL.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 600),
  category text not null default 'company'
    check (category in ('company', 'services', 'technical', 'process', 'faq', 'other')),
  content text not null default '' check (char_length(content) <= 100000),
  source_url text not null default '' check (char_length(source_url) <= 500),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  revision integer not null default 1 check (revision > 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint published_has_content check (status != 'published' or char_length(trim(content)) > 0)
);

create table if not exists public.knowledge_revisions (
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  revision integer not null check (revision > 0),
  title text not null,
  summary text not null,
  category text not null,
  content text not null,
  source_url text not null,
  status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  primary key (document_id, revision)
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 10000),
  embedding extensions.vector(1536),
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create table if not exists public.knowledge_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  source_revision integer not null,
  state text not null default 'pending' check (state in ('pending','processing','complete','failed')),
  attempt_count integer not null default 0 check(attempt_count >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id, source_revision)
);

create index if not exists knowledge_documents_status_idx
  on public.knowledge_documents (status, updated_at desc);
create index if not exists knowledge_revisions_document_idx
  on public.knowledge_revisions (document_id, revision desc);
create index if not exists knowledge_chunks_document_idx
  on public.knowledge_chunks (document_id, chunk_index);
create index if not exists knowledge_ingestion_jobs_state_idx
  on public.knowledge_ingestion_jobs (state, created_at);

create or replace function public.knowledge_documents_before_write()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.status = 'published' and old.status is distinct from 'published' then
      new.published_at := now();
    elsif new.status <> 'published' then
      new.published_at := null;
    else
      new.published_at := old.published_at;
    end if;
  elsif new.status = 'published' then
    new.published_at := now();
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end; $$;

create or replace function public.knowledge_capture_revision()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  insert into public.knowledge_revisions
    (document_id, revision, title, summary, category, content, source_url, status, changed_by)
  values
    (new.id, new.revision, new.title, new.summary, new.category, new.content, new.source_url,
     new.status, auth.uid());
  return new;
end; $$;

drop trigger if exists knowledge_documents_before_write_trg on public.knowledge_documents;
create trigger knowledge_documents_before_write_trg
  before insert or update on public.knowledge_documents
  for each row execute function public.knowledge_documents_before_write();

drop trigger if exists knowledge_capture_revision_trg on public.knowledge_documents;
create trigger knowledge_capture_revision_trg
  after insert or update on public.knowledge_documents
  for each row execute function public.knowledge_capture_revision();

alter table public.knowledge_admins enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_revisions enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_ingestion_jobs enable row level security;

-- Authenticated users can check only their own admin status. No public member directory.
revoke all on public.knowledge_admins from anon, authenticated;
grant select on public.knowledge_admins to authenticated;
drop policy if exists knowledge_admins_self_read on public.knowledge_admins;
create policy knowledge_admins_self_read on public.knowledge_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- No published-content exposure through anonymous Data API requests.
revoke all on public.knowledge_documents from anon, authenticated;
revoke all on public.knowledge_revisions from anon, authenticated;
revoke all on public.knowledge_chunks from anon, authenticated;
revoke all on public.knowledge_ingestion_jobs from anon, authenticated;

grant select, insert, update on public.knowledge_documents to authenticated;
grant select on public.knowledge_revisions to authenticated;
grant insert on public.knowledge_revisions to authenticated;
grant select on public.knowledge_chunks to authenticated;
grant select on public.knowledge_ingestion_jobs to authenticated;

drop policy if exists knowledge_documents_admin_read on public.knowledge_documents;
create policy knowledge_documents_admin_read on public.knowledge_documents
  for select to authenticated using (
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  );
drop policy if exists knowledge_documents_admin_insert on public.knowledge_documents;
create policy knowledge_documents_admin_insert on public.knowledge_documents
  for insert to authenticated with check (
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  );
drop policy if exists knowledge_documents_admin_update on public.knowledge_documents;
create policy knowledge_documents_admin_update on public.knowledge_documents
  for update to authenticated using (
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  );

drop policy if exists knowledge_revisions_admin_read on public.knowledge_revisions;
create policy knowledge_revisions_admin_read on public.knowledge_revisions
  for select to authenticated using (
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  );
drop policy if exists knowledge_revisions_admin_insert on public.knowledge_revisions;
create policy knowledge_revisions_admin_insert on public.knowledge_revisions
  for insert to authenticated with check (
    -- Revisions must originate from the document trigger, never a direct client INSERT.
    pg_trigger_depth() > 0 and
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  );

drop policy if exists knowledge_chunks_admin_read on public.knowledge_chunks;
create policy knowledge_chunks_admin_read on public.knowledge_chunks
  for select to authenticated using (
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  );
drop policy if exists knowledge_ingestion_jobs_admin_read on public.knowledge_ingestion_jobs;
create policy knowledge_ingestion_jobs_admin_read on public.knowledge_ingestion_jobs
  for select to authenticated using (
    exists (select 1 from public.knowledge_admins a where a.user_id = (select auth.uid()))
  );

-- IMPORTANT: No self-registration or admin self-elevation route.
-- Provision an administrator in Supabase Auth first, then run this explicitly:
-- INSERT INTO public.knowledge_admins (user_id) VALUES ('<AUTH_USER_UUID>');

-- Chunks/ingestion infrastructure is deliberately inert in milestone 1:
-- publication does NOT yet index content or expose it to Theia.
