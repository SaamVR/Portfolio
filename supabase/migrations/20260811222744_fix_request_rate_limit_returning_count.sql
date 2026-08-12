create or replace function public.check_request_rate_limit(
  _identifier text,
  _window_ms integer,
  _limit integer
)
returns table (
  allowed boolean,
  count integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window_start timestamptz;
  current_reset_at timestamptz;
  next_count integer;
begin
  if _identifier is null or btrim(_identifier) = '' then
    raise exception 'Rate limit identifier is required';
  end if;

  if coalesce(_window_ms, 0) <= 0 then
    raise exception 'Rate limit window must be positive';
  end if;

  if coalesce(_limit, 0) <= 0 then
    raise exception 'Rate limit must be positive';
  end if;

  current_window_start :=
    to_timestamp(floor(extract(epoch from now()) * 1000 / _window_ms) * _window_ms / 1000.0);
  current_reset_at := current_window_start + make_interval(secs => _window_ms / 1000.0);

  insert into public.request_rate_limits as rl (identifier, window_start, count, updated_at)
  values (_identifier, current_window_start, 1, now())
  on conflict (identifier) do update
    set count = case
        when rl.window_start = current_window_start then rl.count + 1
        else 1
      end,
      window_start = case
        when rl.window_start = current_window_start then rl.window_start
        else current_window_start
      end,
      updated_at = now()
  returning rl.count into next_count;

  return query
  select next_count <= _limit, next_count, current_reset_at;
end;
$$;
