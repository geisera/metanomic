create table public.studio_welcome_emails (
    account_id uuid primary key references auth.users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending','accepted','failed','unknown')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    provider_id text,
    provider_status integer
);
alter table public.studio_welcome_emails enable row level security;
revoke all on public.studio_welcome_emails from public, anon, authenticated;
grant select, insert, update on public.studio_welcome_emails to service_role;
