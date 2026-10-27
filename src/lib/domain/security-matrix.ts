import type { PermissionDefinition, RolePermissionRow, SecurityCapability, SystemRole } from "@/lib/data/types";

export const SYSTEM_ROLES: Array<{ role: SystemRole; label: string; description: string }> = [
  {
    role: "admin",
    label: "Administrator",
    description: "Full system control, user access grants, room configurations, and audit reviews.",
  },
  {
    role: "facility_team",
    label: "Facility & AV Team",
    description: "Operational management of room layouts, technical assets, displays, and inventory.",
  },
  {
    role: "pastoral_staff",
    label: "Pastoral & Ministry Staff",
    description: "Ministry leaders who review reservations, schedule events, and consume ministry supplies.",
  },
  {
    role: "member",
    label: "Active Member / Leader",
    description: "Verified ministry volunteers who book rooms, view layouts, and check room inventory.",
  },
  {
    role: "guest",
    label: "Guest / Pending Account",
    description: "New registration awaiting verification; read-only preview of public announcements.",
  },
];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Rooms & Layouts
  {
    capability: "rooms:view",
    label: "View Rooms",
    description: "Browse room specifications, capacity, photos, and current availability status.",
    module: "rooms",
  },
  {
    capability: "rooms:manage",
    label: "Manage Rooms",
    description: "Create, edit, archive rooms, and change operational statuses (maintenance, cleaning).",
    module: "rooms",
  },
  {
    capability: "layouts:view",
    label: "View Room Layouts",
    description: "Inspect floor plans, furniture placements, and stage configuration diagrams.",
    module: "layouts",
  },
  {
    capability: "layouts:edit",
    label: "Edit Layouts & Presets",
    description: "Save custom furniture layouts, stage dimensions, and preset seating configurations.",
    module: "layouts",
  },

  // Bookings
  {
    capability: "bookings:request",
    label: "Request Bookings",
    description: "Submit room reservation requests for ministry meetings, rehearsals, and church services.",
    module: "bookings",
  },
  {
    capability: "bookings:approve",
    label: "Approve / Deny Bookings",
    description: "Review pending reservation requests, resolve conflicts, and assign GHL calendar events.",
    module: "bookings",
  },
  {
    capability: "bookings:override",
    label: "Emergency Schedule Override",
    description: "Book outside standard office hours or override existing schedule holds for ministry emergencies.",
    module: "bookings",
  },
  {
    capability: "bookings:cancel_any",
    label: "Cancel Any Booking",
    description: "Cancel reservations made by other members when events are postponed or relocated.",
    module: "bookings",
  },

  // Inventory & Consumables
  {
    capability: "inventory:view",
    label: "View Inventory & Balances",
    description: "Check available counts of communion supplies, paper products, and hospitality goods.",
    module: "inventory",
  },
  {
    capability: "inventory:stock_in",
    label: "Record Stock-In / Restock",
    description: "Log delivery shipments, purchase receipts, and inventory restock amounts.",
    module: "inventory",
  },
  {
    capability: "inventory:stock_out",
    label: "Log Stock Usage",
    description: "Deduct consumable items consumed during Sunday services, mid-week youth services, or meetings.",
    module: "inventory",
  },
  {
    capability: "inventory:manage",
    label: "Manage Inventory Catalog",
    description: "Add new consumable items, adjust reorder thresholds, and edit unit costs.",
    module: "inventory",
  },

  // Room Assets & AV Equipment
  {
    capability: "assets:view",
    label: "View Room Assets",
    description: "Inspect AV gear, musical instruments, soundboards, and furniture assigned to rooms.",
    module: "assets",
  },
  {
    capability: "assets:relocate",
    label: "Transfer / Relocate Assets",
    description: "Move movable sound equipment, projectors, or instruments between church halls.",
    module: "assets",
  },
  {
    capability: "assets:manage",
    label: "Manage Asset Register",
    description: "Register new serial numbers, update condition status, and retire damaged equipment.",
    module: "assets",
  },

  // Displays & Tablets
  {
    capability: "displays:view",
    label: "View Hall Displays",
    description: "Monitor live status and pairing codes of wall-mounted digital signage and door tablets.",
    module: "displays",
  },
  {
    capability: "displays:pair",
    label: "Pair Room Tablets",
    description: "Generate pairing tokens and link newly installed Android/iPad tablets to specific rooms.",
    module: "displays",
  },
  {
    capability: "displays:manage",
    label: "Manage Display Modes",
    description: "Configure display theme, refresh intervals, brightness schedules, and kiosk locking.",
    module: "displays",
  },

  // Users & Access Control
  {
    capability: "users:view",
    label: "View User Profiles",
    description: "View verified church member list, pending registrations, and contact history.",
    module: "auth_users",
  },
  {
    capability: "users:manage",
    label: "Manage User Access",
    description: "Approve new member signups, deny accounts, or revoke portal privileges.",
    module: "auth_users",
  },
  {
    capability: "users:change_role",
    label: "Assign Administrative Roles",
    description: "Promote members to administrative or staff positions and grant system privileges.",
    module: "auth_users",
  },

  // Audit & Security
  {
    capability: "audit:view",
    label: "View Audit Trail",
    description: "Inspect immutable system audit log of all room changes, equipment movements, and approvals.",
    module: "security",
  },
  {
    capability: "security:manage",
    label: "Manage Security Policies",
    description: "Configure role matrix settings, session timeouts, and security alert recipients.",
    module: "security",
  },
];

export const ROLE_PERMISSIONS: Record<SystemRole, SecurityCapability[]> = {
  admin: [
    "rooms:view",
    "rooms:manage",
    "layouts:view",
    "layouts:edit",
    "bookings:request",
    "bookings:approve",
    "bookings:override",
    "bookings:cancel_any",
    "inventory:view",
    "inventory:stock_in",
    "inventory:stock_out",
    "inventory:manage",
    "assets:view",
    "assets:relocate",
    "assets:manage",
    "displays:view",
    "displays:pair",
    "displays:manage",
    "users:view",
    "users:manage",
    "users:change_role",
    "audit:view",
    "security:manage",
  ],
  facility_team: [
    "rooms:view",
    "rooms:manage",
    "layouts:view",
    "layouts:edit",
    "bookings:request",
    "inventory:view",
    "inventory:stock_in",
    "inventory:stock_out",
    "inventory:manage",
    "assets:view",
    "assets:relocate",
    "assets:manage",
    "displays:view",
    "displays:pair",
    "displays:manage",
    "audit:view",
  ],
  pastoral_staff: [
    "rooms:view",
    "layouts:view",
    "bookings:request",
    "bookings:approve",
    "inventory:view",
    "inventory:stock_out",
    "assets:view",
    "displays:view",
    "users:view",
    "audit:view",
  ],
  member: [
    "rooms:view",
    "layouts:view",
    "bookings:request",
    "inventory:view",
    "assets:view",
    "displays:view",
  ],
  guest: [
    "rooms:view",
    "displays:view",
  ],
};

export function getRolePermissionRows(): RolePermissionRow[] {
  return SYSTEM_ROLES.map((r) => ({
    role: r.role,
    roleLabel: r.label,
    roleDescription: r.description,
    capabilities: ROLE_PERMISSIONS[r.role] ?? [],
  }));
}

/**
 * Checks whether a given role holds a specific capability.
 * Defaults to "member" if an unknown or standard "user" role is passed.
 */
export function hasPermission(
  role: string | null | undefined,
  capability: SecurityCapability,
): boolean {
  if (!role) return false;
  // If user role is "admin", always grant full permissions
  if (role === "admin") return true;

  const mappedRole: SystemRole =
    role === "pastoral_staff" || role === "staff"
      ? "pastoral_staff"
      : role === "facility_team"
        ? "facility_team"
        : role === "user" || role === "member"
          ? "member"
          : role === "guest"
            ? "guest"
            : "guest";

  const perms = ROLE_PERMISSIONS[mappedRole];
  return perms ? perms.includes(capability) : false;
}
