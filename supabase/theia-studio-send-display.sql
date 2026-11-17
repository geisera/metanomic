alter table public.studio_agents add column send_display text not null default 'icon' check(send_display in ('icon','text'));
