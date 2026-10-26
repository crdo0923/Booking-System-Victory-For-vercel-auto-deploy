"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { CreateKioskDisplayInput } from "@/lib/data/types";

export async function createDisplayAction(input: CreateKioskDisplayInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Only church administrators can register kiosk displays." };
  }

  if (!input.label || input.label.trim().length === 0) {
    return { ok: false, error: "Please enter a descriptive label for this display tablet or TV." };
  }

  if (input.displayType === "door_sign" && !input.roomId) {
    return { ok: false, error: "Door signs must be paired with a specific room." };
  }

  try {
    const repo = await getRepository();
    const created = await repo.createKioskDisplay({
      displayType: input.displayType,
      roomId: input.roomId ?? null,
      label: input.label.trim(),
    });
    revalidatePath("/admin/displays");
    return { ok: true, display: created };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create kiosk display." };
  }
}

export async function revokeDisplayAction(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Only church administrators can revoke kiosk displays." };
  }

  try {
    const repo = await getRepository();
    const revoked = await repo.revokeKioskDisplay(id);
    revalidatePath("/admin/displays");
    return { ok: true, revoked };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to revoke kiosk display." };
  }
}
