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
  systemRole?: SystemRole;
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
  roomAttributes?: Record<string, unknown>;
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
  roomAttributes?: Record<string, unknown>;
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
  roomAttributes?: Record<string, unknown>;
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

export type ShuttleStatus = "pending" | "approved" | "denied";
export interface ShuttleRequest {
  id: string;
  userId: string;
  dates: string[];
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string | null;
  passengerCount: number;
  purpose: string;
  estimatedGas: number;
  estimatedToll: number;
  estimatedOther: number;
  finalGas: number | null;
  finalToll: number | null;
  finalOther: number | null;
  status: ShuttleStatus;
  denialReason: string | null;
  driverId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}
export interface ShuttleRequestDetails extends ShuttleRequest {
  requester: Pick<Profile, "id" | "fullName" | "email" | "phone">;
  driver: Pick<Profile, "id" | "fullName"> | null;
  reviewer: Pick<Profile, "id" | "fullName"> | null;
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

export type ItemRequestStatus = "submitted" | "approved" | "fulfilled" | "rejected";
export interface ItemRequest {
  id: string;
  bookingId: string;
  requesterName: string;
  requesterEmail: string;
  eventName: string;
  roomName: string;
  eventStartTime: string;
  eventEndTime: string;
  itemId: string | null;
  itemName: string;
  itemUnit: InventoryUnit;
  quantity: number;
  notes: string | null;
  status: ItemRequestStatus;
  reviewedBy: string | null;
  reviewerName?: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ItemRequestHistory {
  id: string;
  itemRequestId: string;
  fromStatus: ItemRequestStatus | null;
  toStatus: ItemRequestStatus;
  changedBy: string | null;
  changedByName?: string | null;
  note: string | null;
  createdAt: string;
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

export type InventoryTransactionType =
  | "stock_in_restock"
  | "stock_out_booking"
  | "stock_out_ministry"
  | "adjustment_loss_waste";

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName?: string;
  itemCategory?: InventoryCategory;
  itemUnit?: InventoryUnit;
  transactionType: InventoryTransactionType;
  quantity: number;
  balanceAfter: number;
  roomId?: string | null;
  roomName?: string | null;
  bookingId?: string | null;
  recipientOrMinistry?: string | null;
  notes?: string | null;
  createdBy: string;
  createdByName?: string | null;
  createdAt: string;
}

export interface CreateTransactionInput {
  itemId: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  roomId?: string | null;
  bookingId?: string | null;
  recipientOrMinistry?: string | null;
  notes?: string | null;
  createdBy: string;
}

export interface InventoryTransactionFilter {
  itemId?: string;
  roomId?: string;
  type?: InventoryTransactionType | string;
  from?: string;
  to?: string;
}

export interface InventoryReportSummary {
  totalItems: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  totalRestockedQuantity: number;
  totalConsumedQuantity: number;
  consumedByRoom: Array<{ roomId: string; roomName: string; quantity: number }>;
  consumedByMinistry: Array<{ ministry: string; quantity: number }>;
  activeReorderWarnings: InventoryItem[];
}

export type AssetCategory =
  | "av_production"
  | "furniture"
  | "instrument"
  | "it_hardware"
  | "appliance"
  | "fixture"
  | "other";

export type AssetCondition = "excellent" | "good" | "fair" | "needs_repair" | "damaged";

export interface RoomAsset {
  id: string;
  roomId: string;
  roomName?: string | null;
  name: string;
  assetTag: string | null;
  category: AssetCategory;
  isMovable: boolean;
  condition: AssetCondition;
  quantity: number;
  serialNumber?: string | null;
  modelNumber?: string | null;
  notes?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomAssetInput {
  roomId: string;
  name: string;
  assetTag?: string | null;
  category: AssetCategory;
  isMovable: boolean;
  condition: AssetCondition;
  quantity: number;
  serialNumber?: string | null;
  modelNumber?: string | null;
  notes?: string | null;
}

export interface UpdateRoomAssetInput {
  roomId?: string;
  name?: string;
  assetTag?: string | null;
  category?: AssetCategory;
  isMovable?: boolean;
  condition?: AssetCondition;
  quantity?: number;
  serialNumber?: string | null;
  modelNumber?: string | null;
  notes?: string | null;
  isArchived?: boolean;
}

export interface AssetMovement {
  id: string;
  assetId: string;
  assetName?: string | null;
  assetTag?: string | null;
  fromRoomId: string;
  fromRoomName?: string | null;
  toRoomId: string;
  toRoomName?: string | null;
  movedBy: string;
  movedByName?: string | null;
  reason?: string | null;
  movedAt: string;
}

export interface MoveAssetInput {
  assetId: string;
  toRoomId: string;
  movedBy: string;
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Security & Audit Types
// ---------------------------------------------------------------------------

export type SystemRole = "admin" | "pastoral_staff" | "facility_team" | "member" | "guest";

export type SecurityCapability =
  // Rooms & Layouts
  | "rooms:view"
  | "rooms:manage"
  | "layouts:view"
  | "layouts:edit"
  // Bookings
  | "bookings:request"
  | "bookings:approve"
  | "bookings:override"
  | "bookings:cancel_any"
  // Inventory & Consumables
  | "inventory:view"
  | "inventory:stock_in"
  | "inventory:stock_out"
  | "inventory:manage"
  // Room Assets
  | "assets:view"
  | "assets:relocate"
  | "assets:manage"
  // Kiosk & Tablet Displays
  | "displays:view"
  | "displays:pair"
  | "displays:manage"
  // Users & Access
  | "users:view"
  | "users:manage"
  | "users:change_role"
  // Security & Audit
  | "audit:view"
  | "security:manage";

export type SecurityModule =
  | "rooms"
  | "layouts"
  | "displays"
  | "inventory"
  | "assets"
  | "bookings"
  | "auth_users"
  | "security";

export interface PermissionDefinition {
  capability: SecurityCapability;
  label: string;
  description: string;
  module: SecurityModule;
}

export interface RolePermissionRow {
  role: SystemRole;
  roleLabel: string;
  roleDescription: string;
  capabilities: SecurityCapability[];
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  module: SecurityModule;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  module?: SecurityModule | "all";
  action?: string;
  actor?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAuditLogInput {
  actorId?: string | null;
  actorName: string;
  actorEmail?: string | null;
  actorRole: string;
  action: string;
  module: SecurityModule;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}
