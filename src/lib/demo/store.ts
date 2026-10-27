import "server-only";
import { createHash } from "node:crypto";
import type { TimeRange } from "@/lib/domain/availability";
import type { AccessChange, AccessStatus, Announcement, AssetMovement, Booking, InventoryItem, InventoryTransaction, KioskDisplay, LayoutPreset, RescheduleRequest, Role, RoleChange, Room, RoomAsset, RoomLayout } from "@/lib/data/types";
import { isProduction } from "@/lib/env";
import { createDemoSeed } from "@/lib/demo/seed";

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  accessStatus: AccessStatus;
  accessReason: string | null;
  accessReviewedAt: string | null;
  accessNotificationError: string | null;
  ghlContactId: string | null;
  passwordHash: string;
  createdAt: string;
}

export interface DemoAccessEvent {
  id: string;
  userId: string;
  change: AccessChange | RoleChange;
  reason: string | null;
  previousRole?: Role | null;
  newRole?: Role | null;
  actorId: string | null;
  notificationError: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

export interface DemoState {
  users: DemoUser[];
  accessEvents: DemoAccessEvent[];
  rooms: Room[];
  bookings: Booking[];
  reschedules: RescheduleRequest[];
  announcements: Announcement[];
  layouts: Map<string, RoomLayout>;
  presets: LayoutPreset[];
  kioskDisplays: KioskDisplay[];
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  roomAssets: RoomAsset[];
  assetMovements: AssetMovement[];
  files: Map<string, { bytes: Uint8Array; contentType: string }>;
  /** Simulated GHL appointments, keyed by appointment id. */
  appointments: Map<string, { calendarId: string; range: TimeRange; title: string; assignedUserId: string; status: string }>;
  /** Simulated GHL contacts, keyed by lower-cased email. */
  ghlContacts: Map<string, { id: string; fullName: string; phone: string | null; tags: string[]; fields: Record<string, string> }>;
  /** Simulated Google Calendar connections and events. */
  googleConnections: Set<string>;
  googleEvents: Map<string, { userId: string; summary: string; start: string; end: string }>;
  sessionSecret: Buffer;
}

const globalForDemo = globalThis as typeof globalThis & { __victoryDemoState?: DemoState };

export function getDemoSessionSecret(): Buffer {
  const configured = process.env.DEMO_SESSION_SECRET?.trim();
  if (configured) {
    return Buffer.from(configured, "utf-8");
  }
  // Stable secret across serverless lambdas / reloads derived from an environment salt
  return createHash("sha256").update("victory-rooms-demo-session-secret-v1").digest();
}

/**
 * In-memory state for local development without credentials. Kept on
 * globalThis so it survives hot reloads and is shared across route bundles.
 */
export function getDemoState(): DemoState {
  if (isProduction() && Boolean(process.env.DATABASE_URL?.trim()) && process.env.DEMO_MODE !== "true") {
    throw new Error("Demo data is not available in production.");
  }
  globalForDemo.__victoryDemoState ??= createDemoSeed();
  const state = globalForDemo.__victoryDemoState;
  state.layouts ??= createDemoSeed().layouts;
  state.presets ??= createDemoSeed().presets;
  state.kioskDisplays ??= createDemoSeed().kioskDisplays;
  state.inventoryItems ??= createDemoSeed().inventoryItems;
  state.inventoryTransactions ??= createDemoSeed().inventoryTransactions;
  state.roomAssets ??= createDemoSeed().roomAssets;
  state.assetMovements ??= createDemoSeed().assetMovements;
  state.sessionSecret ??= getDemoSessionSecret();
  return state;
}
