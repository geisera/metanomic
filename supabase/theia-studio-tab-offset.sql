alter table public.studio_agents drop constraint studio_agents_tab_alignment_check;
alter table public.studio_agents add constraint studio_agents_tab_alignment_check check(tab_alignment in ('top','middle','bottom','custom'));
alter table public.studio_agents add column tab_offset integer not null default 50 check(tab_offset between 0 and 100);
