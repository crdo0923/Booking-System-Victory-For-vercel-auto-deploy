import type { SessionUser } from "@/lib/auth/provider";
import type { ItemRequestStatus } from "@/lib/data/types";
import { RepositoryError, type Repository } from "@/lib/data/repository";
import { failure, success, type ServiceResult } from "@/lib/services/result";
import { z } from "zod";

const idSchema = z.object({ id: z.uuid() });
const statusSchema = z.enum(["approved", "fulfilled", "rejected"]);
export type ItemRequestAction = { id: string; status: ItemRequestStatus; note?: string };

function admin(actor: SessionUser | null): ServiceResult<never> | null {
  if (!actor) return failure("unauthenticated", "Your session has expired. Please sign in again.");
  if (actor.role !== "admin" || actor.accessStatus !== "active") return failure("forbidden", "Only active administrators can manage item requests.");
  return null;
}

export async function updateItemRequestService(input: unknown, actor: SessionUser | null, repo: Repository): Promise<ServiceResult<{ id: string }>> {
  const denied = admin(actor);
  if (denied) return denied;
  const parsed = z.object({ id: z.uuid(), status: statusSchema, note: z.string().trim().max(500).optional() }).safeParse(input);
  if (!parsed.success) return failure("invalid", "Choose a valid request status.");
  try {
    const updated = await repo.updateItemRequestStatus(parsed.data.id, parsed.data.status, parsed.data.note ?? null);
    return updated ? success({ id: updated.id }, `Item request marked ${updated.status}.`) : failure("not_found", "Item request not found.");
  } catch (error) {
    if (error instanceof RepositoryError) return failure(error.code, error.message);
    return failure("unknown", "Could not update item request.");
  }
}

export const itemRequestIdSchema = idSchema;
