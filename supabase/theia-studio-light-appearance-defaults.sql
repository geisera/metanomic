-- New assistants start with the same colors as the Light preset.
alter table public.studio_agents
 alter column button_color set default '#ecf0ed',
 alter column button_text_color set default '#091019',
 alter column button_outline_color set default '#52616a',
 alter column launcher_color set default '#ecf0ed',
 alter column send_color set default '#091019',
 alter column send_text_color set default '#ecf0ed',
 alter column user_message_color set default '#ecf0ed';
