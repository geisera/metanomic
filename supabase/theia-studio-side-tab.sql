alter table public.studio_agents
 add column launcher_style text not null default 'pill' check(launcher_style in ('pill','side-tab')),
 add column tab_side text not null default 'right' check(tab_side in ('left','right')),
 add column tab_alignment text not null default 'middle' check(tab_alignment in ('top','middle','bottom'));
