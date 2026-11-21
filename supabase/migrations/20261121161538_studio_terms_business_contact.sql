do $migration$
declare
    previous_body text;
    previous_contact constant text := $old$Metanomic Automated Systems LLC is the planned legal name. Pennsylvania LLC formation is pending.

Planned business address$old$;
    revised_contact constant text := $new$Business contact
Metanomic Automated Systems LLC$new$;
begin
    select body into strict previous_body from public.studio_terms_versions where version = '2026-11-21';
    if position(previous_contact in previous_body) = 0 then
        raise exception 'Unexpected source text for Assistant Studio Terms 2026-11-21';
    end if;
    insert into public.studio_terms_versions (version, body)
    values ('2026-11-21-b', replace(previous_body, previous_contact, revised_contact));
end;
$migration$;
