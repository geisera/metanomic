do $migration$
declare
    previous_body text;
    previous_header constant text := $old$Effective date: November 18, 2026
Service provider: Metanomic, a Pennsylvania limited liability company
Contact: https://metanomic.ai/contact$old$;
    revised_header constant text := $new$Effective date: November 21, 2026
Service provider: Metanomic
Contact: https://metanomic.ai/contact

Metanomic Automated Systems LLC is the planned legal name. Pennsylvania LLC formation is pending.

Planned business address
812 North Prince Street
Lancaster, PA 17603
Lancaster County$new$;
begin
    select body into strict previous_body from public.studio_terms_versions where version = '2026-11-18';
    if not starts_with(previous_body, previous_header) or position('refer to the company identified above.' in previous_body) = 0 then
        raise exception 'Unexpected source text for Assistant Studio Terms 2026-11-18';
    end if;
    insert into public.studio_terms_versions (version, body)
    values ('2026-11-21', revised_header || replace(
        substr(previous_body, char_length(previous_header) + 1),
        'refer to the company identified above.',
        'refer to the operator of Assistant Studio under the Metanomic name.'
    ));
end;
$migration$;
