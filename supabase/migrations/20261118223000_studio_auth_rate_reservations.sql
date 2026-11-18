create function public.studio_reserve_auth_attempt(p_bucket text, p_limit integer, p_seconds integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  expiry timestamptz;
begin
  if p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$' or p_limit is null
    or p_limit not between 1 and 20 or p_seconds is null or p_seconds not between 1 and 3600 then
    raise exception 'Invalid authentication limit';
  end if;

  delete from public.studio_rate_limits where expires_at < now() - interval '1 day';
  insert into public.studio_rate_limits as bucket (bucket, count, expires_at)
    values (p_bucket, 1, now() + make_interval(secs => p_seconds))
    on conflict (bucket) do update set
      count = case when bucket.expires_at <= now() then 1 else bucket.count + 1 end,
      expires_at = case when bucket.expires_at <= now() then excluded.expires_at else bucket.expires_at end
    where bucket.expires_at <= now() or bucket.count < p_limit
    returning expires_at into expiry;

  if found then
    return jsonb_build_object('expires_at', expiry, 'retry_after', 0);
  end if;
  select expires_at into strict expiry from public.studio_rate_limits where bucket = p_bucket;
  return jsonb_build_object('expires_at', expiry, 'retry_after',
    greatest(1, ceil(extract(epoch from (expiry - clock_timestamp())))::integer));
end;
$$;

create function public.studio_release_auth_attempt(p_bucket text, p_expires_at timestamptz)
returns void language sql security invoker set search_path = '' as $$
  update public.studio_rate_limits set count = count - 1
  where bucket = p_bucket and expires_at = p_expires_at and expires_at > now() and count > 0;
$$;

revoke execute on function public.studio_reserve_auth_attempt(text, integer, integer),
  public.studio_release_auth_attempt(text, timestamptz) from public, anon, authenticated;
grant execute on function public.studio_reserve_auth_attempt(text, integer, integer),
  public.studio_release_auth_attempt(text, timestamptz) to service_role;
