create table if not exists public.booking_edit_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  edited_by uuid not null default public.app_current_user_id() references public.profiles (id),
  old_room_id uuid not null references public.rooms (id),
  new_room_id uuid not null references public.rooms (id),
  old_start_time timestamptz not null,
  old_end_time timestamptz not null,
  new_start_time timestamptz not null,
  new_end_time timestamptz not null,
  old_event_name text not null,
  new_event_name text not null,
  old_event_type text not null,
  new_event_type text not null,
  old_attendee_count integer not null,
  new_attendee_count integer not null,
  old_purpose text not null,
  new_purpose text not null,
  created_at timestamptz not null default now()
);

alter table public.booking_edit_history enable row level security;
revoke all on public.booking_edit_history from public;
grant select, insert on public.booking_edit_history to app_member;
create policy booking_edit_history_admin on public.booking_edit_history for select to app_member using (public.is_admin());

create or replace function public.admin_edit_approved_booking(
  p_booking_id uuid,
  p_room_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_event_name text,
  p_event_type text,
  p_attendee_count integer,
  p_purpose text
)
returns setof public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  old public.bookings;
  room public.rooms;
begin
  if not public.is_admin() then
    raise exception 'Only admins can edit approved bookings' using errcode = '42501';
  end if;
  select * into old from public.bookings where id = p_booking_id for update;
  if not found or old.status <> 'approved' then
    raise exception 'Only approved bookings can be edited' using errcode = 'check_violation';
  end if;
  select * into room from public.rooms where id = p_room_id and is_active;
  if not found then
    raise exception 'That room is not available' using errcode = 'check_violation';
  end if;
  if p_end_time <= p_start_time or p_start_time <= now() or p_start_time::date <> p_end_time::date
     or (p_start_time at time zone 'Asia/Manila')::time < time '07:00'
     or (p_end_time at time zone 'Asia/Manila')::time > time '22:00'
     or extract(minute from p_start_time at time zone 'Asia/Manila')::int % 30 <> 0
     or extract(epoch from (p_end_time - p_start_time))::int % 1800 <> 0
     or p_end_time - p_start_time > interval '8 hours' then
    raise exception 'That time is outside the booking rules' using errcode = 'check_violation';
  end if;
  if p_attendee_count < 1 or p_attendee_count > room.capacity then
    raise exception 'Attendee count exceeds room capacity' using errcode = 'check_violation';
  end if;
  if btrim(p_event_name) = '' or length(p_event_name) > 120 or btrim(p_purpose) = '' or length(p_purpose) > 1000 then
    raise exception 'Please check the booking details' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('room:' || p_room_id::text, 0));
  if exists (
    select 1 from public.bookings b
    where b.id <> old.id and b.room_id = p_room_id and b.status in ('pending', 'approved')
      and tstzrange(b.start_time, b.end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)')
  ) then
    raise exception 'That time overlaps another booking for this room' using errcode = 'exclusion_violation';
  end if;

  insert into public.booking_edit_history (
    booking_id, edited_by, old_room_id, new_room_id, old_start_time, old_end_time,
    new_start_time, new_end_time, old_event_name, new_event_name, old_event_type,
    new_event_type, old_attendee_count, new_attendee_count, old_purpose, new_purpose
  ) values (
    old.id, public.app_current_user_id(), old.room_id, p_room_id, old.start_time, old.end_time,
    p_start_time, p_end_time, old.event_name, p_event_name, old.event_type, p_event_type,
    old.attendee_count, p_attendee_count, old.purpose, p_purpose
  );

  perform set_config('app.admin_booking_edit', old.id::text, true);
  return query update public.bookings
    set room_id = p_room_id, start_time = p_start_time, end_time = p_end_time,
        event_name = btrim(p_event_name), event_type = p_event_type,
        attendee_count = p_attendee_count, purpose = btrim(p_purpose),
        google_calendar_sync_error = null
    where id = old.id
    returning *;
end;
$$;

grant execute on function public.admin_edit_approved_booking(uuid, uuid, timestamptz, timestamptz, text, text, integer, text) to app_member;

create or replace function public.enforce_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rescheduling boolean := coalesce(current_setting('app.booking_reschedule', true), '') = old.id::text;
  admin_editing boolean := coalesce(current_setting('app.admin_booking_edit', true), '') = old.id::text;
begin
  if new.user_id is distinct from old.user_id
     or (not admin_editing and (
       new.room_id is distinct from old.room_id
       or new.event_name is distinct from old.event_name
       or new.event_type is distinct from old.event_type
       or new.attendee_count is distinct from old.attendee_count
       or new.purpose is distinct from old.purpose
     ))
     or ((new.start_time is distinct from old.start_time or new.end_time is distinct from old.end_time) and not (rescheduling or admin_editing))
     or new.created_at is distinct from old.created_at then
    raise exception 'Booking details cannot change after submission' using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'pending' and new.status in ('approved', 'denied', 'cancelled'))
    or (old.status = 'approved' and new.status = 'cancelled')
  ) then
    raise exception 'Invalid booking status change from % to %', old.status, new.status using errcode = 'check_violation';
  end if;
  if old.status = 'pending' and new.status = 'approved' and new.start_time <= now() then
    raise exception 'This request can no longer be approved because its start time has passed.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
