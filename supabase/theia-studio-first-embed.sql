-- Record the first approved chat-window request for each assistant.
alter table public.studio_agents add column if not exists first_embed_at timestamptz;
