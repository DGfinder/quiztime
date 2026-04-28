-- Server-side wall clock for deadline-anchored question timing.
-- Clients call this on join (and periodically) to estimate clock skew,
-- so countdowns animate against an authoritative deadline instead of
-- per-tick broadcasts.

create or replace function server_now()
returns bigint
language sql
stable
as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

grant execute on function server_now() to anon, authenticated;
