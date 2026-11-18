create table if not exists public.studio_pro_waitlist (
  email text primary key check (char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

alter table public.studio_pro_waitlist enable row level security;
revoke all on public.studio_pro_waitlist from anon, authenticated;
grant select, insert on public.studio_pro_waitlist to service_role;
