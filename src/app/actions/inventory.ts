"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createInventoryItemService,
  updateInventoryItemService,
  archiveInventoryItemService,
} from "@/lib/services/inventory";
import { getInventoryDeps } from "@/lib/services/deps";
import type { ServiceResult } from "@/lib/services/result";

export type InventoryActionState = ServiceResult<{ id: string }> | null;

function revalidateInventoryViews() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

export async function createInventoryItemAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const result = await createInventoryItemService(
    formData,
    await getCurrentUser(),
    await getInventoryDeps(),
  );
  if (result.ok) {
    revalidateInventoryViews();
  }
  return result;
}

export async function updateInventoryItemAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const result = await updateInventoryItemService(
    formData,
    await getCurrentUser(),
    await getInventoryDeps(),
  );
  if (result.ok) {
    revalidateInventoryViews();
  }
  return result;
}

export async function archiveInventoryItemAction(id: string): Promise<ServiceResult> {
  const result = await archiveInventoryItemService(
    id,
    await getCurrentUser(),
    await getInventoryDeps(),
  );
  if (result.ok) {
    revalidateInventoryViews();
  }
  return result;
}
