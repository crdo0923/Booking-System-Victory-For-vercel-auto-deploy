"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ExternalLink, LayoutGrid, Pencil, ShieldCheck } from "lucide-react";
import { toggleArchiveRoomAction } from "@/app/actions/rooms";
import type { Room } from "@/lib/data/types";
import { Dialog } from "@/components/ui/dialog";
import { RoomForm } from "@/components/admin/room-form";

export function RoomRowActions({ room }: { room: Room & { imageUrl: string | null } }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isArchiving, startTransition] = useTransition();

  function toggleArchive() {
    startTransition(async () => {
      const willArchive = !room.isArchived;
      const res = await toggleArchiveRoomAction(room.id, willArchive);
      if (res.ok) {
        toast.success(willArchive ? `${room.name} archived.` : `${room.name} restored.`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/rooms/${room.slug}`}
          target="_blank"
          className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-fill-quiet hover:text-ink"
          title="View public room page"
        >
          <ExternalLink className="size-4" />
          <span className="sr-only">View {room.name}</span>
        </Link>

        <Link
          href={`/admin/rooms/${room.id}/layout`}
          className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-fill-quiet hover:text-brand"
          title="Open Seating Layout Editor"
        >
          <LayoutGrid className="size-4" />
          <span className="sr-only">Layout Editor {room.name}</span>
        </Link>

        <Link
          href={`/admin/assets?roomId=${room.id}`}
          className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-fill-quiet hover:text-ink"
          title="View & manage room assets"
        >
          <ShieldCheck className="size-4" />
          <span className="sr-only">Assets in {room.name}</span>
        </Link>

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-fill-quiet hover:text-ink"
          title="Edit room specs"
        >
          <Pencil className="size-4" />
          <span className="sr-only">Edit {room.name}</span>
        </button>

        <button
          type="button"
          onClick={toggleArchive}
          disabled={isArchiving}
          className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-fill-quiet hover:text-ink disabled:opacity-50"
          title={room.isArchived ? "Restore room" : "Archive room"}
        >
          {room.isArchived ? <ArchiveRestore className="size-4 text-emerald-600" /> : <Archive className="size-4" />}
          <span className="sr-only">{room.isArchived ? "Restore" : "Archive"} {room.name}</span>
        </button>
      </div>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Room: ${room.name}`}
        description="Update room identity, dimensions, capacity, and air conditioning specs."
        size="lg"
      >
        <div className="max-h-[75vh] overflow-y-auto px-1 py-1">
          <RoomForm
            initial={{
              id: room.id,
              name: room.name,
              slug: room.slug,
              shortDescription: room.shortDescription,
              fullDescription: room.fullDescription,
              capacity: room.capacity,
              building: room.building,
              floorLevel: room.floorLevel,
              locationLabel: room.locationLabel,
              bestFor: room.bestFor,
              dimensionsLM: room.dimensionsLM,
              dimensionsWM: room.dimensionsWM,
              airconHpTotal: room.airconHpTotal,
              baseWattageLightsAv: room.baseWattageLightsAv,
              customStatus: room.customStatus,
              customStatusMessage: room.customStatusMessage,
              customStatusSubtitle: room.customStatusSubtitle,
              imageUrl: room.imageUrl,
              ghlCalendarId: room.ghlCalendarId,
            }}
            onDone={() => setEditOpen(false)}
          />
        </div>
      </Dialog>
    </>
  );
}
