create table if not exists public.shuttle_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  dates date[] not null check (cardinality(dates) > 0),
  origin text not null check (length(btrim(origin)) between 2 and 200),
  destination text not null check (length(btrim(destination)) between 2 and 200),
  departure_time time not null, arrival_time time, passenger_count integer not null check (passenger_count between 1 and 200),
  purpose text not null check (length(btrim(purpose)) between 2 and 1000),
  estimated_gas numeric(12,2) not null default 0 check (estimated_gas >= 0),
  estimated_toll numeric(12,2) not null default 0 check (estimated_toll >= 0),
  estimated_other numeric(12,2) not null default 0 check (estimated_other >= 0),
  final_gas numeric(12,2) check (final_gas is null or final_gas >= 0),
  final_toll numeric(12,2) check (final_toll is null or final_toll >= 0),
  final_other numeric(12,2) check (final_other is null or final_other >= 0),
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  denial_reason text, driver_id uuid references public.profiles(id), reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.shuttle_requests enable row level security;
revoke all on public.shuttle_requests from public;
grant select, insert, update on public.shuttle_requests to app_member;
create policy shuttle_select on public.shuttle_requests for select to app_member using (user_id = public.app_current_user_id() or public.is_admin());
create policy shuttle_insert on public.shuttle_requests for insert to app_member with check (user_id = public.app_current_user_id() and public.is_active_member());
create policy shuttle_update on public.shuttle_requests for update to app_member using (public.is_admin());
create index if not exists shuttle_requests_status_idx on public.shuttle_requests(status, created_at desc);
