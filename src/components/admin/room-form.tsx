"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImageUp } from "lucide-react";
import { createRoomAction, updateRoomAction, type RoomActionState } from "@/app/actions/rooms";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export interface RoomFormValues {
  id?: string;
  name: string;
  slug?: string;
  shortDescription: string;
  fullDescription?: string;
  capacity: number;
  building?: string;
  floorLevel?: string;
  locationLabel: string;
  bestFor?: string[];
  dimensionsLM?: number;
  dimensionsWM?: number;
  airconHpTotal?: number;
  baseWattageLightsAv?: number;
  customStatus?: "auto" | "available" | "in_use" | "maintenance" | "cleaning";
  customStatusMessage?: string | null;
  customStatusSubtitle?: string | null;
  imageUrl?: string | null;
  ghlCalendarId?: string | null;
}

interface RoomFormProps {
  initial?: RoomFormValues;
  onDone?: () => void;
}

export function RoomForm(props: RoomFormProps) {
  const [formKey, setFormKey] = useState(0);
  return <RoomFormFields key={formKey} {...props} onCreated={() => setFormKey((k) => k + 1)} />;
}

function RoomFormFields({ initial, onDone, onCreated }: RoomFormProps & { onCreated: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<RoomActionState>(null);
  const [pending, startTransition] = useTransition();
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await (isEdit ? updateRoomAction : createRoomAction)(null, formData);
      setState(result);
      if (result?.ok) {
        toast.success(isEdit ? "Room updated successfully." : "Room added to directory.");
        if (isEdit) {
          onDone?.();
        } else {
          setPreview(null);
          onCreated();
        }
      } else if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  const currentImage = preview ?? initial?.imageUrl;

  return (
    <form action={submit} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={initial?.id} />}

      {state && !state.ok && <Notice tone="error">{state.error}</Notice>}

      <div className="space-y-4">
        <Field id="room-name" label="Room name" error={errors.name}>
          <Input id="room-name" name="name" defaultValue={initial?.name} placeholder="e.g. Youth Hall" required />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="room-building" label="Building" error={errors.building}>
            <Input id="room-building" name="building" defaultValue={initial?.building ?? "Main Building"} placeholder="Main Building" required />
          </Field>
          <Field id="room-floor" label="Floor level" error={errors.floorLevel}>
            <Input id="room-floor" name="floorLevel" defaultValue={initial?.floorLevel ?? "Ground Floor"} placeholder="e.g. 2nd Floor" required />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="room-location" label="Location label" error={errors.locationLabel} hint="Shown on room cards">
            <Input id="room-location" name="locationLabel" defaultValue={initial?.locationLabel} placeholder="e.g. 2nd Floor · West Wing" required />
          </Field>
          <Field id="room-capacity" label="Seating capacity" error={errors.capacity}>
            <Input id="room-capacity" name="capacity" type="number" min={1} max={5000} defaultValue={initial?.capacity ?? 40} required />
          </Field>
        </div>

        <Field id="room-desc" label="Short description" error={errors.shortDescription} hint="Summary shown in directory and cards">
          <Textarea id="room-desc" name="shortDescription" defaultValue={initial?.shortDescription} rows={2} placeholder="Brief summary of room layout and equipment..." required />
        </Field>

        <Field id="room-bestfor" label="Best for (activities)" error={errors.bestFor} hint="Separate by commas (e.g. Youth services, Discipleship, Worship rehearsal)" optional>
          <Input id="room-bestfor" name="bestFor" defaultValue={initial?.bestFor?.join(", ")} placeholder="Youth services, Rehearsals, Small groups" />
        </Field>

        {/* Live Display & Door Sign Status Override */}
        <div className="rounded-md border border-line bg-sunken/40 p-4 space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Door Sign & TV Display Status</h3>
            <p className="mt-1 text-xs text-muted">Control the real-time status banner and headline displayed on door tablets and the lobby hub.</p>
          </div>

          <Field id="room-custom-status" label="Status mode" error={errors.customStatus}>
            <select
              id="room-custom-status"
              name="customStatus"
              defaultValue={initial?.customStatus ?? "auto"}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="auto">Auto (Follows real-time schedule & bookings)</option>
              <option value="available">Force Available (Green Dot / Open for Ministry)</option>
              <option value="in_use">Force In Use / Reserved (Red Dot / Session in progress)</option>
              <option value="maintenance">Under Maintenance (Facility maintenance / repair)</option>
              <option value="cleaning">Post-Service Cleaning (Sanitizing & reset)</option>
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              id="room-custom-headline"
              label="Headline override (Optional)"
              error={errors.customStatusMessage}
              hint="e.g. Available for Ministry, Facility Maintenance, Reserved"
              optional
            >
              <Input
                id="room-custom-headline"
                name="customStatusMessage"
                defaultValue={initial?.customStatusMessage ?? ""}
                placeholder="e.g. Available for Ministry"
              />
            </Field>

            <Field
              id="room-custom-sub"
              label="Subtitle / Directives (Optional)"
              error={errors.customStatusSubtitle}
              hint="e.g. Open for discipleship, prayer, or maintenance note"
              optional
            >
              <Input
                id="room-custom-sub"
                name="customStatusSubtitle"
                defaultValue={initial?.customStatusSubtitle ?? ""}
                placeholder="e.g. Open for discipleship and personal prayer..."
              />
            </Field>
          </div>
        </div>

        {/* Spatial Dimensions for Layout Editor */}
        <div className="rounded-md border border-line bg-sunken/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Room Dimensions & Layout Specs</h3>
          <p className="mt-1 text-xs text-muted">Used by the interactive seating layout editor.</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field id="room-dim-l" label="Length (meters)" error={errors.dimensionsLM} optional>
              <Input id="room-dim-l" name="dimensionsLM" type="number" step="0.5" min={2} max={100} defaultValue={initial?.dimensionsLM ?? 10} />
            </Field>
            <Field id="room-dim-w" label="Width (meters)" error={errors.dimensionsWM} optional>
              <Input id="room-dim-w" name="dimensionsWM" type="number" step="0.5" min={2} max={100} defaultValue={initial?.dimensionsWM ?? 8} />
            </Field>
          </div>
        </div>

        {/* Electrical & Utility Specs for Forecasting */}
        <div className="rounded-md border border-line bg-sunken/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Utility & Appliance Specs</h3>
          <p className="mt-1 text-xs text-muted">Used for automatic electricity cost estimations.</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field id="room-aircon" label="Air conditioning (Total HP)" error={errors.airconHpTotal} optional>
              <Input id="room-aircon" name="airconHpTotal" type="number" step="0.5" min={0} max={100} defaultValue={initial?.airconHpTotal ?? 5} />
            </Field>
            <Field id="room-lighting" label="Lighting & AV (Watts)" error={errors.baseWattageLightsAv} optional>
              <Input id="room-lighting" name="baseWattageLightsAv" type="number" step="100" min={0} max={50000} defaultValue={initial?.baseWattageLightsAv ?? 1200} />
            </Field>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-ink">Room photo</label>
          {currentImage ? (
            <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-md border border-line bg-fill-quiet">
              <Image src={currentImage} alt="Room preview" fill className="object-cover" />
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-surface px-4 py-3 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-ink">
            <ImageUp className="size-4 text-brand" />
            <span>{isEdit ? "Upload new photo to replace" : "Upload room photo"}</span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />
          </label>
          <p className="text-xs text-muted">Landscape 4:3 ratio photo taken in daylight works best.</p>
        </div>

        <Field id="room-ghl" label="GHL Calendar ID" error={errors.ghlCalendarId} hint="Links room bookings to a GoHighLevel staff calendar" optional>
          <Input id="room-ghl" name="ghlCalendarId" defaultValue={initial?.ghlCalendarId ?? ""} placeholder="Optional calendar ID" />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        {onDone && (
          <button type="button" onClick={onDone} className="rounded-md px-3.5 py-2 text-sm font-bold text-muted hover:text-ink">
            Cancel
          </button>
        )}
        <SubmitButton pending={pending} pendingLabel={isEdit ? "Saving…" : "Creating…"}>
          {isEdit ? "Save changes" : "Create room"}
        </SubmitButton>
      </div>
    </form>
  );
}
