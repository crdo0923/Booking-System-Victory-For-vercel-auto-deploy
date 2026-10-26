"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { archiveRoom, createRoom, updateRoom } from "@/lib/services/rooms";
import { getRoomDeps } from "@/lib/services/deps";
import type { ServiceResult } from "@/lib/services/result";

export type RoomActionState = ServiceResult<{ id: string; slug?: string }> | null;

function revalidateRoomViews(slug?: string) {
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  if (slug) {
    revalidatePath(`/rooms/${slug}`);
  }
}

export async function createRoomAction(_prev: RoomActionState, formData: FormData): Promise<RoomActionState> {
  const result = await createRoom(formData, await getCurrentUser(), await getRoomDeps());
  if (result.ok) {
    revalidateRoomViews(result.data.slug);
  }
  return result;
}

export async function updateRoomAction(_prev: RoomActionState, formData: FormData): Promise<RoomActionState> {
  const result = await updateRoom(formData, await getCurrentUser(), await getRoomDeps());
  if (result.ok) {
    revalidateRoomViews();
  }
  return result;
}

export async function toggleArchiveRoomAction(id: string, archived: boolean): Promise<ServiceResult> {
  const result = await archiveRoom({ id, archived }, await getCurrentUser(), await getRoomDeps());
  if (result.ok) {
    revalidateRoomViews();
  }
  return result;
}
