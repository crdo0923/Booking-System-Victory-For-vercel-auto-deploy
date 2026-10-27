import type { SessionUser } from "@/lib/auth/provider";
import { RepositoryError, type Repository } from "@/lib/data/repository";
import type { AssetMovement, RoomAsset } from "@/lib/data/types";
import { failure, fieldErrorsFrom, success, type ServiceResult } from "@/lib/services/result";
import { logAuditEvent } from "@/lib/services/audit";
import {
  moveAssetSchema,
  roomAssetFieldsSchema,
} from "@/lib/validation/assets";

export interface AssetDeps {
  repo: Repository;
}

function requireAdminActor(actor: SessionUser | null): ServiceResult<never> | null {
  if (!actor) return failure("unauthenticated", "Your session has expired. Please sign in again.");
  if (actor.role !== "admin" || actor.accessStatus !== "active") {
    return failure("forbidden", "Only administrators can manage church assets.");
  }
  return null;
}

export async function createRoomAssetService(
  formData: FormData,
  actor: SessionUser | null,
  deps: AssetDeps,
): Promise<ServiceResult<{ id: string }>> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const rawFields = {
    roomId: formData.get("roomId") ?? "",
    name: formData.get("name") ?? "",
    assetTag: formData.get("assetTag") ?? undefined,
    category: formData.get("category") ?? "",
    isMovable: formData.get("isMovable") ?? false,
    condition: formData.get("condition") ?? "good",
    quantity: formData.get("quantity") ?? "1",
    serialNumber: formData.get("serialNumber") ?? undefined,
    modelNumber: formData.get("modelNumber") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  };

  const parsed = roomAssetFieldsSchema.safeParse(rawFields);
  if (!parsed.success) {
    return failure("invalid", "Please check the asset form fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    const asset = await deps.repo.createRoomAsset({
      roomId: parsed.data.roomId,
      name: parsed.data.name,
      assetTag: parsed.data.assetTag,
      category: parsed.data.category,
      isMovable: parsed.data.isMovable,
      condition: parsed.data.condition,
      quantity: parsed.data.quantity,
      serialNumber: parsed.data.serialNumber,
      modelNumber: parsed.data.modelNumber,
      notes: parsed.data.notes,
    });
    return success({ id: asset.id }, `Asset "${asset.name}" registered successfully.`);
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error.code, error.message);
    }
    return failure("unknown", "Could not create asset. Please try again.");
  }
}

export async function updateRoomAssetService(
  formData: FormData,
  actor: SessionUser | null,
  deps: AssetDeps,
): Promise<ServiceResult<{ id: string }>> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const id = formData.get("id")?.toString() ?? "";
  if (!id) return failure("invalid", "Asset ID is required.");

  const rawFields = {
    roomId: formData.get("roomId") ?? "",
    name: formData.get("name") ?? "",
    assetTag: formData.get("assetTag") ?? undefined,
    category: formData.get("category") ?? "",
    isMovable: formData.get("isMovable") ?? false,
    condition: formData.get("condition") ?? "good",
    quantity: formData.get("quantity") ?? "1",
    serialNumber: formData.get("serialNumber") ?? undefined,
    modelNumber: formData.get("modelNumber") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  };

  const parsed = roomAssetFieldsSchema.safeParse(rawFields);
  if (!parsed.success) {
    return failure("invalid", "Please check the asset form fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    const asset = await deps.repo.updateRoomAsset(id, {
      roomId: parsed.data.roomId,
      name: parsed.data.name,
      assetTag: parsed.data.assetTag,
      category: parsed.data.category,
      isMovable: parsed.data.isMovable,
      condition: parsed.data.condition,
      quantity: parsed.data.quantity,
      serialNumber: parsed.data.serialNumber,
      modelNumber: parsed.data.modelNumber,
      notes: parsed.data.notes,
    });

    if (!asset) return failure("not_found", "Asset not found.");
    return success({ id: asset.id }, `Asset "${asset.name}" updated successfully.`);
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error.code, error.message);
    }
    return failure("unknown", "Could not update asset. Please try again.");
  }
}

export async function archiveRoomAssetService(
  id: string,
  actor: SessionUser | null,
  deps: AssetDeps,
): Promise<ServiceResult> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  try {
    const ok = await deps.repo.archiveRoomAsset(id);
    if (!ok) return failure("not_found", "Asset not found.");
    return success(undefined, "Asset archived.");
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error.code, error.message);
    }
    return failure("unknown", "Could not archive asset.");
  }
}

export async function moveRoomAssetService(
  formData: FormData,
  actor: SessionUser | null,
  deps: AssetDeps,
): Promise<ServiceResult<AssetMovement>> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const rawFields = {
    assetId: formData.get("assetId") ?? "",
    toRoomId: formData.get("toRoomId") ?? "",
    reason: formData.get("reason") ?? undefined,
  };

  const parsed = moveAssetSchema.safeParse(rawFields);
  if (!parsed.success) {
    return failure("invalid", "Please check the movement fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    const movement = await deps.repo.moveRoomAsset({
      assetId: parsed.data.assetId,
      toRoomId: parsed.data.toRoomId,
      movedBy: actor!.id,
      reason: parsed.data.reason,
    });

    await logAuditEvent(deps.repo, {
      actorId: actor?.id ?? null,
      actorName: actor?.fullName ?? "Staff Admin",
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? "admin",
      action: "asset.relocated",
      module: "assets",
      targetId: movement.assetId,
      details: {
        assetName: movement.assetName,
        assetTag: movement.assetTag,
        fromRoomName: movement.fromRoomName,
        toRoomName: movement.toRoomName,
        reason: movement.reason,
      },
    });

    return success(
      movement,
      `Transferred "${movement.assetName || "asset"}" to ${movement.toRoomName || "new room"}.`,
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error.code, error.message);
    }
    return failure("unknown", "Could not record asset movement. Please try again.");
  }
}
