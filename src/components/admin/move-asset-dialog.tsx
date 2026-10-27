"use client";

import { useActionState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import type { Room, RoomAsset } from "@/lib/data/types";
import {
  moveRoomAssetAction,
  type MoveAssetActionState,
} from "@/app/actions/assets";

interface MoveAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: RoomAsset | null;
  rooms: Room[];
  onSuccess?: () => void;
}

export function MoveAssetDialog({
  open,
  onOpenChange,
  asset,
  rooms,
  onSuccess,
}: MoveAssetDialogProps) {
  const [state, formAction, isPending] = useActionState<MoveAssetActionState, FormData>(
    moveRoomAssetAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      onSuccess?.();
    }
  }, [state, onOpenChange, onSuccess]);

  if (!asset) return null;

  const otherRooms = rooms.filter((r) => r.id !== asset.roomId);

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={`Transfer Movable Asset: ${asset.name}`}
      description="Track physical relocation between church facilities and keep audit history."
      size="md"
    >
      <form ref={formRef} action={formAction} className="space-y-4">
        {state && !state.ok && (
          <Notice tone="error" title="Relocation failed">
            {state.error}
          </Notice>
        )}

        <input type="hidden" name="assetId" value={asset.id} />

        {/* Current Location Badge */}
        <div className="p-3 rounded border border-line bg-canvas/60 text-xs space-y-1">
          <div className="text-muted flex justify-between">
            <span>Asset:</span>
            <span className="font-bold text-ink">{asset.name}</span>
          </div>
          <div className="text-muted flex justify-between">
            <span>Asset Tag / Serial:</span>
            <span className="font-mono text-ink">{asset.assetTag || asset.serialNumber || "N/A"}</span>
          </div>
          <div className="text-muted flex justify-between">
            <span>Current Room:</span>
            <span className="font-semibold text-ink">{asset.roomName || "Current Room"}</span>
          </div>
        </div>

        {/* Destination Room */}
        <Field
          id="move-to-room"
          label="Destination Room"
          hint="Select the space where this gear is being transferred."
          error={state && !state.ok ? state.fieldErrors?.toRoomId : undefined}
        >
          <Select
            id="move-to-room"
            name="toRoomId"
            defaultValue={otherRooms[0]?.id ?? ""}
            disabled={isPending}
            className="w-full"
            required
          >
            {otherRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.locationLabel})
              </option>
            ))}
          </Select>
        </Field>

        {/* Reason / Ministry Purpose */}
        <Field
          id="move-reason"
          label="Movement Purpose / Reason"
          hint="e.g. Relocated for Youth Night, Audio upgrade for Sunday AM, Rehearsal"
          optional
          error={state && !state.ok ? state.fieldErrors?.reason : undefined}
        >
          <Textarea
            id="move-reason"
            name="reason"
            rows={2}
            placeholder="Add ministry reason or event name..."
            disabled={isPending}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button
            type="button"
            variant="quiet"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending || otherRooms.length === 0}>
            {isPending ? "Recording transfer..." : "Confirm Relocation"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
