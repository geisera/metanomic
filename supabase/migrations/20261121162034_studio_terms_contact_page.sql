do $migration$
declare
    previous_body text;
    former_address constant text := $address$
812 North Prince Street
Lancaster, PA 17603
Lancaster County$address$;
begin
    select body into strict previous_body from public.studio_terms_versions where version = '2026-11-21-b';
    if position(former_address in previous_body) = 0 then
        raise exception 'Unexpected source text for Assistant Studio Terms 2026-11-21-b';
    end if;
    insert into public.studio_terms_versions (version, body)
    values ('2026-11-21-c', replace(previous_body, former_address, ''));
end;
$migration$;
