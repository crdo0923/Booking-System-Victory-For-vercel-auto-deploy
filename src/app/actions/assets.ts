"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createRoomAssetService,
  updateRoomAssetService,
  archiveRoomAssetService,
  moveRoomAssetService,
} from "@/lib/services/assets";
import { getAssetDeps } from "@/lib/services/deps";
import type { ServiceResult } from "@/lib/services/result";
import type { AssetMovement } from "@/lib/data/types";

export type AssetActionState = ServiceResult<{ id: string }> | null;
export type MoveAssetActionState = ServiceResult<AssetMovement> | null;

function revalidateAssetViews() {
  revalidatePath("/admin/assets");
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
}

export async function createRoomAssetAction(
  _prev: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = await createRoomAssetService(
    formData,
    await getCurrentUser(),
    await getAssetDeps(),
  );
  if (result.ok) {
    revalidateAssetViews();
  }
  return result;
}

export async function updateRoomAssetAction(
  _prev: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const result = await updateRoomAssetService(
    formData,
    await getCurrentUser(),
    await getAssetDeps(),
  );
  if (result.ok) {
    revalidateAssetViews();
  }
  return result;
}

export async function archiveRoomAssetAction(id: string): Promise<ServiceResult> {
  const result = await archiveRoomAssetService(
    id,
    await getCurrentUser(),
    await getAssetDeps(),
  );
  if (result.ok) {
    revalidateAssetViews();
  }
  return result;
}

export async function moveRoomAssetAction(
  _prev: MoveAssetActionState,
  formData: FormData,
): Promise<MoveAssetActionState> {
  const result = await moveRoomAssetService(
    formData,
    await getCurrentUser(),
    await getAssetDeps(),
  );
  if (result.ok) {
    revalidateAssetViews();
  }
  return result;
}
