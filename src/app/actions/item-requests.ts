"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { updateItemRequestService } from "@/lib/services/item-requests";
import type { ServiceResult } from "@/lib/services/result";

export async function updateItemRequestAction(input: { id: string; status: "approved" | "fulfilled" | "rejected"; note?: string }): Promise<ServiceResult<{ id: string }>> {
  const result = await updateItemRequestService(input, await getCurrentUser(), await getRepository());
  if (result.ok) {
    revalidatePath("/admin/item-requests");
    revalidatePath("/admin");
    revalidatePath("/bookings");
  }
  return result;
}
