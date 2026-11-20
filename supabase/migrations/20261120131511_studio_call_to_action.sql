set local lock_timeout = '5s';

alter table public.studio_agents
    add column cta_label text,
    add column cta_url text,
    add constraint studio_agents_call_to_action_valid check (
        (cta_label is null and cta_url is null)
        or (
            cta_label is not null and cta_url is not null
            and char_length(btrim(cta_label)) between 1 and 60
            and char_length(cta_url) between 9 and 2048
            and cta_url like 'https://%'
        )
    );

notify pgrst, 'reload schema';
