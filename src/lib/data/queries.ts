import "server-only";
import { cache } from "react";
import { getRepository } from "@/lib/data";

/**
 * Request-memoized reads shared by layouts and pages (e.g. the admin sidebar
 * counts and the page that shows the same numbers), so each runs once per request.
 */
export const getRepositoryForRequest = cache(getRepository);

/** Admin request counts: new bookings plus reschedule requests, by status. */
export const getBookingCounts = cache(async () => {
  const repo = await getRepositoryForRequest();
  const [bookings, reschedules] = await Promise.all([repo.countBookingsByStatus(), repo.countRescheduleRequestsByStatus()]);
  return {
    ...bookings,
    pending: bookings.pending + reschedules.pending,
    approved: bookings.approved + reschedules.approved,
    denied: bookings.denied + reschedules.denied,
  };
});

export const getUserCounts = cache(async () => (await getRepositoryForRequest()).countUsersByAccessStatus());

export const getActiveRooms = cache(async () => (await getRepositoryForRequest()).listActiveRooms());

export const getAllRooms = cache(async (options?: { includeArchived?: boolean }) => (await getRepositoryForRequest()).listAllRooms(options));

export const getRoomLayout = cache(async (roomId: string) => (await getRepositoryForRequest()).getRoomLayout(roomId));

export const getLayoutPresets = cache(async () => (await getRepositoryForRequest()).listLayoutPresets());

export const getKioskDisplays = cache(async () => (await getRepositoryForRequest()).listKioskDisplays());

export const getKioskDisplayByToken = cache(async (token: string) => (await getRepositoryForRequest()).getKioskDisplayByToken(token));

export const getInventoryItems = cache(async (includeArchived?: boolean) =>
  (await getRepositoryForRequest()).listInventoryItems(includeArchived),
);

export const getInventoryTransactions = cache(async (filter?: import("@/lib/data/types").InventoryTransactionFilter) =>
  (await getRepositoryForRequest()).listInventoryTransactions(filter),
);

export const getInventoryReportSummary = cache(async () =>
  (await getRepositoryForRequest()).getInventoryReportSummary(),
);

export const getRoomAssets = cache(
  async (options?: { roomId?: string; includeArchived?: boolean; isMovable?: boolean }) =>
    (await getRepositoryForRequest()).listRoomAssets(options),
);

export const getAssetMovements = cache(async (options?: { assetId?: string; roomId?: string }) =>
  (await getRepositoryForRequest()).listAssetMovements(options),
);

