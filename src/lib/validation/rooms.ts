import { z } from "zod";

const blankToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());
const numberField = (min: number, max = 100000) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().min(min).max(max));

export const roomFieldsSchema = z.object({
  name: z.string().trim().min(2, "Room name must be at least 2 characters.").max(100),
  slug: optional(
    z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only.")
      .max(80),
  ),
  shortDescription: z.string().trim().min(5, "Short description must be at least 5 characters.").max(300),
  fullDescription: optional(z.string().trim().max(2000)),
  capacity: numberField(1, 5000),
  building: z.string().trim().min(2, "Building name is required.").default("Main Building"),
  floorLevel: z.string().trim().min(1, "Floor level is required.").default("Ground Floor"),
  locationLabel: z.string().trim().min(2, "Location label is required (e.g., '2nd Floor · Room 204')."),
  bestFor: optional(z.string().trim()),
  dimensionsLM: optional(numberField(1, 100)),
  dimensionsWM: optional(numberField(1, 100)),
  airconHpTotal: optional(numberField(0, 100)),
  baseWattageLightsAv: optional(numberField(0, 50000)),
  customStatus: optional(z.enum(["auto", "available", "in_use", "maintenance", "cleaning"])),
  customStatusMessage: optional(z.string().trim().max(120)),
  customStatusSubtitle: optional(z.string().trim().max(300)),
  ghlCalendarId: optional(z.string().trim().min(4)),
});

export type RoomFields = z.infer<typeof roomFieldsSchema>;

export const roomIdSchema = z.object({
  id: z.string().trim().min(1, "Room id is required."),
});
