import type { BookingStatus } from "@/lib/domain/booking-rules";

export type Role = "user" | "admin";

export type AccessStatus = "pending" | "active" | "denied" | "revoked";
export type AccessChange = "approved" | "denied" | "revoked" | "restored";
/** Admin-role changes, kept in the same history as access changes. */
export type RoleChange = "promoted" | "demoted";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  accessStatus: AccessStatus;
  accessReason: string | null;
  accessReviewedAt: string | null;
  /** Set when the latest GHL account-status email failed, so it can be retried. */
  accessNotificationError: string | null;
  ghlContactId: string | null;
  createdAt: string;
}

export interface UserSummary extends Profile {
  bookingCount: number;
}

export interface AccessEvent {
  id: string;
  change: AccessChange | RoleChange;
  reason: string | null;
  /** Role changes only. */
  previousRole: Role | null;
  newRole: Role | null;
  actorName: string | null;
  notificationError: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  capacity: number;
  bestFor: string[];
  locationLabel: string;
  building?: string;
  floorLevel?: string;
  dimensionsLM?: number;
  dimensionsWM?: number;
  airconHpTotal?: number;
  baseWattageLightsAv?: number;
  customStatus?: "auto" | "available" | "in_use" | "maintenance" | "cleaning";
  customStatusMessage?: string | null;
  customStatusSubtitle?: string | null;
  roomAttributes?: Record<string, any>;
  isArchived?: boolean;
  imagePath: string | null;
  mapImagePath: string | null;
  ghlCalendarId: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface CreateRoomInput {
  name: string;
  slug?: string;
  shortDescription: string;
  fullDescription?: string;
  capacity: number;
  bestFor?: string[];
  locationLabel: string;
  building?: string;
  floorLevel?: string;
  dimensionsLM?: number;
  dimensionsWM?: number;
  airconHpTotal?: number;
  baseWattageLightsAv?: number;
  customStatus?: "auto" | "available" | "in_use" | "maintenance" | "cleaning";
  customStatusMessage?: string | null;
  customStatusSubtitle?: string | null;
  roomAttributes?: Record<string, any>;
  imagePath?: string | null;
  ghlCalendarId?: string | null;
}

export interface UpdateRoomInput {
  name?: string;
  slug?: string;
  shortDescription?: string;
  fullDescription?: string;
  capacity?: number;
  bestFor?: string[];
  locationLabel?: string;
  building?: string;
  floorLevel?: string;
  dimensionsLM?: number;
  dimensionsWM?: number;
  airconHpTotal?: number;
  baseWattageLightsAv?: number;
  customStatus?: "auto" | "available" | "in_use" | "maintenance" | "cleaning";
  customStatusMessage?: string | null;
  customStatusSubtitle?: string | null;
  roomAttributes?: Record<string, any>;
  imagePath?: string | null;
  ghlCalendarId?: string | null;
  isActive?: boolean;
  isArchived?: boolean;
  displayOrder?: number;
}

export type BookingSource = "web" | "whatsapp";

export interface Booking {
  id: string;
  userId: string;
  roomId: string;
  eventName: string;
  eventType: string;
  purpose: string;
  attendeeCount: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  denialReason: string | null;
  ghlAppointmentId: string | null;
  googleCalendarEventId: string | null;
  googleCalendarSyncError: string | null;
  /** Set when the GHL email for the admin's decision (the denial email) failed, so it can be retried. */
  ghlNotificationError: string | null;
  /** Where the request came from. WhatsApp requests come through the n8n assistant. */
  source: BookingSource;
  /** WhatsApp message that created the request (idempotency key). */
  whatsappMessageId: string | null;
  /** Last status notification sent to n8n (WhatsApp bookings only). */
  statusNotificationStatus: string | null;
  statusNotificationError: string | null;
  statusNotifiedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewLockedAt: string | null;
  reviewLockedBy: string | null;
  createdAt: string;
}

export interface BookingWithRoom extends Booking {
  room: Pick<Room, "id" | "name" | "slug" | "locationLabel">;
}

export interface BookingDetails extends BookingWithRoom {
  requester: Pick<Profile, "id" | "fullName" | "email" | "phone" | "ghlContactId">;
  reviewer: Pick<Profile, "id" | "fullName"> | null;
}

export type RescheduleStatus = "pending" | "approved" | "denied" | "cancelled";

/** A member's request to move an approved booking to a new time in the same room. */
export interface RescheduleRequest {
  id: string;
  bookingId: string;
  roomId: string;
  requestedBy: string;
  originalStart: string;
  originalEnd: string;
  requestedStart: string;
  requestedEnd: string;
  status: RescheduleStatus;
  denialReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewLockedAt: string | null;
  reviewLockedBy: string | null;
  /** Last GHL email problem for this request, if any. */
  notificationError: string | null;
  createdAt: string;
}

export interface RescheduleRequestDetails extends RescheduleRequest {
  booking: BookingDetails;
  reviewer: Pick<Profile, "id" | "fullName"> | null;
}

export interface NewBooking {
  userId: string;
  source?: BookingSource;
  whatsappMessageId?: string | null;
  roomId: string;
  eventName: string;
  eventType: string;
  purpose: string;
  attendeeCount: number;
  startTime: string;
  endTime: string;
}

export type PosterOrientation = "portrait" | "landscape";

export interface Announcement {
  id: string;
  internalTitle: string;
  imagePath: string;
  /** Portrait posters are shown at 4:5, landscape at 16:9. */
  orientation: PosterOrientation;
  publishAt: string;
  expiresAt: string | null;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementInput {
  internalTitle: string;
  imagePath: string;
  orientation: PosterOrientation;
  publishAt: string;
  expiresAt: string | null;
  isPublished: boolean;
}

export type LayoutElementType =
  | "stage"
  | "podium"
  | "sound_booth"
  | "round_table"
  | "rect_table"
  | "chair_row"
  | "pillar"
  | "door"
  | "aisle";

export interface LayoutElement {
  id: string;
  type: LayoutElementType;
  x: number; // in meters relative to room top-left
  y: number; // in meters relative to room top-left
  width: number; // in meters
  length: number; // in meters (height on 2D plane)
  rotation: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
  label?: string;
  seats?: number; // Calculated or configured seat count
  // Custom props per element type
  tableDiameterInches?: 36 | 48 | 60 | 72; // For round tables
  tableDimensionsInches?: "30x72" | "30x96"; // For rect classroom tables
  chairsPerRow?: number; // For chair rows
  rowCount?: number; // For multi-row blocks
  color?: string; // Optional custom color/accent
}

export interface RoomLayout {
  id: string;
  roomId: string;
  name: string;
  elements: LayoutElement[];
  gridSnapMeters: number; // Default 0.5
  totalSeats: number;
  updatedAt: string;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  category: "worship" | "classroom" | "fellowship" | "prayer";
  defaultCapacity: number;
  elements: LayoutElement[];
}

export type KioskDisplayType = "door_sign" | "lobby_hub";

export interface KioskDisplay {
  id: string;
  token: string;
  displayType: KioskDisplayType;
  roomId?: string | null;
  label: string;
  isActive: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
}

export interface CreateKioskDisplayInput {
  displayType: KioskDisplayType;
  roomId?: string | null;
  label: string;
}

export type InventoryCategory = "communion" | "av_tech" | "hospitality" | "paper_office" | "cleaning";
export type InventoryUnit = "pieces" | "boxes" | "packs" | "rolls" | "bottles";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  currentStock: number;
  reorderThreshold: number;
  unitCost?: number | null;
  location: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemInput {
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  currentStock: number;
  reorderThreshold: number;
  unitCost?: number | null;
  location: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: InventoryCategory;
  unit?: InventoryUnit;
  currentStock?: number;
  reorderThreshold?: number;
  unitCost?: number | null;
  location?: string;
  isArchived?: boolean;
}


