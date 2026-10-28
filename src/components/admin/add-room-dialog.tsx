"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RoomForm } from "@/components/admin/room-form";

export function AddRoomDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 font-semibold"
      >
        <Plus className="size-4" />
        Add Room
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add new room"
        description="Add a space to make it bookable for services, life groups, or ministry meetings."
        size="lg"
      >
        <div className="max-h-[75vh] overflow-y-auto px-1 py-1">
          <RoomForm onDone={() => setOpen(false)} />
        </div>
      </Dialog>
    </>
  );
}
