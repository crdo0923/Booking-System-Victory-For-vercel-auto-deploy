import "server-only";
import { asMember } from "@/lib/db/client";
import { PENDING_LIMIT_MESSAGE, RepositoryError, type Repository } from "@/lib/data/repository";
import type { AccessStatus, AnnouncementInput, LayoutPreset, RescheduleRequestDetails, RescheduleStatus, RoomLayout } from "@/lib/data/types";
import { PAST_DUE_MESSAGE, type BookingStatus } from "@/lib/domain/booking-rules";
import { INACTIVE_PROMOTION_MESSAGE, LAST_ADMIN_MESSAGE, OWN_ROLE_MESSAGE, SAME_ROLE_MESSAGE } from "@/lib/domain/roles";
import {
  BOOKING_DETAILS_SELECT,
  BOOKING_WITH_ROOM_SELECT,
  toAccessEvent,
  toAnnouncement,
  toBooking,
  toBookingDetails,
  toBookingWithRoom,
  toProfile,
  toRescheduleRequest,
  toRoom,
  toUserSummary,
  type AccessEventRow,
  type AnnouncementRow,
  type BookingDetailsRow,
  type BookingRow,
  type BookingWithRoomRow,
  type ProfileRow,
  type RescheduleRow,
  type RoomRow,
} from "@/lib/data/postgres/rows";

/** Messages raised by database triggers/functions, mapped to user-facing text. */
const DB_MESSAGES: Record<string, string> = {
  "Room is not available for booking": "This room is not available for booking.",
  "Attendee count exceeds room capacity": "The attendee count is more than this room holds.",
  "Booking must start in the future": "That time has already passed. Choose a future time.",
  "Bookings open up to 90 days ahead": "Bookings open up to 90 days ahead.",
  "That time is outside bookable hours": "That time is outside bookable hours.",
  "Bookings use 30-minute steps": "Bookings use 30-minute steps.",
  "You have too many pending requests": PENDING_LIMIT_MESSAGE,
  "Admins cannot change their own access": "You can't change your own access.",
  "Admins cannot change their own role": OWN_ROLE_MESSAGE,
  "That user already has this role": SAME_ROLE_MESSAGE,
  "Only active accounts can be made admins": INACTIVE_PROMOTION_MESSAGE,
  [LAST_ADMIN_MESSAGE]: LAST_ADMIN_MESSAGE,
  [PAST_DUE_MESSAGE]: PAST_DUE_MESSAGE,
  "Only approved bookings can be rescheduled": "Only approved bookings can be rescheduled.",
  "Past bookings cannot be rescheduled": "Past bookings can't be rescheduled.",
  "The booking changed after this request was made": "The booking changed after this request was made, so it can't be applied. Deny it and ask the member to request again.",
};

function toRepositoryError(error: unknown, context: string): RepositoryError {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  switch (code) {
    case "23P01":
      return new RepositoryError("conflict", "That time overlaps another booking for this room.");
    case "23505":
      return new RepositoryError("duplicate", "That request was already received.");
    case "23514":
    case "22023":
    case "23502":
    case "22P02":
      if (message?.startsWith("Invalid access change")) return new RepositoryError("invalid", "That access change isn't allowed from the user's current status.");
      return new RepositoryError("invalid", (message && DB_MESSAGES[message]) ?? "Some details were not accepted.");
    case "42501":
      return new RepositoryError("forbidden", "You do not have permission to do that.");
    default:
      console.error(`[db] ${context} failed (${code ?? "no code"}): ${message ?? "unknown error"}`);
      return new RepositoryError("unknown", "The database request failed.");
  }
}

const ANNOUNCEMENT_COLUMNS: Record<keyof AnnouncementInput, string> = {
  internalTitle: "internal_title",
  imagePath: "image_path",
  orientation: "orientation",
  publishAt: "publish_at",
  expiresAt: "expires_at",
  isPublished: "is_published",
};

const ACCESS_STATUSES: AccessStatus[] = ["pending", "active", "denied", "revoked"];
const BOOKING_STATUSES: BookingStatus[] = ["pending", "approved", "denied", "cancelled"];
const RESCHEDULE_STATUSES: RescheduleStatus[] = ["pending", "approved", "denied", "cancelled"];

/**
 * Repository backed by Neon Postgres. Every call runs as `app_member` for the
 * signed-in user (or with no user), so RLS and column grants apply.
 */
export function createPostgresRepository(actorId: string | null): Repository {
  async function query<R extends object>(context: string, text: string, params: unknown[] = []): Promise<R[]> {
    try {
      return (await asMember(actorId, text, params)) as R[];
    } catch (error) {
      throw toRepositoryError(error, context);
    }
  }
  const first = async <R extends object>(context: string, text: string, params: unknown[] = []) =>
    (await query<R>(context, text, params))[0] ?? null;

  const repo: Repository = {
    async getProfile(userId) {
      const row = await first<ProfileRow>("getProfile", "select * from public.profiles where id = $1", [userId]);
      return row ? toProfile(row) : null;
    },

    async listUsers(status) {
      const rows = await query<ProfileRow & { booking_count: number }>(
        "listUsers",
        `select p.*, (select count(*) from public.bookings b where b.user_id = p.id)::int as booking_count
         from public.profiles p
         where $1::public.access_status is null or p.access_status = $1::public.access_status
         order by p.created_at desc
         limit 500`,
        [status ?? null],
      );
      return rows.map(toUserSummary);
    },

    async countUsersByAccessStatus() {
      const rows = await query<{ access_status: AccessStatus; n: number }>(
        "countUsersByAccessStatus",
        "select access_status, count(*)::int as n from public.profiles group by access_status",
      );
      const counts = Object.fromEntries(ACCESS_STATUSES.map((s) => [s, 0])) as Record<AccessStatus, number>;
      for (const row of rows) counts[row.access_status] = row.n;
      return counts;
    },

    async listAccessEvents(userId) {
      const rows = await query<AccessEventRow>(
        "listAccessEvents",
        `select e.*, a.full_name as actor_name
         from public.account_access_events e
         left join public.profiles a on a.id = e.actor_id
         where e.user_id = $1 order by e.created_at desc limit 50`,
        [userId],
      );
      return rows.map(toAccessEvent);
    },

    async setUserAccess(userId, status, reason) {
      const row = await first<ProfileRow>("setUserAccess", "select * from public.admin_set_user_access($1, $2, $3)", [userId, status, reason]);
      return row ? toProfile(row) : null;
    },

    async setUserRole(userId, role) {
      const row = await first<ProfileRow>("setUserRole", "select * from public.admin_set_user_role($1, $2)", [userId, role]);
      return row ? toProfile(row) : null;
    },

    async setAccessNotificationResult(userId, error) {
      await query("setAccessNotificationResult", "select public.admin_set_access_notification($1, $2)", [userId, error]);
    },

    async saveGhlContactId(userId, contactId) {
      await query("saveGhlContactId", "select public.admin_set_ghl_contact($1, $2)", [userId, contactId]);
    },

    async listActiveRooms() {
      const rows = await query<RoomRow>("listActiveRooms", "select * from public.rooms where is_active and not coalesce(is_archived, false) order by display_order, name");
      return rows.map(toRoom);
    },

    async listAllRooms(options) {
      const sql = options?.includeArchived
        ? "select * from public.rooms order by display_order, name"
        : "select * from public.rooms where not coalesce(is_archived, false) order by display_order, name";
      const rows = await query<RoomRow>("listAllRooms", sql);
      return rows.map(toRoom);
    },

    async getRoomBySlug(slug) {
      const row = await first<RoomRow>("getRoomBySlug", "select * from public.rooms where slug = $1", [slug]);
      return row ? toRoom(row) : null;
    },

    async getRoomById(id) {
      const row = await first<RoomRow>("getRoomById", "select * from public.rooms where id = $1", [id]);
      return row ? toRoom(row) : null;
    },

    async createRoom(input) {
      const slug = (input.slug?.trim() || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) || "room-" + Date.now();
      const row = await first<RoomRow>(
        "createRoom",
        `insert into public.rooms (
          name, slug, short_description, full_description, capacity, best_for, location_label,
          building, floor_level, dimensions_l_m, dimensions_w_m, aircon_hp_total, base_wattage_lights_av,
          room_attributes, image_path, ghl_calendar_id, is_active, is_archived, display_order
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true, false,
          (select coalesce(max(display_order), 0) + 1 from public.rooms)
        ) returning *`,
        [
          input.name.trim(),
          slug,
          input.shortDescription.trim(),
          input.fullDescription?.trim() ?? input.shortDescription.trim(),
          input.capacity,
          input.bestFor ?? [],
          input.locationLabel.trim(),
          input.building?.trim() || "Main Building",
          input.floorLevel?.trim() || "Ground Floor",
          input.dimensionsLM ?? 10,
          input.dimensionsWM ?? 8,
          input.airconHpTotal ?? 5,
          input.baseWattageLightsAv ?? 1200,
          JSON.stringify(input.roomAttributes ?? {}),
          input.imagePath ?? null,
          input.ghlCalendarId?.trim() || null,
        ],
      );
      if (!row) throw new RepositoryError("unknown", "Failed to create room.");
      return toRoom(row);
    },

    async updateRoom(id, input) {
      const current = await this.getRoomById(id);
      if (!current) throw new RepositoryError("not_found", "Room not found.");
      const row = await first<RoomRow>(
        "updateRoom",
        `update public.rooms set
          name = coalesce($2, name),
          slug = coalesce($3, slug),
          short_description = coalesce($4, short_description),
          full_description = coalesce($5, full_description),
          capacity = coalesce($6, capacity),
          best_for = coalesce($7, best_for),
          location_label = coalesce($8, location_label),
          building = coalesce($9, building),
          floor_level = coalesce($10, floor_level),
          dimensions_l_m = coalesce($11, dimensions_l_m),
          dimensions_w_m = coalesce($12, dimensions_w_m),
          aircon_hp_total = coalesce($13, aircon_hp_total),
          base_wattage_lights_av = coalesce($14, base_wattage_lights_av),
          room_attributes = coalesce($15, room_attributes),
          image_path = coalesce($16, image_path),
          ghl_calendar_id = coalesce($17, ghl_calendar_id),
          is_active = coalesce($18, is_active),
          is_archived = coalesce($19, is_archived),
          display_order = coalesce($20, display_order)
        where id = $1 returning *`,
        [
          id,
          input.name?.trim(),
          input.slug?.trim(),
          input.shortDescription?.trim(),
          input.fullDescription?.trim(),
          input.capacity,
          input.bestFor,
          input.locationLabel?.trim(),
          input.building?.trim(),
          input.floorLevel?.trim(),
          input.dimensionsLM,
          input.dimensionsWM,
          input.airconHpTotal,
          input.baseWattageLightsAv,
          input.roomAttributes ? JSON.stringify(input.roomAttributes) : null,
          input.imagePath,
          input.ghlCalendarId?.trim(),
          input.isActive,
          input.isArchived,
          input.displayOrder,
        ],
      );
      if (!row) throw new RepositoryError("unknown", "Failed to update room.");
      return toRoom(row);
    },

    async archiveRoom(id, archived) {
      const row = await first<RoomRow>(
        "archiveRoom",
        "update public.rooms set is_archived = $2, is_active = not $2 where id = $1 returning *",
        [id, archived],
      );
      if (!row) throw new RepositoryError("not_found", "Room not found.");
      return toRoom(row);
    },

    async getBusyRanges(roomId, from, to, options) {
      const rows = await query<{ start_time: Date; end_time: Date }>(
        "getBusyRanges",
        "select * from public.get_room_busy_ranges($1, $2, $3, $4)",
        [roomId, from, to, options?.excludeRescheduleId ?? null],
      );
      return rows.map((row) => ({ start: new Date(row.start_time).getTime(), end: new Date(row.end_time).getTime() }));
    },

    async findConflictingBookings(roomId, range, excludeBookingId) {
      const rows = await query<BookingRow>(
        "findConflictingBookings",
        `select * from public.bookings
         where room_id = $1 and status in ('pending', 'approved') and start_time < $3 and end_time > $2
           and ($4::uuid is null or id <> $4::uuid)`,
        [roomId, new Date(range.start), new Date(range.end), excludeBookingId ?? null],
      );
      return rows.map(toBooking);
    },

    async insertBooking(input) {
      const row = await first<BookingRow>(
        "insertBooking",
        `insert into public.bookings (user_id, room_id, event_name, event_type, purpose, attendee_count, start_time, end_time, source, whatsapp_message_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [
          input.userId,
          input.roomId,
          input.eventName,
          input.eventType,
          input.purpose,
          input.attendeeCount,
          input.startTime,
          input.endTime,
          input.source ?? "web",
          input.whatsappMessageId ?? null,
        ],
      );
      return toBooking(row!);
    },

    async findBookingByWhatsAppMessageId(messageId) {
      const row = await first<BookingDetailsRow>(
        "findBookingByWhatsAppMessageId",
        `${BOOKING_DETAILS_SELECT} where b.whatsapp_message_id = $1`,
        [messageId],
      );
      return row ? toBookingDetails(row) : null;
    },

    async listBookingsForUser(userId) {
      const rows = await query<BookingWithRoomRow>(
        "listBookingsForUser",
        `${BOOKING_WITH_ROOM_SELECT} where b.user_id = $1 order by b.start_time desc limit 200`,
        [userId],
      );
      return rows.map(toBookingWithRoom);
    },

    async listBookingsByStatus(status, limit = 100) {
      const order = status === "denied" ? "b.reviewed_at desc nulls last" : "b.start_time asc";
      const rows = await query<BookingDetailsRow>(
        "listBookingsByStatus",
        `${BOOKING_DETAILS_SELECT} where b.status = $1 order by ${order} limit $2`,
        [status, limit],
      );
      return rows.map(toBookingDetails);
    },

    async listBookingsBetween(from, to, statuses) {
      const rows = await query<BookingDetailsRow>(
        "listBookingsBetween",
        `${BOOKING_DETAILS_SELECT} where b.status = any($3::public.booking_status[]) and b.start_time < $2 and b.end_time > $1
         order by b.start_time limit 200`,
        [from, to, statuses],
      );
      return rows.map(toBookingDetails);
    },

    async getBookingDetails(id) {
      const row = await first<BookingDetailsRow>("getBookingDetails", `${BOOKING_DETAILS_SELECT} where b.id = $1`, [id]);
      return row ? toBookingDetails(row) : null;
    },

    async countBookingsByStatus() {
      const rows = await query<{ status: BookingStatus; n: number }>(
        "countBookingsByStatus",
        "select status, count(*)::int as n from public.bookings group by status",
      );
      const counts = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
      for (const row of rows) counts[row.status] = row.n;
      return counts;
    },

    async claimBookingForReview(id, adminId, now, staleBefore) {
      const row = await first<BookingRow>(
        "claimBookingForReview",
        `update public.bookings set review_locked_at = $2, review_locked_by = $3
         where id = $1 and status = 'pending' and (review_locked_at is null or review_locked_at < $4)
         returning *`,
        [id, now, adminId, staleBefore],
      );
      return row ? toBooking(row) : null;
    },

    async releaseReviewClaim(id, adminId) {
      await query(
        "releaseReviewClaim",
        "update public.bookings set review_locked_at = null, review_locked_by = null where id = $1 and review_locked_by = $2",
        [id, adminId],
      );
    },

    async markApproved(id, adminId, ghlAppointmentId, now) {
      const row = await first<BookingRow>(
        "markApproved",
        `update public.bookings
         set status = 'approved', ghl_appointment_id = $3, reviewed_by = $2, reviewed_at = $4,
             review_locked_at = null, review_locked_by = null
         where id = $1 and status = 'pending' and review_locked_by = $2
         returning *`,
        [id, adminId, ghlAppointmentId, now],
      );
      return row ? toBooking(row) : null;
    },

    async markDenied(id, adminId, reason, now) {
      const row = await first<BookingRow>(
        "markDenied",
        `update public.bookings
         set status = 'denied', denial_reason = $3, reviewed_by = $2, reviewed_at = $4,
             review_locked_at = null, review_locked_by = null
         where id = $1 and status = 'pending' and review_locked_by = $2
         returning *`,
        [id, adminId, reason, now],
      );
      return row ? toBooking(row) : null;
    },

    async cancelOwnBooking(id) {
      const row = await first<BookingRow>("cancelOwnBooking", "select * from public.cancel_my_booking($1)", [id]);
      return row ? toBooking(row) : null;
    },

    async cancelApprovedBooking(id) {
      const row = await first<BookingRow>(
        "cancelApprovedBooking",
        "update public.bookings set status = 'cancelled' where id = $1 and status = 'approved' returning *",
        [id],
      );
      return row ? toBooking(row) : null;
    },

    async setCalendarSync(bookingId, eventId, error) {
      await query("setCalendarSync", "select public.set_booking_calendar_sync($1, $2, $3)", [bookingId, eventId, error]);
    },

    async insertRescheduleRequest(input) {
      const row = await first<RescheduleRow>(
        "insertRescheduleRequest",
        "insert into public.booking_reschedule_requests (booking_id, requested_start, requested_end) values ($1, $2, $3) returning *",
        [input.bookingId, input.requestedStart, input.requestedEnd],
      );
      return toRescheduleRequest(row!);
    },

    async getRescheduleRequest(id) {
      const row = await first<RescheduleRow>(
        "getRescheduleRequest",
        `select r.*, rv.full_name as reviewer_name from public.booking_reschedule_requests r
         left join public.profiles rv on rv.id = r.reviewed_by where r.id = $1`,
        [id],
      );
      if (!row) return null;
      const booking = await repo.getBookingDetails(row.booking_id);
      if (!booking) return null;
      return { ...toRescheduleRequest(row), booking, reviewer: row.reviewed_by ? { id: row.reviewed_by, fullName: row.reviewer_name ?? "" } : null };
    },

    async listRescheduleRequestsForBooking(bookingId) {
      const rows = await query<RescheduleRow>(
        "listRescheduleRequestsForBooking",
        "select * from public.booking_reschedule_requests where booking_id = $1 order by created_at desc limit 50",
        [bookingId],
      );
      return rows.map(toRescheduleRequest);
    },

    async listRescheduleRequestsForUser(userId) {
      const rows = await query<RescheduleRow>(
        "listRescheduleRequestsForUser",
        "select * from public.booking_reschedule_requests where requested_by = $1 order by created_at desc limit 200",
        [userId],
      );
      return rows.map(toRescheduleRequest);
    },

    async listRescheduleRequestsByStatus(status, limit = 100) {
      const order = status === "pending" ? "r.requested_start asc" : "r.reviewed_at desc nulls last, r.created_at desc";
      const rows = await query<RescheduleRow>(
        "listRescheduleRequestsByStatus",
        `select r.*, rv.full_name as reviewer_name from public.booking_reschedule_requests r
         left join public.profiles rv on rv.id = r.reviewed_by
         where r.status = $1 order by ${order} limit $2`,
        [status, limit],
      );
      if (rows.length === 0) return [];
      const bookings = await query<BookingDetailsRow>("listRescheduleBookings", `${BOOKING_DETAILS_SELECT} where b.id = any($1::uuid[])`, [
        [...new Set(rows.map((row) => row.booking_id))],
      ]);
      const byId = new Map(bookings.map((row) => [row.id, toBookingDetails(row)]));
      return rows.flatMap((row): RescheduleRequestDetails[] => {
        const booking = byId.get(row.booking_id);
        return booking
          ? [{ ...toRescheduleRequest(row), booking, reviewer: row.reviewed_by ? { id: row.reviewed_by, fullName: row.reviewer_name ?? "" } : null }]
          : [];
      });
    },

    async countRescheduleRequestsByStatus() {
      const rows = await query<{ status: RescheduleStatus; n: number }>(
        "countRescheduleRequestsByStatus",
        "select status, count(*)::int as n from public.booking_reschedule_requests group by status",
      );
      const counts = Object.fromEntries(RESCHEDULE_STATUSES.map((s) => [s, 0])) as Record<RescheduleStatus, number>;
      for (const row of rows) counts[row.status] = row.n;
      return counts;
    },

    async claimRescheduleForReview(id, adminId, now, staleBefore) {
      const row = await first<RescheduleRow>(
        "claimRescheduleForReview",
        `update public.booking_reschedule_requests set review_locked_at = $2, review_locked_by = $3
         where id = $1 and status = 'pending' and (review_locked_at is null or review_locked_at < $4)
         returning *`,
        [id, now, adminId, staleBefore],
      );
      return row ? toRescheduleRequest(row) : null;
    },

    async releaseRescheduleClaim(id, adminId) {
      await query(
        "releaseRescheduleClaim",
        "update public.booking_reschedule_requests set review_locked_at = null, review_locked_by = null where id = $1 and review_locked_by = $2",
        [id, adminId],
      );
    },

    async applyReschedule(id) {
      const row = await first<BookingRow>("applyReschedule", "select * from public.admin_apply_reschedule($1)", [id]);
      return row ? toBooking(row) : null;
    },

    async markRescheduleDenied(id, adminId, reason, now) {
      const row = await first<RescheduleRow>(
        "markRescheduleDenied",
        `update public.booking_reschedule_requests
         set status = 'denied', denial_reason = $3, reviewed_by = $2, reviewed_at = $4,
             review_locked_at = null, review_locked_by = null
         where id = $1 and status = 'pending' and review_locked_by = $2
         returning *`,
        [id, adminId, reason, now],
      );
      return row ? toRescheduleRequest(row) : null;
    },

    async cancelOwnReschedule(id) {
      const row = await first<RescheduleRow>("cancelOwnReschedule", "select * from public.cancel_my_reschedule($1)", [id]);
      return row ? toRescheduleRequest(row) : null;
    },

    async setBookingNotificationResult(bookingId, error) {
      await query("setBookingNotificationResult", "update public.bookings set ghl_notification_error = $2 where id = $1", [bookingId, error]);
    },

    async setRescheduleNotificationResult(id, error) {
      await query("setRescheduleNotificationResult", "update public.booking_reschedule_requests set notification_error = $2 where id = $1", [id, error]);
    },

    async listLiveAnnouncements() {
      const rows = await query<AnnouncementRow>(
        "listLiveAnnouncements",
        `select * from public.announcements
         where is_published and publish_at <= now() and (expires_at is null or expires_at > now())
         order by publish_at desc limit 24`,
      );
      return rows.map(toAnnouncement);
    },

    async listAllAnnouncements() {
      const rows = await query<AnnouncementRow>("listAllAnnouncements", "select * from public.announcements order by publish_at desc limit 200");
      return rows.map(toAnnouncement);
    },

    async getAnnouncement(id) {
      const row = await first<AnnouncementRow>("getAnnouncement", "select * from public.announcements where id = $1", [id]);
      return row ? toAnnouncement(row) : null;
    },

    async findAnnouncementByImagePath(path) {
      const row = await first<AnnouncementRow>("findAnnouncementByImagePath", "select * from public.announcements where image_path = $1 limit 1", [path]);
      return row ? toAnnouncement(row) : null;
    },

    async createAnnouncement(input, createdBy) {
      const row = await first<AnnouncementRow>(
        "createAnnouncement",
        `insert into public.announcements (internal_title, image_path, orientation, publish_at, expires_at, is_published, created_by)
         values ($1, $2, $3, $4, $5, $6, $7) returning *`,
        [input.internalTitle, input.imagePath, input.orientation, input.publishAt, input.expiresAt, input.isPublished, createdBy],
      );
      return toAnnouncement(row!);
    },

    async updateAnnouncement(id, input) {
      const keys = (Object.keys(ANNOUNCEMENT_COLUMNS) as (keyof AnnouncementInput)[]).filter((key) => input[key] !== undefined);
      if (keys.length === 0) return repo.getAnnouncement(id);
      const sets = keys.map((key, i) => `${ANNOUNCEMENT_COLUMNS[key]} = $${i + 2}`).join(", ");
      const row = await first<AnnouncementRow>(
        "updateAnnouncement",
        `update public.announcements set ${sets} where id = $1 returning *`,
        [id, ...keys.map((key) => input[key])],
      );
      return row ? toAnnouncement(row) : null;
    },

    async deleteAnnouncement(id) {
      const row = await first<AnnouncementRow>("deleteAnnouncement", "delete from public.announcements where id = $1 returning *", [id]);
      return row ? toAnnouncement(row) : null;
    },

    async getRoomLayout(roomId) {
      const room = await this.getRoomById(roomId);
      if (!room || !room.roomAttributes || !room.roomAttributes.layout) return null;
      return room.roomAttributes.layout as unknown as RoomLayout;
    },

    async saveRoomLayout(roomId, layout) {
      const current = await this.getRoomById(roomId);
      if (!current) throw new RepositoryError("not_found", "Room not found.");
      const nowIso = new Date().toISOString();
      const savedLayout: RoomLayout = {
        id: (current.roomAttributes?.layout as { id?: string })?.id || `layout-${roomId}`,
        roomId,
        name: layout.name,
        elements: layout.elements,
        gridSnapMeters: layout.gridSnapMeters ?? 0.5,
        totalSeats: layout.totalSeats ?? 0,
        updatedAt: nowIso,
      };

      const updatedAttributes = {
        ...(current.roomAttributes ?? {}),
        layout: savedLayout,
      };

      await this.updateRoom(roomId, {
        roomAttributes: updatedAttributes,
      });

      return savedLayout;
    },

    async listLayoutPresets() {
      // Default standard church presets
      return [
        {
          id: "preset-sunday-worship",
          name: "Sunday Worship (Theater Rows)",
          description: "Front elevated platform with pulpit, centered chair aisles, and rear sound/tech booth.",
          category: "worship",
          defaultCapacity: 48,
          elements: [
            { id: "elem-stage-1", type: "stage", x: 2.5, y: 0.5, width: 5.0, length: 2.0, rotation: 0, label: "Main Platform" },
            { id: "elem-podium-1", type: "podium", x: 4.5, y: 1.2, width: 1.0, length: 0.8, rotation: 0, label: "Pulpit" },
            { id: "elem-aisle-center", type: "aisle", x: 4.4, y: 3.0, width: 1.2, length: 4.5, rotation: 0, label: "Center Aisle" },
            { id: "elem-rows-left", type: "chair_row", x: 1.0, y: 3.0, width: 3.0, length: 4.0, rotation: 0, chairsPerRow: 6, rowCount: 4, seats: 24, label: "Left Section (24 seats)" },
            { id: "elem-rows-right", type: "chair_row", x: 6.0, y: 3.0, width: 3.0, length: 4.0, rotation: 0, chairsPerRow: 6, rowCount: 4, seats: 24, label: "Right Section (24 seats)" },
            { id: "elem-booth-1", type: "sound_booth", x: 3.5, y: 7.2, width: 3.0, length: 1.2, rotation: 0, label: "Sound & Livestream Booth" },
            { id: "elem-door-entry", type: "door", x: 8.5, y: 8.0, width: 1.2, length: 0.4, rotation: 0, label: "Rear Entry Door" },
          ],
        },
        {
          id: "preset-leadership-classroom",
          name: "Leadership Workshop (Classroom)",
          description: "Rectangular seminar tables with chairs facing front screen and speaker podium.",
          category: "classroom",
          defaultCapacity: 24,
          elements: [
            { id: "elem-podium-cls", type: "podium", x: 4.5, y: 0.8, width: 1.0, length: 0.8, rotation: 0, label: "Instructor Podium" },
            { id: "elem-tbl-1", type: "rect_table", x: 1.5, y: 2.5, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 1 (3 pax)" },
            { id: "elem-tbl-2", type: "rect_table", x: 6.0, y: 2.5, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 2 (3 pax)" },
            { id: "elem-tbl-3", type: "rect_table", x: 1.5, y: 4.2, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 3 (3 pax)" },
            { id: "elem-tbl-4", type: "rect_table", x: 6.0, y: 4.2, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 4 (3 pax)" },
            { id: "elem-tbl-5", type: "rect_table", x: 1.5, y: 5.9, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 5 (3 pax)" },
            { id: "elem-tbl-6", type: "rect_table", x: 6.0, y: 5.9, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 6 (3 pax)" },
            { id: "elem-tbl-7", type: "rect_table", x: 1.5, y: 7.6, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 7 (3 pax)" },
            { id: "elem-tbl-8", type: "rect_table", x: 6.0, y: 7.6, width: 2.4, length: 0.9, rotation: 0, tableDimensionsInches: "30x96", seats: 3, label: "Table 8 (3 pax)" },
          ],
        },
        {
          id: "preset-life-group-circle",
          name: "Life Group Circle",
          description: "60-inch round banquet tables arranged for intimate discipleship and discussion.",
          category: "fellowship",
          defaultCapacity: 32,
          elements: [
            { id: "elem-rnd-1", type: "round_table", x: 2.0, y: 1.5, width: 2.4, length: 2.4, rotation: 0, tableDiameterInches: 60, seats: 8, label: "Circle 1 (8 seats)" },
            { id: "elem-rnd-2", type: "round_table", x: 6.0, y: 1.5, width: 2.4, length: 2.4, rotation: 0, tableDiameterInches: 60, seats: 8, label: "Circle 2 (8 seats)" },
            { id: "elem-rnd-3", type: "round_table", x: 2.0, y: 4.8, width: 2.4, length: 2.4, rotation: 0, tableDiameterInches: 60, seats: 8, label: "Circle 3 (8 seats)" },
            { id: "elem-rnd-4", type: "round_table", x: 6.0, y: 4.8, width: 2.4, length: 2.4, rotation: 0, tableDiameterInches: 60, seats: 8, label: "Circle 4 (8 seats)" },
          ],
        },
        {
          id: "preset-prayer-worship-open",
          name: "Prayer & Worship Night (Open Front)",
          description: "Front open ministry space for altar prayer, flanked by outer seating blocks.",
          category: "prayer",
          defaultCapacity: 30,
          elements: [
            { id: "elem-stage-pwn", type: "stage", x: 3.0, y: 0.5, width: 4.0, length: 1.5, rotation: 0, label: "Worship Team Platform" },
            { id: "elem-aisle-open", type: "aisle", x: 2.5, y: 2.5, width: 5.0, length: 2.5, rotation: 0, label: "Open Prayer & Altar Area" },
            { id: "elem-rows-pwn-l", type: "chair_row", x: 0.5, y: 5.5, width: 3.5, length: 3.0, rotation: 0, chairsPerRow: 5, rowCount: 3, seats: 15, label: "Left Seating (15 seats)" },
            { id: "elem-rows-pwn-r", type: "chair_row", x: 6.0, y: 5.5, width: 3.5, length: 3.0, rotation: 0, chairsPerRow: 5, rowCount: 3, seats: 15, label: "Right Seating (15 seats)" },
            { id: "elem-booth-pwn", type: "sound_booth", x: 4.0, y: 7.5, width: 2.0, length: 1.2, rotation: 0, label: "Audio Console" },
          ],
        },
      ];
    },

    async saveLayoutAsPreset(preset) {
      // In Postgres, return a synthesized preset
      return {
        id: "preset-" + Date.now(),
        ...preset,
      };
    },

    async listKioskDisplays() {
      try {
        const rows = await query<any>(
          "listKioskDisplays",
          `select id, token, display_type as "displayType", room_id as "roomId", label, is_active as "isActive", last_seen_at as "lastSeenAt", created_at as "createdAt"
           from public.kiosk_displays
           order by created_at desc`,
        );
        return rows.map((r) => ({
          id: r.id,
          token: r.token,
          displayType: r.displayType,
          roomId: r.roomId,
          label: r.label,
          isActive: Boolean(r.isActive),
          lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
          createdAt: new Date(r.createdAt).toISOString(),
        }));
      } catch {
        return [];
      }
    },

    async getKioskDisplayByToken(token) {
      try {
        const r = await first<any>(
          "getKioskDisplayByToken",
          `select id, token, display_type as "displayType", room_id as "roomId", label, is_active as "isActive", last_seen_at as "lastSeenAt", created_at as "createdAt"
           from public.kiosk_displays
           where token = $1 and is_active = true
           limit 1`,
          [token],
        );
        if (!r) return null;
        return {
          id: r.id,
          token: r.token,
          displayType: r.displayType,
          roomId: r.roomId,
          label: r.label,
          isActive: Boolean(r.isActive),
          lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
          createdAt: new Date(r.createdAt).toISOString(),
        };
      } catch {
        return null;
      }
    },

    async createKioskDisplay(input) {
      const token = `kiosk_${crypto.randomUUID().replace(/-/g, "")}`;
      const r = await first<any>(
        "createKioskDisplay",
        `insert into public.kiosk_displays (display_type, room_id, label, token)
         values ($1, $2, $3, $4)
         returning id, token, display_type as "displayType", room_id as "roomId", label, is_active as "isActive", last_seen_at as "lastSeenAt", created_at as "createdAt"`,
        [input.displayType, input.roomId ?? null, input.label, token],
      );
      if (!r) throw new RepositoryError("unknown", "Failed to create kiosk display.");
      return {
        id: r.id,
        token: r.token,
        displayType: r.displayType,
        roomId: r.roomId,
        label: r.label,
        isActive: Boolean(r.isActive),
        lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
        createdAt: new Date(r.createdAt).toISOString(),
      };
    },

    async revokeKioskDisplay(id) {
      try {
        const rows = await query<any>(
          "revokeKioskDisplay",
          `update public.kiosk_displays
           set is_active = false
           where id = $1
           returning id`,
          [id],
        );
        return rows.length > 0;
      } catch {
        return false;
      }
    },

    async touchKioskDisplay(token) {
      try {
        await query(
          "touchKioskDisplay",
          `update public.kiosk_displays
           set last_seen_at = now()
           where token = $1`,
          [token],
        );
      } catch {
        // Non-blocking telemetry
      }
    },
  };
  return repo;
}
