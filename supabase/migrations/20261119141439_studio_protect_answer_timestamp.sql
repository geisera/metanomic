-- Existing assistant grants cover every column. Protect the support timestamp from owner-side edits.
create function studio_private.studio_protect_answer_timestamp()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon','authenticated') then
    if tg_op='INSERT' then
      if new.last_answer_at is not null then raise insufficient_privilege; end if;
    elsif new.last_answer_at is distinct from old.last_answer_at then
      raise insufficient_privilege;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function studio_private.studio_protect_answer_timestamp() from public, anon, authenticated;

create trigger studio_protect_answer_timestamp
  before insert or update of last_answer_at on public.studio_agents
  for each row execute function studio_private.studio_protect_answer_timestamp();
