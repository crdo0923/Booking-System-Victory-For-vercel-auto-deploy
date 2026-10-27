"use client";

import { useActionState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import type { Room, RoomAsset } from "@/lib/data/types";
import { ASSET_CATEGORIES, ASSET_CONDITIONS } from "@/lib/validation/assets";
import {
  createRoomAssetAction,
  updateRoomAssetAction,
  type AssetActionState,
} from "@/app/actions/assets";

interface RoomAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: RoomAsset | null;
  rooms: Room[];
  defaultRoomId?: string;
  onSuccess?: () => void;
}

const CATEGORY_LABELS: Record<(typeof ASSET_CATEGORIES)[number], string> = {
  av_production: "AV & Production Sound",
  furniture: "Furniture & Seating",
  instrument: "Musical Instruments",
  it_hardware: "IT & Video Conferencing",
  appliance: "Appliances & Aircon",
  fixture: "Architectural Fixtures",
  other: "Other Equipment",
};

const CONDITION_LABELS: Record<(typeof ASSET_CONDITIONS)[number], string> = {
  excellent: "Excellent (Like New)",
  good: "Good (Operational)",
  fair: "Fair (Visible Wear)",
  needs_repair: "Needs Repair / Servicing",
  damaged: "Damaged / Out of Commission",
};

export function RoomAssetDialog({
  open,
  onOpenChange,
  asset,
  rooms,
  defaultRoomId,
  onSuccess,
}: RoomAssetDialogProps) {
  const isEditing = Boolean(asset);
  const action = isEditing ? updateRoomAssetAction : createRoomAssetAction;
  const [state, formAction, isPending] = useActionState<AssetActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      onSuccess?.();
    }
  }, [state, onOpenChange, onSuccess]);

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={isEditing ? `Edit Asset: ${asset?.name}` : "Register New Room Asset"}
      description="Record fixed architectural fixtures or movable ministry gear assigned to specific rooms."
      size="md"
    >
      <form ref={formRef} action={formAction} className="space-y-4">
        {state && !state.ok && (
          <Notice tone="error" title="Submission failed">
            {state.error}
          </Notice>
        )}

        {isEditing && asset && <input type="hidden" name="id" value={asset.id} />}

        {/* Assigned Room */}
        <Field
          id="asset-room"
          label="Assigned Room / Space"
          error={state && !state.ok ? state.fieldErrors?.roomId : undefined}
        >
          <Select
            id="asset-room"
            name="roomId"
            defaultValue={asset?.roomId ?? defaultRoomId ?? rooms[0]?.id ?? ""}
            disabled={isPending}
            className="w-full"
            required
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.locationLabel})
              </option>
            ))}
          </Select>
        </Field>

        {/* Asset Name & Tag */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Field
              id="asset-name"
              label="Asset Name"
              error={state && !state.ok ? state.fieldErrors?.name : undefined}
            >
              <Input
                id="asset-name"
                name="name"
                defaultValue={asset?.name ?? ""}
                placeholder="e.g. Behringer X32 Console"
                disabled={isPending}
                required
              />
            </Field>
          </div>

          <div>
            <Field
              id="asset-tag"
              label="Asset Tag"
              optional
              error={state && !state.ok ? state.fieldErrors?.assetTag : undefined}
            >
              <Input
                id="asset-tag"
                name="assetTag"
                defaultValue={asset?.assetTag ?? ""}
                placeholder="VIC-MIX-001"
                disabled={isPending}
              />
            </Field>
          </div>
        </div>

        {/* Category & Movable Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            id="asset-category"
            label="Category"
            error={state && !state.ok ? state.fieldErrors?.category : undefined}
          >
            <Select
              id="asset-category"
              name="category"
              defaultValue={asset?.category ?? "av_production"}
              disabled={isPending}
              className="w-full"
              required
            >
              {ASSET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id="asset-mobility"
            label="Asset Portability"
            error={state && !state.ok ? state.fieldErrors?.isMovable : undefined}
          >
            <Select
              id="asset-mobility"
              name="isMovable"
              defaultValue={asset ? (asset.isMovable ? "true" : "false") : "true"}
              disabled={isPending}
              className="w-full"
              required
            >
              <option value="true">Movable (Can be relocated/wheeled)</option>
              <option value="false">Fixed (Permanent / Wall-mounted / Fixture)</option>
            </Select>
          </Field>
        </div>

        {/* Condition & Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            id="asset-condition"
            label="Condition"
            error={state && !state.ok ? state.fieldErrors?.condition : undefined}
          >
            <Select
              id="asset-condition"
              name="condition"
              defaultValue={asset?.condition ?? "good"}
              disabled={isPending}
              className="w-full"
              required
            >
              {ASSET_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {CONDITION_LABELS[cond]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id="asset-quantity"
            label="Quantity"
            error={state && !state.ok ? state.fieldErrors?.quantity : undefined}
          >
            <Input
              id="asset-quantity"
              name="quantity"
              type="number"
              min={1}
              max={1000}
              defaultValue={asset?.quantity ?? 1}
              disabled={isPending}
              required
            />
          </Field>
        </div>

        {/* Serial & Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            id="asset-serial"
            label="Serial Number"
            optional
            error={state && !state.ok ? state.fieldErrors?.serialNumber : undefined}
          >
            <Input
              id="asset-serial"
              name="serialNumber"
              defaultValue={asset?.serialNumber ?? ""}
              placeholder="e.g. SN-88391-B"
              disabled={isPending}
            />
          </Field>

          <Field
            id="asset-model"
            label="Model Number"
            optional
            error={state && !state.ok ? state.fieldErrors?.modelNumber : undefined}
          >
            <Input
              id="asset-model"
              name="modelNumber"
              defaultValue={asset?.modelNumber ?? ""}
              placeholder="e.g. X32 Standard"
              disabled={isPending}
            />
          </Field>
        </div>

        {/* Notes */}
        <Field
          id="asset-notes"
          label="Notes & Placement Specifications"
          optional
          error={state && !state.ok ? state.fieldErrors?.notes : undefined}
        >
          <Textarea
            id="asset-notes"
            name="notes"
            rows={2}
            defaultValue={asset?.notes ?? ""}
            placeholder="Placement details, flight case info, or maintenance notes..."
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
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Register Asset"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
