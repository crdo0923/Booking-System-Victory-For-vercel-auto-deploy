import type { SessionUser } from "@/lib/auth/provider";
import { RepositoryError, type ImageStorage, type Repository } from "@/lib/data/repository";
import { failure, fieldErrorsFrom, success, type ServiceResult } from "@/lib/services/result";
import { safeImagePath, validateImageUpload } from "@/lib/storage/images";
import { roomIdSchema, roomFieldsSchema } from "@/lib/validation/rooms";
import { logAuditEvent } from "@/lib/services/audit";

export interface RoomDeps {
  repo: Repository;
  storage: ImageStorage;
}

const PREFIX = "rooms";

function requireAdminActor(actor: SessionUser | null): ServiceResult<never> | null {
  if (!actor) return failure("unauthenticated", "Your session has expired. Please sign in again.");
  if (actor.role !== "admin" || actor.accessStatus !== "active") return failure("forbidden", "Only administrators can manage rooms.");
  return null;
}

function parseBestFor(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,·\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createRoom(
  formData: FormData,
  actor: SessionUser | null,
  deps: RoomDeps,
): Promise<ServiceResult<{ id: string; slug: string }>> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const rawFields = {
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? undefined,
    shortDescription: formData.get("shortDescription") ?? "",
    fullDescription: formData.get("fullDescription") ?? undefined,
    capacity: formData.get("capacity") ?? "",
    building: formData.get("building") ?? undefined,
    floorLevel: formData.get("floorLevel") ?? undefined,
    locationLabel: formData.get("locationLabel") ?? "",
    bestFor: formData.get("bestFor") ?? undefined,
    dimensionsLM: formData.get("dimensionsLM") ?? undefined,
    dimensionsWM: formData.get("dimensionsWM") ?? undefined,
    airconHpTotal: formData.get("airconHpTotal") ?? undefined,
    baseWattageLightsAv: formData.get("baseWattageLightsAv") ?? undefined,
    customStatus: formData.get("customStatus") ?? undefined,
    customStatusMessage: formData.get("customStatusMessage") ?? undefined,
    customStatusSubtitle: formData.get("customStatusSubtitle") ?? undefined,
    ghlCalendarId: formData.get("ghlCalendarId") ?? undefined,
  };

  const fields = roomFieldsSchema.safeParse(rawFields);

  const photoEntry = formData.get("photo");
  const hasPhoto = photoEntry instanceof File && photoEntry.size > 0;
  const image = hasPhoto ? await validateImageUpload(photoEntry) : { ok: true as const, value: null };

  if (!fields.success || !image.ok) {
    return failure("invalid", "Please check the highlighted room fields.", {
      ...(fields.success ? {} : fieldErrorsFrom(fields.error.issues)),
      ...(!image.ok ? { photo: image.error } : {}),
    });
  }

  let imagePath: string | null = null;
  if (hasPhoto && "type" in image && image.type) {
    const path = safeImagePath(PREFIX, image.type.ext);
    try {
      await deps.storage.upload(path, image.bytes, image.type.mime);
      imagePath = path;
    } catch {
      return failure("storage_error", "The room photo couldn't be uploaded. Please try again.");
    }
  }

  try {
    const created = await deps.repo.createRoom({
      name: fields.data.name,
      slug: fields.data.slug,
      shortDescription: fields.data.shortDescription,
      fullDescription: fields.data.fullDescription,
      capacity: fields.data.capacity,
      bestFor: parseBestFor(fields.data.bestFor),
      locationLabel: fields.data.locationLabel,
      building: fields.data.building,
      floorLevel: fields.data.floorLevel,
      dimensionsLM: fields.data.dimensionsLM,
      dimensionsWM: fields.data.dimensionsWM,
      airconHpTotal: fields.data.airconHpTotal,
      baseWattageLightsAv: fields.data.baseWattageLightsAv,
      customStatus: fields.data.customStatus ?? "auto",
      customStatusMessage: fields.data.customStatusMessage ?? null,
      customStatusSubtitle: fields.data.customStatusSubtitle ?? null,
      imagePath,
      ghlCalendarId: fields.data.ghlCalendarId,
    });

    await logAuditEvent(deps.repo, {
      actorId: actor?.id ?? null,
      actorName: actor?.fullName ?? "Staff Admin",
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? "admin",
      action: "room.created",
      module: "rooms",
      targetId: created.id,
      details: {
        name: created.name,
        slug: created.slug,
        capacity: created.capacity,
        locationLabel: created.locationLabel,
      },
    });

    return success({ id: created.id, slug: created.slug }, "Room created successfully.");
  } catch (error) {
    if (error instanceof RepositoryError && error.code === "duplicate") {
      return failure("conflict", error.message, { slug: error.message });
    }
    console.error("[rooms] create failed:", error);
    return failure("unknown", "Failed to create room.");
  }
}

export async function updateRoom(
  formData: FormData,
  actor: SessionUser | null,
  deps: RoomDeps,
): Promise<ServiceResult<{ id: string }>> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const idCheck = roomIdSchema.safeParse({ id: formData.get("id") });
  if (!idCheck.success) return failure("invalid", "Room ID is missing.");

  const rawFields = {
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? undefined,
    shortDescription: formData.get("shortDescription") ?? "",
    fullDescription: formData.get("fullDescription") ?? undefined,
    capacity: formData.get("capacity") ?? "",
    building: formData.get("building") ?? undefined,
    floorLevel: formData.get("floorLevel") ?? undefined,
    locationLabel: formData.get("locationLabel") ?? "",
    bestFor: formData.get("bestFor") ?? undefined,
    dimensionsLM: formData.get("dimensionsLM") ?? undefined,
    dimensionsWM: formData.get("dimensionsWM") ?? undefined,
    airconHpTotal: formData.get("airconHpTotal") ?? undefined,
    baseWattageLightsAv: formData.get("baseWattageLightsAv") ?? undefined,
    customStatus: formData.get("customStatus") ?? undefined,
    customStatusMessage: formData.get("customStatusMessage") ?? undefined,
    customStatusSubtitle: formData.get("customStatusSubtitle") ?? undefined,
    ghlCalendarId: formData.get("ghlCalendarId") ?? undefined,
  };

  const fields = roomFieldsSchema.safeParse(rawFields);
  const photoEntry = formData.get("photo");
  const hasPhoto = photoEntry instanceof File && photoEntry.size > 0;
  const image = hasPhoto ? await validateImageUpload(photoEntry) : { ok: true as const, value: null };

  if (!fields.success || !image.ok) {
    return failure("invalid", "Please check the highlighted room fields.", {
      ...(fields.success ? {} : fieldErrorsFrom(fields.error.issues)),
      ...(!image.ok ? { photo: image.error } : {}),
    });
  }

  let imagePath: string | undefined = undefined;
  if (hasPhoto && "type" in image && image.type) {
    const path = safeImagePath(PREFIX, image.type.ext);
    try {
      await deps.storage.upload(path, image.bytes, image.type.mime);
      imagePath = path;
    } catch {
      return failure("storage_error", "The room photo couldn't be uploaded. Please try again.");
    }
  }

  try {
    await deps.repo.updateRoom(idCheck.data.id, {
      name: fields.data.name,
      slug: fields.data.slug,
      shortDescription: fields.data.shortDescription,
      fullDescription: fields.data.fullDescription,
      capacity: fields.data.capacity,
      bestFor: parseBestFor(fields.data.bestFor),
      locationLabel: fields.data.locationLabel,
      building: fields.data.building,
      floorLevel: fields.data.floorLevel,
      dimensionsLM: fields.data.dimensionsLM,
      dimensionsWM: fields.data.dimensionsWM,
      airconHpTotal: fields.data.airconHpTotal,
      baseWattageLightsAv: fields.data.baseWattageLightsAv,
      customStatus: fields.data.customStatus ?? "auto",
      customStatusMessage: fields.data.customStatusMessage ?? null,
      customStatusSubtitle: fields.data.customStatusSubtitle ?? null,
      ...(imagePath ? { imagePath } : {}),
      ghlCalendarId: fields.data.ghlCalendarId,
    });

    await logAuditEvent(deps.repo, {
      actorId: actor?.id ?? null,
      actorName: actor?.fullName ?? "Staff Admin",
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? "admin",
      action: "room.updated",
      module: "rooms",
      targetId: idCheck.data.id,
      details: {
        name: fields.data.name,
        slug: fields.data.slug,
        capacity: fields.data.capacity,
        customStatus: fields.data.customStatus,
        airconHpTotal: fields.data.airconHpTotal,
      },
    });

    return success({ id: idCheck.data.id }, "Room updated successfully.");
  } catch (error) {
    if (error instanceof RepositoryError && error.code === "duplicate") {
      return failure("conflict", error.message, { slug: error.message });
    }
    console.error("[rooms] update failed:", error);
    return failure("unknown", "Failed to update room.");
  }
}

export async function archiveRoom(
  params: { id: string; archived: boolean },
  actor: SessionUser | null,
  deps: RoomDeps,
): Promise<ServiceResult> {
  const denied = requireAdminActor(actor);
  if (denied) return denied;

  const check = roomIdSchema.safeParse({ id: params.id });
  if (!check.success) return failure("invalid", "Invalid room id.");

  try {
    await deps.repo.archiveRoom(check.data.id, params.archived);
    return success(undefined, params.archived ? "Room archived successfully." : "Room unarchived successfully.");
  } catch (error) {
    console.error("[rooms] archive failed:", error);
    return failure("unknown", "Failed to change room status.");
  }
}
