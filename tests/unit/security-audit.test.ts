import { describe, expect, it } from "vitest";
import {
  getRolePermissionRows,
  hasPermission,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "@/lib/domain/security-matrix";
import { createDemoRepository } from "@/lib/demo/repository";
import { logAuditEvent, listAuditLogsService } from "@/lib/services/audit";
import type { SessionUser } from "@/lib/auth/provider";

describe("Security Matrix & Roles Evaluation", () => {
  it("defines comprehensive capabilities across all church modules", () => {
    expect(PERMISSION_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
    const modules = new Set(PERMISSION_DEFINITIONS.map((p) => p.module));
    expect(modules.has("rooms")).toBe(true);
    expect(modules.has("layouts")).toBe(true);
    expect(modules.has("bookings")).toBe(true);
    expect(modules.has("inventory")).toBe(true);
    expect(modules.has("assets")).toBe(true);
    expect(modules.has("displays")).toBe(true);
    expect(modules.has("auth_users")).toBe(true);
    expect(modules.has("security")).toBe(true);
  });

  it("evaluates admin role with full permission coverage", () => {
    expect(hasPermission("admin", "rooms:manage")).toBe(true);
    expect(hasPermission("admin", "bookings:approve")).toBe(true);
    expect(hasPermission("admin", "bookings:override")).toBe(true);
    expect(hasPermission("admin", "inventory:stock_in")).toBe(true);
    expect(hasPermission("admin", "assets:relocate")).toBe(true);
    expect(hasPermission("admin", "displays:pair")).toBe(true);
    expect(hasPermission("admin", "users:change_role")).toBe(true);
    expect(hasPermission("admin", "audit:view")).toBe(true);
  });

  it("evaluates facility_team role with physical operations permissions", () => {
    expect(hasPermission("facility_team", "rooms:manage")).toBe(true);
    expect(hasPermission("facility_team", "layouts:edit")).toBe(true);
    expect(hasPermission("facility_team", "assets:relocate")).toBe(true);
    expect(hasPermission("facility_team", "inventory:stock_in")).toBe(true);
    expect(hasPermission("facility_team", "displays:pair")).toBe(true);
    // Facility team should NOT have user administration or booking override powers
    expect(hasPermission("facility_team", "users:change_role")).toBe(false);
    expect(hasPermission("facility_team", "bookings:override")).toBe(false);
  });

  it("evaluates pastoral_staff role with ministry permissions", () => {
    expect(hasPermission("pastoral_staff", "bookings:approve")).toBe(true);
    expect(hasPermission("pastoral_staff", "inventory:stock_out")).toBe(true);
    expect(hasPermission("pastoral_staff", "rooms:view")).toBe(true);
    expect(hasPermission("pastoral_staff", "assets:view")).toBe(true);
    // Pastoral staff does not manage technical tablet pairings or server security
    expect(hasPermission("pastoral_staff", "displays:pair")).toBe(false);
    expect(hasPermission("pastoral_staff", "security:manage")).toBe(false);
  });

  it("evaluates regular member role with self-service booking capabilities", () => {
    expect(hasPermission("member", "bookings:request")).toBe(true);
    expect(hasPermission("member", "rooms:view")).toBe(true);
    expect(hasPermission("member", "layouts:view")).toBe(true);
    // Regular member cannot approve bookings or stock-in inventory
    expect(hasPermission("member", "bookings:approve")).toBe(false);
    expect(hasPermission("member", "inventory:stock_in")).toBe(false);
    expect(hasPermission("member", "audit:view")).toBe(false);
  });

  it("evaluates guest or unauthenticated user as restricted", () => {
    expect(hasPermission(null, "rooms:view")).toBe(false);
    expect(hasPermission("guest", "rooms:view")).toBe(true);
    expect(hasPermission("guest", "bookings:request")).toBe(false);
    expect(hasPermission("guest", "audit:view")).toBe(false);
  });

  it("exports structured role permission rows for the UI matrix", () => {
    const rows = getRolePermissionRows();
    expect(rows.length).toBe(SYSTEM_ROLES.length);
    const adminRow = rows.find((r) => r.role === "admin");
    expect(adminRow?.capabilities.length).toBe(ROLE_PERMISSIONS.admin.length);
  });
});

describe("Audit Logging & Service Layer", () => {
  const adminActor: SessionUser = {
    id: "admin-uuid-1",
    fullName: "Andrea Santos",
    email: "admin@victory.test",
    role: "admin",
    accessStatus: "active",
    phone: null,
    accessReason: null,
  };

  const memberActor: SessionUser = {
    id: "member-uuid-2",
    fullName: "Jamie Cruz",
    email: "member@victory.test",
    role: "user",
    accessStatus: "active",
    phone: null,
    accessReason: null,
  };

  it("records and queries audit events in the repository", async () => {
    const repo = createDemoRepository(adminActor.id);
    const newEntry = await logAuditEvent(repo, {
      actorId: adminActor.id,
      actorName: adminActor.fullName,
      actorEmail: adminActor.email,
      actorRole: adminActor.role,
      action: "room.aircon_updated",
      module: "rooms",
      targetId: "room-a",
      details: { hp: 5.5, inverter: true },
      ipAddress: "192.168.1.100",
    });

    expect(newEntry).not.toBeNull();
    expect(newEntry?.action).toBe("room.aircon_updated");

    const logs = await repo.listAuditLogs({ module: "rooms" });
    expect(logs.some((l) => l.action === "room.aircon_updated")).toBe(true);
  });

  it("enforces admin-only access to listAuditLogsService", async () => {
    const repo = createDemoRepository(adminActor.id);

    // Regular member should be forbidden
    const forbiddenRes = await listAuditLogsService(undefined, memberActor, { repo });
    expect(forbiddenRes.ok).toBe(false);
    if (!forbiddenRes.ok) {
      expect(forbiddenRes.code).toBe("forbidden");
    }

    // Admin should succeed
    const adminRes = await listAuditLogsService(undefined, adminActor, { repo });
    expect(adminRes.ok).toBe(true);
    if (adminRes.ok) {
      expect(Array.isArray(adminRes.data.logs)).toBe(true);
      expect(adminRes.data.logs.length).toBeGreaterThan(0);
    }
  });

  it("filters audit logs accurately by module and keyword", async () => {
    const repo = createDemoRepository(adminActor.id);

    const assetLogs = await repo.listAuditLogs({ module: "assets" });
    expect(assetLogs.every((l) => l.module === "assets")).toBe(true);

    const inventoryLogs = await repo.listAuditLogs({ module: "inventory" });
    expect(inventoryLogs.every((l) => l.module === "inventory")).toBe(true);

    const searched = await repo.listAuditLogs({ action: "relocated" });
    expect(searched.every((l) => l.action.includes("relocated"))).toBe(true);
  });
});
