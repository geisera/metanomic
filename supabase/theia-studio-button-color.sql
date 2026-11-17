alter table public.studio_agents add column launcher_color text check(launcher_color ~ '^#[0-9a-fA-F]{6}$');
