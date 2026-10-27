import { z } from "zod";

const blankToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());
const numberField = (min: number, max = 100000) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().min(min).max(max));

export const INVENTORY_CATEGORIES = ["communion", "av_tech", "hospitality", "paper_office", "cleaning"] as const;
export const INVENTORY_UNITS = ["pieces", "boxes", "packs", "rolls", "bottles"] as const;

export const inventoryItemFieldsSchema = z.object({
  name: z.string().trim().min(2, "Item name must be at least 2 characters.").max(120),
  category: z.enum(INVENTORY_CATEGORIES, {
    message: "Please select a valid category.",
  }),
  unit: z.enum(INVENTORY_UNITS, {
    message: "Please select a valid unit of measure.",
  }),
  currentStock: numberField(0, 1000000),
  reorderThreshold: numberField(0, 1000000),
  unitCost: optional(numberField(0, 1000000)),
  location: z.string().trim().min(2, "Location must be at least 2 characters.").max(100),
});

export type InventoryItemFields = z.infer<typeof inventoryItemFieldsSchema>;

export const inventoryItemIdSchema = z.object({
  id: z.string().trim().min(1, "Inventory item ID is required."),
});
