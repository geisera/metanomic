alter table public.studio_agents
 add column send_label text check(length(send_label) between 1 and 60),
 add column send_color text check(send_color ~ '^#[0-9a-fA-F]{6}$'),
 add column send_text_color text check(send_text_color ~ '^#[0-9a-fA-F]{6}$'),
 add column user_message_color text check(user_message_color ~ '^#[0-9a-fA-F]{6}$');
