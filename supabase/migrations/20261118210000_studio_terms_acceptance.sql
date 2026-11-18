create table public.studio_terms_versions (
    version text primary key check (version ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
    body text not null check (length(btrim(body)) > 0)
);

-- Keep a minimal acceptance record after account deletion. Store no email or IP.
create table public.studio_terms_acceptances (
    account_id uuid not null,
    terms_version text not null references public.studio_terms_versions(version),
    accepted_at timestamptz not null default now(),
    primary key (account_id, terms_version)
);

alter table public.studio_terms_versions enable row level security;
alter table public.studio_terms_acceptances enable row level security;
revoke all on public.studio_terms_versions, public.studio_terms_acceptances from public, anon, authenticated, service_role;
grant select on public.studio_terms_versions to service_role;
grant select, insert on public.studio_terms_acceptances to service_role;
