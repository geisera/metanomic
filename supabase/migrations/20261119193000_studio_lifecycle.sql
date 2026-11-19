alter table public.studio_agents add column first_preview_at timestamptz;
alter table public.studio_welcome_emails add column reminder_due timestamptz;
alter table public.studio_welcome_emails alter column reminder_due set default (now()+interval '48 hours');
create table public.studio_email_preferences (
 account_id uuid primary key references auth.users on delete cascade,
 setup_tips boolean not null default true, product_updates boolean not null default false
);
create table public.studio_lifecycle_history (
 account_id uuid references auth.users on delete cascade, kind text not null,
 recipient text, sender text, status text not null, reason text, provider_id text unique,
 created_at timestamptz not null default now(), primary key(account_id,kind)
);
alter table public.studio_email_preferences enable row level security;
alter table public.studio_lifecycle_history enable row level security;
revoke all on public.studio_email_preferences,public.studio_lifecycle_history from public,anon,authenticated;
grant select,insert,update on public.studio_email_preferences,public.studio_lifecycle_history to service_role;
create function public.studio_due_reminders() returns table(account_id uuid, email text, agent_id uuid, step text)
language sql set search_path='' as $$
 select w.account_id,u.email::text,a.id,
 case when not coalesce(p.setup_tips,true) then 'unsubscribed'
 when u.email_confirmed_at is null or u.banned_until>now() or coalesce(c.suspended,false) then 'inactive'
 when exists(select from public.studio_agents g where g.owner_id=u.id and (g.first_answer_at is not null or g.first_embed_at is not null)) then 'complete'
 when a.id is null then 'create'
 when not exists(select from public.studio_resolve_assistant_key(a.id,u.id) k where k.ciphertext is not null) then 'key'
 when not exists(select from public.studio_documents d where d.agent_id=a.id and d.published) then 'knowledge'
 when a.first_preview_at is null and not a.published then 'preview' else 'embed' end
 from public.studio_welcome_emails w join auth.users u on u.id=w.account_id
 left join public.studio_email_preferences p on p.account_id=u.id
 left join public.studio_workspace_controls c on c.owner_id=u.id
 left join lateral(select * from public.studio_agents g where g.owner_id=u.id order by g.published desc,g.first_preview_at desc nulls last,g.created_at limit 1) a on true
 where w.reminder_due<=now() and not exists(select from public.studio_lifecycle_history h where h.account_id=u.id and h.kind='reminder')
 order by w.reminder_due limit 50
$$;
revoke all on function public.studio_due_reminders() from public,anon,authenticated;
grant execute on function public.studio_due_reminders() to service_role;
create table public.studio_lifecycle_events (
 event_id text primary key, provider_id text not null, status text not null, reason text, occurred_at timestamptz not null
);
create index studio_lifecycle_event_lookup on public.studio_lifecycle_events(provider_id,occurred_at desc);
alter table public.studio_lifecycle_events enable row level security;
revoke all on public.studio_lifecycle_events from public,anon,authenticated;
grant select,insert on public.studio_lifecycle_events to service_role;
insert into public.studio_lifecycle_history(account_id,kind,status,reason,provider_id,created_at)
select account_id,'welcome',status,case when provider_status>=400 then 'Resend HTTP '||provider_status end,provider_id,created_at from public.studio_welcome_emails;
create view public.studio_email_history with(security_invoker=true) as
select h.account_id,h.kind,h.recipient,h.sender,coalesce(e.status,h.status) status,coalesce(e.reason,h.reason) reason,h.provider_id,h.created_at
from public.studio_lifecycle_history h left join lateral (
 select status,reason from public.studio_lifecycle_events e where e.provider_id=h.provider_id
 order by case when status in ('complained','bounced','failed','suppressed') then 0 else 1 end, occurred_at desc limit 1
) e on true;
revoke all on public.studio_email_history from public,anon,authenticated;
grant select on public.studio_email_history to service_role;
