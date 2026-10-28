import type {
  AccessChange,
  AccessEvent,
  AccessStatus,
  Announcement,
  AssetCategory,
  AssetCondition,
  AssetMovement,
  Booking,
  BookingDetails,
  BookingWithRoom,
  Profile,
  RescheduleRequest,
  RescheduleStatus,
  Role,
  RoleChange,
  Room,
  RoomAsset,
  UserSummary,
  InventoryCategory,
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
  InventoryUnit,
  ItemRequest,
  ItemRequestHistory,
  ItemRequestStatus,
} from "@/lib/data/types";
import type { BookingStatus } from "@/lib/domain/booking-rules";

type Timestamp = Date | string;
const iso = (value: Timestamp): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());
const isoOrNull = (value: Timestamp | null): string | null => (value === null ? null : iso(value));

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  access_status: AccessStatus;
  access_reason: string | null;
  access_reviewed_at: Timestamp | null;
  access_notification_error: string | null;
  ghl_contact_id: string | null;
  created_at: Timestamp;
}

export interface RoomRow {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  capacity: number;
  best_for: string[] | null;
  location_label: string;
  building?: string | null;
  floor_level?: string | null;
  dimensions_l_m?: number | string | null;
  dimensions_w_m?: number | string | null;
  aircon_hp_total?: number | string | null;
  base_wattage_lights_av?: number | null;
  room_attributes?: Record<string, string | number | boolean> | null;
  is_archived?: boolean | null;
  image_path: string | null;
  map_image_path: string | null;
  ghl_calendar_id: string | null;
  is_active: boolean;
  display_order: number;
}

export interface BookingRow {
  id: string;
  user_id: string;
  room_id: string;
  event_name: string;
  event_type: string;
  purpose: string;
  attendee_count: number;
  start_time: Timestamp;
  end_time: Timestamp;
  status: BookingStatus;
  denial_reason: string | null;
  ghl_appointment_id: string | null;
  google_calendar_event_id: string | null;
  google_calendar_sync_error: string | null;
  ghl_notification_error: string | null;
  source: string;
  whatsapp_message_id: string | null;
  status_notification_status: string | null;
  status_notification_error: string | null;
  status_notified_at: Timestamp | null;
  reviewed_by: string | null;
  reviewed_at: Timestamp | null;
  review_locked_at: Timestamp | null;
  review_locked_by: string | null;
  created_at: Timestamp;
}

export interface BookingWithRoomRow extends BookingRow {
  room_name: string | null;
  room_slug: string | null;
  room_location: string | null;
}

export interface BookingDetailsRow extends BookingWithRoomRow {
  requester_name: string | null;
  requester_email: string | null;
  requester_phone: string | null;
  requester_ghl_contact_id: string | null;
  reviewer_name: string | null;
}

export interface AccessEventRow {
  id: string;
  change: AccessChange | RoleChange;
  reason: string | null;
  previous_role: Role | null;
  new_role: Role | null;
  actor_name: string | null;
  notification_error: string | null;
  notified_at: Timestamp | null;
  created_at: Timestamp;
}

export interface AnnouncementRow {
  id: string;
  internal_title: string;
  image_path: string;
  orientation: string;
  publish_at: Timestamp;
  expires_at: Timestamp | null;
  is_published: boolean;
  created_by: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export const BOOKING_WITH_ROOM_SELECT = `
  select b.*, r.name as room_name, r.slug as room_slug, r.location_label as room_location
  from public.bookings b
  left join public.rooms r on r.id = b.room_id`;

export const BOOKING_DETAILS_SELECT = `
  select b.*, r.name as room_name, r.slug as room_slug, r.location_label as room_location,
         p.full_name as requester_name, p.email as requester_email, p.phone as requester_phone,
         p.ghl_contact_id as requester_ghl_contact_id,
         rv.full_name as reviewer_name
  from public.bookings b
  left join public.rooms r on r.id = b.room_id
  left join public.profiles p on p.id = b.user_id
  left join public.profiles rv on rv.id = b.reviewed_by`;

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    accessStatus: row.access_status,
    accessReason: row.access_reason,
    accessReviewedAt: isoOrNull(row.access_reviewed_at),
    accessNotificationError: row.access_notification_error,
    ghlContactId: row.ghl_contact_id,
    createdAt: iso(row.created_at),
  };
}

export function toUserSummary(row: ProfileRow & { booking_count: number }): UserSummary {
  return { ...toProfile(row), bookingCount: Number(row.booking_count) };
}

export function toAccessEvent(row: AccessEventRow): AccessEvent {
  return {
    id: row.id,
    change: row.change,
    reason: row.reason,
    previousRole: row.previous_role ?? null,
    newRole: row.new_role ?? null,
    actorName: row.actor_name,
    notificationError: row.notification_error,
    notifiedAt: isoOrNull(row.notified_at),
    createdAt: iso(row.created_at),
  };
}

export function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    capacity: row.capacity,
    bestFor: row.best_for ?? [],
    locationLabel: row.location_label,
    building: row.building ?? "Main Building",
    floorLevel: row.floor_level ?? "Ground Floor",
    dimensionsLM: row.dimensions_l_m ? Number(row.dimensions_l_m) : 10,
    dimensionsWM: row.dimensions_w_m ? Number(row.dimensions_w_m) : 8,
    airconHpTotal: row.aircon_hp_total ? Number(row.aircon_hp_total) : 5,
    baseWattageLightsAv: row.base_wattage_lights_av ? Number(row.base_wattage_lights_av) : 1200,
    roomAttributes: row.room_attributes ?? {},
    isArchived: Boolean(row.is_archived),
    imagePath: row.image_path,
    mapImagePath: row.map_image_path,
    ghlCalendarId: row.ghl_calendar_id?.trim() || null,
    isActive: row.is_active,
    displayOrder: row.display_order,
  };
}

export function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    roomId: row.room_id,
    eventName: row.event_name,
    eventType: row.event_type,
    purpose: row.purpose,
    attendeeCount: row.attendee_count,
    startTime: iso(row.start_time),
    endTime: iso(row.end_time),
    status: row.status,
    denialReason: row.denial_reason,
    ghlAppointmentId: row.ghl_appointment_id,
    googleCalendarEventId: row.google_calendar_event_id,
    googleCalendarSyncError: row.google_calendar_sync_error,
    ghlNotificationError: row.ghl_notification_error ?? null,
    source: row.source === "whatsapp" ? "whatsapp" : "web",
    whatsappMessageId: row.whatsapp_message_id ?? null,
    statusNotificationStatus: row.status_notification_status ?? null,
    statusNotificationError: row.status_notification_error ?? null,
    statusNotifiedAt: isoOrNull(row.status_notified_at ?? null),
    reviewedBy: row.reviewed_by,
    reviewedAt: isoOrNull(row.reviewed_at),
    reviewLockedAt: isoOrNull(row.review_locked_at),
    reviewLockedBy: row.review_locked_by,
    createdAt: iso(row.created_at),
  };
}

export function toBookingWithRoom(row: BookingWithRoomRow): BookingWithRoom {
  return {
    ...toBooking(row),
    room: row.room_name
      ? { id: row.room_id, name: row.room_name, slug: row.room_slug ?? "", locationLabel: row.room_location ?? "" }
      : { id: row.room_id, name: "Unavailable room", slug: "", locationLabel: "" },
  };
}

export function toBookingDetails(row: BookingDetailsRow): BookingDetails {
  return {
    ...toBookingWithRoom(row),
    requester: {
      id: row.user_id,
      fullName: row.requester_name ?? "Unknown member",
      email: row.requester_email ?? "",
      phone: row.requester_phone,
      ghlContactId: row.requester_ghl_contact_id,
    },
    reviewer: row.reviewed_by && row.reviewer_name !== null ? { id: row.reviewed_by, fullName: row.reviewer_name } : null,
  };
}

export function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    internalTitle: row.internal_title,
    imagePath: row.image_path,
    orientation: row.orientation === "landscape" ? "landscape" : "portrait",
    publishAt: iso(row.publish_at),
    expiresAt: isoOrNull(row.expires_at),
    isPublished: row.is_published,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface RescheduleRow {
  id: string;
  booking_id: string;
  room_id: string;
  requested_by: string;
  original_start: Timestamp;
  original_end: Timestamp;
  requested_start: Timestamp;
  requested_end: Timestamp;
  status: RescheduleStatus;
  denial_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Timestamp | null;
  review_locked_at: Timestamp | null;
  review_locked_by: string | null;
  notification_error: string | null;
  created_at: Timestamp;
  reviewer_name?: string | null;
}

export function toRescheduleRequest(row: RescheduleRow): RescheduleRequest {
  return {
    id: row.id,
    bookingId: row.booking_id,
    roomId: row.room_id,
    requestedBy: row.requested_by,
    originalStart: iso(row.original_start),
    originalEnd: iso(row.original_end),
    requestedStart: iso(row.requested_start),
    requestedEnd: iso(row.requested_end),
    status: row.status,
    denialReason: row.denial_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: isoOrNull(row.reviewed_at),
    reviewLockedAt: isoOrNull(row.review_locked_at),
    reviewLockedBy: row.review_locked_by,
    notificationError: row.notification_error,
    createdAt: iso(row.created_at),
  };
}

export interface InventoryItemRow {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  current_stock: number;
  reorder_threshold: number;
  unit_cost: number | string | null;
  location: string;
  is_archived: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export function toInventoryItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currentStock: Number(row.current_stock),
    reorderThreshold: Number(row.reorder_threshold),
    unitCost: row.unit_cost !== null && row.unit_cost !== undefined ? Number(row.unit_cost) : null,
    location: row.location,
    isArchived: Boolean(row.is_archived),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface InventoryTransactionRow {
  id: string;
  item_id: string;
  item_name?: string | null;
  item_category?: InventoryCategory | null;
  item_unit?: InventoryUnit | null;
  transaction_type: InventoryTransactionType;
  quantity: number;
  balance_after: number;
  room_id: string | null;
  room_name?: string | null;
  booking_id: string | null;
  recipient_or_ministry: string | null;
  notes: string | null;
  created_by: string;
  created_by_name?: string | null;
  created_at: Timestamp;
}

export function toInventoryTransaction(row: InventoryTransactionRow): InventoryTransaction {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name ?? undefined,
    itemCategory: row.item_category ?? undefined,
    itemUnit: row.item_unit ?? undefined,
    transactionType: row.transaction_type,
    quantity: Number(row.quantity),
    balanceAfter: Number(row.balance_after),
    roomId: row.room_id,
    roomName: row.room_name ?? undefined,
    bookingId: row.booking_id,
    recipientOrMinistry: row.recipient_or_ministry,
    notes: row.notes,
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? undefined,
    createdAt: iso(row.created_at),
  };
}

export interface ItemRequestRow {
  id: string; booking_id: string; item_id: string | null; item_name: string; item_unit: InventoryUnit;
  quantity: number; notes: string | null; status: ItemRequestStatus; reviewed_by: string | null;
  reviewer_name?: string | null; reviewed_at: Timestamp | null; created_at: Timestamp; updated_at: Timestamp;
}
export function toItemRequest(row: ItemRequestRow): ItemRequest {
  return { id: row.id, bookingId: row.booking_id, itemId: row.item_id, itemName: row.item_name, itemUnit: row.item_unit,
    quantity: Number(row.quantity), notes: row.notes, status: row.status, reviewedBy: row.reviewed_by,
    reviewerName: row.reviewer_name ?? null, reviewedAt: isoOrNull(row.reviewed_at), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) };
}
export interface ItemRequestHistoryRow {
  id: string; item_request_id: string; from_status: ItemRequestStatus | null; to_status: ItemRequestStatus;
  changed_by: string | null; changed_by_name?: string | null; note: string | null; created_at: Timestamp;
}
export function toItemRequestHistory(row: ItemRequestHistoryRow): ItemRequestHistory {
  return { id: row.id, itemRequestId: row.item_request_id, fromStatus: row.from_status, toStatus: row.to_status,
    changedBy: row.changed_by, changedByName: row.changed_by_name ?? null, note: row.note, createdAt: iso(row.created_at) };
}

export interface RoomAssetRow {
  id: string;
  room_id: string;
  room_name?: string | null;
  name: string;
  asset_tag: string | null;
  category: AssetCategory;
  is_movable: boolean;
  condition: AssetCondition;
  quantity: number;
  serial_number: string | null;
  model_number: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export function toRoomAsset(row: RoomAssetRow): RoomAsset {
  return {
    id: row.id,
    roomId: row.room_id,
    roomName: row.room_name ?? null,
    name: row.name,
    assetTag: row.asset_tag,
    category: row.category,
    isMovable: Boolean(row.is_movable),
    condition: row.condition,
    quantity: Number(row.quantity),
    serialNumber: row.serial_number,
    modelNumber: row.model_number,
    notes: row.notes,
    isArchived: Boolean(row.is_archived),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface AssetMovementRow {
  id: string;
  asset_id: string;
  asset_name?: string | null;
  asset_tag?: string | null;
  from_room_id: string;
  from_room_name?: string | null;
  to_room_id: string;
  to_room_name?: string | null;
  moved_by: string;
  moved_by_name?: string | null;
  reason: string | null;
  moved_at: Timestamp;
}

export function toAssetMovement(row: AssetMovementRow): AssetMovement {
  return {
    id: row.id,
    assetId: row.asset_id,
    assetName: row.asset_name ?? null,
    assetTag: row.asset_tag ?? null,
    fromRoomId: row.from_room_id,
    fromRoomName: row.from_room_name ?? null,
    toRoomId: row.to_room_id,
    toRoomName: row.to_room_name ?? null,
    movedBy: row.moved_by,
    movedByName: row.moved_by_name ?? null,
    reason: row.reason,
    movedAt: iso(row.moved_at),
  };
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  actor_role: string;
  action: string;
  module: import("@/lib/data/types").SecurityModule;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Timestamp;
}

export function toAuditLogEntry(row: AuditLogRow): import("@/lib/data/types").AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    action: row.action,
    module: row.module,
    targetId: row.target_id,
    details: row.details ?? null,
    ipAddress: row.ip_address,
    createdAt: iso(row.created_at),
  };
}
