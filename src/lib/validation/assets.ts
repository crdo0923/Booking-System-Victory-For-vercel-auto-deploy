import { z } from "zod";

const blankToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());
const numberField = (min: number, max = 100000) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().min(min).max(max));

export const ASSET_CATEGORIES = [
  "av_production",
  "furniture",
  "instrument",
  "it_hardware",
  "appliance",
  "fixture",
  "other",
] as const;

export const ASSET_CONDITIONS = ["excellent", "good", "fair", "needs_repair", "damaged"] as const;

export const roomAssetFieldsSchema = z.object({
  roomId: z.string().trim().min(1, "Please select an assigned room."),
  name: z.string().trim().min(2, "Asset name must be at least 2 characters.").max(120),
  assetTag: optional(z.string().trim().max(50)),
  category: z.enum(ASSET_CATEGORIES, {
    message: "Please select a valid asset category.",
  }),
  isMovable: z.preprocess((val) => val === "true" || val === true || val === "1" || val === "on", z.boolean()),
  condition: z.enum(ASSET_CONDITIONS, {
    message: "Please select a valid asset condition.",
  }),
  quantity: numberField(1, 10000),
  serialNumber: optional(z.string().trim().max(100)),
  modelNumber: optional(z.string().trim().max(100)),
  notes: optional(z.string().trim().max(500)),
});

export type RoomAssetFields = z.infer<typeof roomAssetFieldsSchema>;

export const moveAssetSchema = z.object({
  assetId: z.string().trim().min(1, "Asset ID is required."),
  toRoomId: z.string().trim().min(1, "Destination room is required."),
  reason: optional(z.string().trim().max(500)),
});

export type MoveAssetFields = z.infer<typeof moveAssetSchema>;
