alter table public.studio_agents
 add column button_text_color text check(button_text_color ~ '^#[0-9a-fA-F]{6}$'),
 add column button_outline_color text check(button_outline_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.studio_agents drop constraint studio_agents_button_position_check;
alter table public.studio_agents add constraint studio_agents_button_position_check check(button_position in ('left','right','top-left','top-right'));
