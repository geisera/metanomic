alter table public.studio_agents
  add column launcher_animation text not null default 'off'
  check (launcher_animation in ('off', 'glow', 'pulse'));
