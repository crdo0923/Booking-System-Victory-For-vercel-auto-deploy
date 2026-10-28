import type { Metadata } from "next";
import Image from "next/image";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { imageUrl } from "@/lib/data";
import { getAllRooms } from "@/lib/data/queries";
import { firstParam } from "@/lib/validation/params";
import { AddRoomDialog } from "@/components/admin/add-room-dialog";
import { RoomRowActions } from "@/components/admin/room-row-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkTabs } from "@/components/ui/link-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StatusMark } from "@/components/ui/status";

export const metadata: Metadata = { title: "Manage Rooms" };

const filters = ["all", "active", "archived"] as const;
const filterSchema = z.enum(filters).catch("all");
const filterLabels: Record<(typeof filters)[number], string> = {
  all: "All rooms",
  active: "Active",
  archived: "Archived",
};

interface PageProps {
  searchParams: Promise<{ status?: string | string[] }>;
}

export default async function AdminRoomsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const filter = filterSchema.parse(firstParam((await searchParams).status));

  const all = (await getAllRooms({ includeArchived: true })).map((room) => ({
    ...room,
    imageUrl: imageUrl(room.imagePath),
  }));

  const counts = {
    all: all.length,
    active: all.filter((r) => !r.isArchived).length,
    archived: all.filter((r) => r.isArchived).length,
  };

  const list =
    filter === "all"
      ? all
      : filter === "active"
        ? all.filter((r) => !r.isArchived)
        : all.filter((r) => r.isArchived);

  return (
    <div>
      <PageHeader
        variant="operational"
        title="Rooms & Facilities"
        description="Configure church sanctuaries, ministry halls, and meeting rooms. Set dimensions for the seating layout editor, capacity, and air conditioning specs."
        actions={<AddRoomDialog />}
      />

      <div className="space-y-6">
        {/* Room List */}
        <section aria-labelledby="rooms-list-heading" className="min-w-0">
          <h2 id="rooms-list-heading" className="sr-only">
            All rooms
          </h2>

          <div className="flex items-center justify-between border-b border-line pb-4">
            <LinkTabs
              label="Filter rooms by status"
              tabs={filters.map((f) => ({
                href: f === "all" ? "/admin/rooms" : `/admin/rooms?status=${f}`,
                label: filterLabels[f],
                count: counts[f],
                active: f === filter,
              }))}
            />
          </div>

          {list.length === 0 ? (
            <EmptyState
              className="mt-10"
              title="No rooms match this filter"
              description="Create a room to make it bookable for ministries."
              action={<AddRoomDialog />}
            />
          ) : (
            <ol className="divide-y divide-line border-b border-line">
              {list.map((room) => (
                <li key={room.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-fill-quiet">
                      {room.imageUrl ? (
                        <Image src={room.imageUrl} alt={room.name} fill className="object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center font-serif text-xl font-bold text-muted">
                          {room.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-ink">{room.name}</h3>
                        {room.isArchived ? (
                          <StatusMark tone="cancelled" label="Archived" />
                        ) : room.customStatus === "maintenance" ? (
                          <StatusMark tone="pending" label="Under Maintenance" />
                        ) : room.customStatus === "cleaning" ? (
                          <StatusMark tone="brand" label="Cleaning & Reset" />
                        ) : room.customStatus === "in_use" ? (
                          <StatusMark tone="denied" label="Reserved / In Use" />
                        ) : room.customStatus === "available" ? (
                          <StatusMark tone="approved" label="Available" />
                        ) : (
                          <StatusMark tone="approved" label="Active (Auto)" />
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-muted">
                        {room.building ?? "Main Building"} · {room.floorLevel ?? "Ground Floor"} ·{" "}
                        <span className="font-semibold text-ink">Up to {room.capacity} seats</span>
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span>
                          Layout: <strong className="font-medium text-ink">{room.dimensionsLM ?? 10}m × {room.dimensionsWM ?? 8}m</strong>
                        </span>
                        <span>
                          Aircon: <strong className="font-medium text-ink">{room.airconHpTotal ?? 5} HP</strong>
                        </span>
                        {room.ghlCalendarId && (
                          <span className="text-emerald-700 font-mono">
                            GHL Linked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="self-end sm:self-center shrink-0">
                    <RoomRowActions room={room} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
