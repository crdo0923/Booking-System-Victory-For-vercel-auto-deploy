import type { SessionUser } from "@/lib/auth/provider";
import { RepositoryError, type Repository } from "@/lib/data/repository";
import type { InventoryItem } from "@/lib/data/types";
import { failure, fieldErrorsFrom, success, type ServiceResult } from "@/lib/services/result";
import {
  inventoryItemFieldsSchema,
  inventoryItemIdSchema,
  type InventoryItemFields,
} from "@/lib/validation/inventory";

export interface InventoryDeps {
  repo: Repository;
}

function requireAdminActor(actor: SessionUser | null): ServiceResult<never> | null {
  if (!actor) return failure("unauthenticated", "Your session has expired. Please sign in again.");
  if (actor.role !== "admin" || actor.accessStatus !== "active") {
    return failure("forbidden", "Only administrators can manage inventory items.");
  }
  return null;
}

export async function createInventoryItemService(
  formData: FormData,
  actor: SessionUser | null,
  deps: InventoryDeps,
): Promise<ServiceResult<{ id: string }>> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const rawFields = {
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    unit: formData.get("unit") ?? "",
    currentStock: formData.get("currentStock") ?? "",
    reorderThreshold: formData.get("reorderThreshold") ?? "",
    unitCost: formData.get("unitCost") ?? undefined,
    location: formData.get("location") ?? "",
  };

  const parsed = inventoryItemFieldsSchema.safeParse(rawFields);
  if (!parsed.success) {
    return failure("invalid", "Please check the inventory form fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    const item = await deps.repo.createInventoryItem({
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      currentStock: parsed.data.currentStock,
      reorderThreshold: parsed.data.reorderThreshold,
      unitCost: parsed.data.unitCost ?? null,
      location: parsed.data.location,
    });
    return success({ id: item.id }, "Consumable item added successfully.");
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error.code, error.message);
    }
    return failure("unknown", "Could not save inventory item. Please try again.");
  }
}

export async function updateInventoryItemService(
  formData: FormData,
  actor: SessionUser | null,
  deps: InventoryDeps,
): Promise<ServiceResult<{ id: string }>> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const idParsed = inventoryItemIdSchema.safeParse({ id: formData.get("id") });
  if (!idParsed.success) {
    return failure("invalid", "Missing inventory item id.", fieldErrorsFrom(idParsed.error.issues));
  }

  const rawFields = {
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    unit: formData.get("unit") ?? "",
    currentStock: formData.get("currentStock") ?? "",
    reorderThreshold: formData.get("reorderThreshold") ?? "",
    unitCost: formData.get("unitCost") ?? undefined,
    location: formData.get("location") ?? "",
  };

  const parsed = inventoryItemFieldsSchema.safeParse(rawFields);
  if (!parsed.success) {
    return failure("invalid", "Please check the inventory form fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    const updated = await deps.repo.updateInventoryItem(idParsed.data.id, {
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      currentStock: parsed.data.currentStock,
      reorderThreshold: parsed.data.reorderThreshold,
      unitCost: parsed.data.unitCost ?? null,
      location: parsed.data.location,
    });
    if (!updated) {
      return failure("not_found", "Inventory item not found.");
    }
    return success({ id: updated.id }, "Consumable item updated successfully.");
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error.code, error.message);
    }
    return failure("unknown", "Could not update inventory item. Please try again.");
  }
}

export async function archiveInventoryItemService(
  id: string,
  actor: SessionUser | null,
  deps: InventoryDeps,
): Promise<ServiceResult> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const parsed = inventoryItemIdSchema.safeParse({ id });
  if (!parsed.success) {
    return failure("invalid", "Invalid inventory item id.");
  }

  try {
    const ok = await deps.repo.archiveInventoryItem(parsed.data.id);
    if (!ok) {
      return failure("not_found", "Inventory item not found.");
    }
    return success(undefined, "Inventory item archived.");
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error.code, error.message);
    }
    return failure("unknown", "Could not archive inventory item.");
  }
}
