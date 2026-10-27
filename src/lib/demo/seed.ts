import "server-only";
import type { Announcement, Booking, KioskDisplay, LayoutPreset, Room, RoomLayout } from "@/lib/data/types";
import { addDaysToKey, dateKeyInZone, zonedDateTime } from "@/lib/domain/time";
import { hashDemoPassword } from "@/lib/demo/passwords";
import { getDemoSessionSecret, type DemoState, type DemoUser } from "@/lib/demo/store";

export const DEMO_PASSWORD = "victory-demo";

export const DEMO_ACCOUNTS = {
  admin: { email: "admin@victory.test", fullName: "Andrea Santos" },
  member: { email: "member@victory.test", fullName: "Jamie Cruz" },
  pending: { email: "pending@victory.test", fullName: "Lia Mendoza" },
} as const;

const ids = {
  admin: "8f3c1a52-1b7e-4c1a-9a51-0a0000000001",
  member: "8f3c1a52-1b7e-4c1a-9a51-0a0000000002",
  memberTwo: "8f3c1a52-1b7e-4c1a-9a51-0a0000000003",
  pending: "8f3c1a52-1b7e-4c1a-9a51-0a0000000004",
};

function room(index: number, fields: Omit<Room, "id" | "isActive" | "displayOrder" | "imagePath" | "mapImagePath" | "ghlCalendarId">): Room {
  return {
    id: `5b0d7e10-3c2a-4f1e-8b6d-10000000000${index}`,
    imagePath: null,
    mapImagePath: null,
    ghlCalendarId: `demo-calendar-${fields.slug}`,
    isActive: true,
    displayOrder: index,
    ...fields,
  };
}

/** Mirrors db/migrations/0003_seed_rooms.sql so demo and real data look alike. */
const rooms: Room[] = [
  room(1, {
    name: "Room A",
    slug: "room-a",
    shortDescription: "Large classroom for Sunday school and workshops.",
    fullDescription:
      "Room A is the largest classroom on the floor, set up with movable tables and chairs. Replace this text with the actual room description.",
    capacity: 40,
    bestFor: ["Sunday school", "Workshops", "Training"],
    locationLabel: "2nd floor, east wing",
    customStatus: "available",
    customStatusMessage: "Available for Ministry",
    customStatusSubtitle: "Open for discipleship, ministry meetings, and personal prayer until the next scheduled booking.",
  }),
  room(2, {
    name: "Room B",
    slug: "room-b",
    shortDescription: "Flexible room for youth and teen activities.",
    fullDescription:
      "Room B has open floor space suited to youth and teen programs. Replace this text with the actual room description.",
    capacity: 30,
    bestFor: ["Youth activities", "Teen gatherings", "Games"],
    locationLabel: "2nd floor, east wing",
    customStatus: "in_use",
    customStatusMessage: "Youth Band Rehearsal",
    customStatusSubtitle: "Sound check and rehearsal in progress. Please do not disturb.",
  }),
  room(3, {
    name: "Room C",
    slug: "room-c",
    shortDescription: "Meeting room for ministry teams.",
    fullDescription:
      "Room C has a central table and a display screen for ministry meetings. Replace this text with the actual room description.",
    capacity: 16,
    bestFor: ["Ministry meetings", "Planning sessions"],
    locationLabel: "2nd floor, west wing",
    customStatus: "maintenance",
    customStatusMessage: "Facility Maintenance",
    customStatusSubtitle: "Air conditioning servicing and lighting repair underway. Closed until 4:00 PM.",
  }),
  room(4, {
    name: "Room D",
    slug: "room-d",
    shortDescription: "Comfortable room for small groups.",
    fullDescription:
      "Room D is a smaller, quieter room arranged for discussion. Replace this text with the actual room description.",
    capacity: 12,
    bestFor: ["Small groups", "Prayer meetings", "Mentoring"],
    locationLabel: "2nd floor, west wing",
    customStatus: "cleaning",
    customStatusMessage: "Post-Service Sanitizing",
    customStatusSubtitle: "Routine room cleaning and chair resetting in progress. Opens shortly.",
  }),
  room(5, {
    name: "Event's Place - A",
    slug: "events-place-a",
    shortDescription: "Multipurpose space for church activities and events.",
    fullDescription:
      "Event's Place - A is a multipurpose space for internal events and church activities. Replace this text with the actual room description.",
    capacity: 50,
    bestFor: ["Church activities", "Internal events", "Rehearsals"],
    locationLabel: "Ground floor, beside the lobby",
    customStatus: "auto",
  }),
];

export function createDemoSeed(): DemoState {
  const now = new Date();
  const nowIso = now.toISOString();
  const today = dateKeyInZone(now);
  const day = (offset: number) => addDaysToKey(today, offset);
  const passwordHash = hashDemoPassword(DEMO_PASSWORD);

  const user = (id: string, email: string, fullName: string, phone: string, role: DemoUser["role"], accessStatus: DemoUser["accessStatus"]): DemoUser => ({
    id,
    email,
    fullName,
    phone,
    role,
    accessStatus,
    accessReason: null,
    accessReviewedAt: accessStatus === "pending" ? null : nowIso,
    accessNotificationError: null,
    ghlContactId: null,
    passwordHash,
    createdAt: nowIso,
  });

  const users: DemoUser[] = [
    user(ids.admin, DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.fullName, "+639170000001", "admin", "active"),
    user(ids.member, DEMO_ACCOUNTS.member.email, DEMO_ACCOUNTS.member.fullName, "+639170000002", "user", "active"),
    user(ids.memberTwo, "paolo@victory.test", "Paolo Reyes", "+639170000003", "user", "active"),
    user(ids.pending, DEMO_ACCOUNTS.pending.email, DEMO_ACCOUNTS.pending.fullName, "+639170000004", "user", "pending"),
  ];

  const booking = (
    n: number,
    fields: Pick<Booking, "userId" | "roomId" | "eventName" | "eventType" | "purpose" | "attendeeCount" | "status"> & {
      date: string;
      from: string;
      to: string;
      denialReason?: string;
    },
  ): Booking => ({
    id: `c7a1e2d4-6b3f-4a8e-9c2d-20000000000${n}`,
    userId: fields.userId,
    roomId: fields.roomId,
    eventName: fields.eventName,
    eventType: fields.eventType,
    purpose: fields.purpose,
    attendeeCount: fields.attendeeCount,
    startTime: zonedDateTime(fields.date, fields.from).toISOString(),
    endTime: zonedDateTime(fields.date, fields.to).toISOString(),
    status: fields.status,
    denialReason: fields.denialReason ?? null,
    ghlAppointmentId: fields.status === "approved" ? `demo-appt-seed-${n}` : null,
    googleCalendarEventId: null,
    googleCalendarSyncError: null,
    source: "web",
    whatsappMessageId: null,
    statusNotificationStatus: null,
    statusNotificationError: null,
    statusNotifiedAt: null,
    ghlNotificationError: null,
    reviewedBy: fields.status === "approved" || fields.status === "denied" ? ids.admin : null,
    reviewedAt: fields.status === "approved" || fields.status === "denied" ? nowIso : null,
    reviewLockedAt: null,
    reviewLockedBy: null,
    createdAt: nowIso,
  });

  const bookings: Booking[] = [
    booking(1, {
      userId: ids.memberTwo, roomId: rooms[0].id, eventName: "Kids Ministry Teachers Huddle", eventType: "ministry_meeting",
      purpose: "Monthly planning for the kids ministry teaching team.", attendeeCount: 14, status: "approved",
      date: day(1), from: "18:00", to: "20:00",
    }),
    booking(2, {
      userId: ids.memberTwo, roomId: rooms[1].id, eventName: "Youth Worship Practice", eventType: "youth",
      purpose: "Band and vocals rehearsal for Friday youth service.", attendeeCount: 10, status: "pending",
      date: day(2), from: "16:00", to: "18:00",
    }),
    booking(3, {
      userId: ids.member, roomId: rooms[2].id, eventName: "Victory Group Leaders Meeting", eventType: "small_group",
      purpose: "Quarterly alignment for small group leaders.", attendeeCount: 12, status: "approved",
      date: day(3), from: "19:00", to: "21:00",
    }),
    booking(4, {
      userId: ids.member, roomId: rooms[3].id, eventName: "Prayer Team Gathering", eventType: "church_activity",
      purpose: "Weekly intercession meeting.", attendeeCount: 8, status: "denied",
      date: day(4), from: "07:00", to: "08:00",
      denialReason: "Room D is reserved for facility maintenance that morning. Please try Room C.",
    }),
  ];

  const poster = (n: number, title: string, file: string, fields: Partial<Announcement>): Announcement => ({
    id: `e4b2c9a1-7d3e-4f2a-8b1c-30000000000${n}`,
    internalTitle: title,
    imagePath: `demo/posters/${file}`,
    orientation: "portrait",
    publishAt: new Date(now.getTime() - n * 86_400_000).toISOString(),
    expiresAt: null,
    isPublished: true,
    createdBy: ids.admin,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...fields,
  });

  const announcements: Announcement[] = [
    poster(7, "Worship Night", "worship-night.svg", { orientation: "landscape", publishAt: new Date(now.getTime() - 3_600_000).toISOString() }),
    poster(1, "Sunday Celebration – this week", "sunday-celebration.svg", {}),
    poster(2, "Youth Night", "youth-night.svg", {}),
    poster(3, "Volunteer Orientation", "volunteer-orientation.svg", {}),
    poster(4, "Small Group Season Launch", "small-groups.svg", {
      publishAt: zonedDateTime(day(7), "09:00").toISOString(),
    }),
    poster(5, "Prayer and Fasting Week (draft)", "prayer-fasting.svg", { isPublished: false }),
    poster(6, "Summer Camp Registration", "summer-camp.svg", {
      publishAt: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
      expiresAt: new Date(now.getTime() - 2 * 86_400_000).toISOString(),
    }),
  ];

  const presets: LayoutPreset[] = [
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

  const layouts = new Map<string, RoomLayout>();
  // Pre-seed Room A layout with Sunday Worship
  layouts.set(rooms[0].id, {
    id: `layout-${rooms[0].id}`,
    roomId: rooms[0].id,
    name: "Room A - Default Worship Layout",
    elements: presets[0].elements,
    gridSnapMeters: 0.5,
    totalSeats: 48,
    updatedAt: nowIso,
  });

  const kioskDisplays: KioskDisplay[] = [
    {
      id: "kiosk-display-room-a",
      token: "kiosk_door_room_a_seed",
      displayType: "door_sign",
      roomId: rooms[0].id,
      label: "Room A - Main East Door Tablet",
      isActive: true,
      lastSeenAt: nowIso,
      createdAt: nowIso,
    },
    {
      id: "kiosk-display-room-b",
      token: "kiosk_door_room_b_seed",
      displayType: "door_sign",
      roomId: rooms[1].id,
      label: "Room B - Youth Wing Door Tablet",
      isActive: true,
      lastSeenAt: nowIso,
      createdAt: nowIso,
    },
    {
      id: "kiosk-display-lobby-hub",
      token: "kiosk_lobby_hub_seed",
      displayType: "lobby_hub",
      roomId: null,
      label: "Ground Floor Lobby TV Display",
      isActive: true,
      lastSeenAt: nowIso,
      createdAt: nowIso,
    },
  ];

  return {
    users,
    accessEvents: [],
    rooms,
    bookings,
    reschedules: [],
    announcements,
    layouts,
    presets,
    kioskDisplays,
    files: new Map(),
    appointments: new Map(),
    ghlContacts: new Map(),
    // The seeded member has already connected Google Calendar; new accounts have not.
    googleConnections: new Set([ids.member]),
    googleEvents: new Map(),
    sessionSecret: getDemoSessionSecret(),
  };
}
