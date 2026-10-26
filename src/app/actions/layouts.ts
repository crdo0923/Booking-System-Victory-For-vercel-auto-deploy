"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { LayoutElement, LayoutPreset, RoomLayout } from "@/lib/data/types";

const layoutElementSchema = z.object({
  id: z.string(),
  type: z.enum([
    "stage",
    "podium",
    "sound_booth",
    "round_table",
    "rect_table",
    "chair_row",
    "pillar",
    "door",
    "aisle",
  ]),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  length: z.number().positive(),
  rotation: z.union([
    z.literal(0),
    z.literal(45),
    z.literal(90),
    z.literal(135),
    z.literal(180),
    z.literal(225),
    z.literal(270),
    z.literal(315),
  ]),
  label: z.string().optional(),
  seats: z.number().int().nonnegative().optional(),
  tableDiameterInches: z.union([z.literal(36), z.literal(48), z.literal(60), z.literal(72)]).optional(),
  tableDimensionsInches: z.union([z.literal("30x72"), z.literal("30x96")]).optional(),
  chairsPerRow: z.number().int().positive().optional(),
  rowCount: z.number().int().positive().optional(),
  color: z.string().optional(),
});

const saveLayoutSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1),
  elements: z.array(layoutElementSchema),
  gridSnapMeters: z.number().default(0.5),
  totalSeats: z.number().int().nonnegative().default(0),
});

export type SaveLayoutResult = { ok: true; layout: RoomLayout } | { ok: false; error: string };

export async function saveRoomLayoutAction(input: {
  roomId: string;
  name: string;
  elements: LayoutElement[];
  gridSnapMeters: number;
  totalSeats: number;
}): Promise<SaveLayoutResult> {
  try {
    await requireAdmin();
    const parsed = saveLayoutSchema.parse(input);
    const repo = await getRepository();
    const saved = await repo.saveRoomLayout(parsed.roomId, {
      roomId: parsed.roomId,
      name: parsed.name,
      elements: parsed.elements,
      gridSnapMeters: parsed.gridSnapMeters,
      totalSeats: parsed.totalSeats,
    });

    revalidatePath(`/admin/rooms/${parsed.roomId}/layout`);
    revalidatePath("/admin/rooms");
    return { ok: true, layout: saved };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save room layout.",
    };
  }
}

const savePresetSchema = z.object({
  name: z.string().min(1, "Preset name is required"),
  description: z.string().default("Custom saved church layout"),
  category: z.enum(["worship", "classroom", "fellowship", "prayer"]).default("worship"),
  defaultCapacity: z.number().int().nonnegative().default(0),
  elements: z.array(layoutElementSchema),
});

export type SavePresetResult = { ok: true; preset: LayoutPreset } | { ok: false; error: string };

export async function saveLayoutPresetAction(input: {
  name: string;
  description: string;
  category: "worship" | "classroom" | "fellowship" | "prayer";
  defaultCapacity: number;
  elements: LayoutElement[];
}): Promise<SavePresetResult> {
  try {
    await requireAdmin();
    const parsed = savePresetSchema.parse(input);
    const repo = await getRepository();
    const saved = await repo.saveLayoutAsPreset(parsed);

    revalidatePath("/admin/rooms");
    return { ok: true, preset: saved };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save preset.",
    };
  }
}
