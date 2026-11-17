alter table public.studio_agents add column tab_orientation text not null default 'vertical' check (tab_orientation in ('vertical','horizontal'));
