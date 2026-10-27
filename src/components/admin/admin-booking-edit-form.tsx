"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { editApprovedBookingAction, type AdminEditActionState } from "@/app/actions/bookings";
import type { BookingDetails, Room } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

interface Props {
  booking: BookingDetails;
  rooms: Room[];
  eventTypes: readonly { value: string; label: string }[];
  initialDate: string;
  initialStart: string;
  initialEnd: string;
}

export function AdminBookingEditForm({ booking, rooms, eventTypes, initialDate, initialStart, initialEnd }: Props) {
  const router = useRouter();
  const [state, setState] = useState<AdminEditActionState>(null);
  const [pending, startTransition] = useTransition();
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await editApprovedBookingAction(null, formData);
      setState(result);
      if (result?.ok) {
        toast.success(result.message);
        router.push(`/admin/bookings/${booking.id}`);
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className="space-y-6"
    >
      <input type="hidden" name="bookingId" value={booking.id} />
      {state && !state.ok && <p className="rounded-md bg-denied-bg px-4 py-3 text-sm font-semibold text-denied">{state.error}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="roomId" label="Room" error={errors.roomId}>
          <Select id="roomId" name="roomId" defaultValue={booking.roomId}>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · up to {room.capacity}</option>)}
          </Select>
        </Field>
        <Field id="date" label="Date" error={errors.date}>
          <Input id="date" name="date" type="date" defaultValue={initialDate} />
        </Field>
        <Field id="startTime" label="Start time" error={errors.startTime}>
          <Input id="startTime" name="startTime" type="time" step={1800} defaultValue={initialStart} />
        </Field>
        <Field id="endTime" label="End time" error={errors.endTime}>
          <Input id="endTime" name="endTime" type="time" step={1800} defaultValue={initialEnd} />
        </Field>
      </div>
      <Field id="eventName" label="Event name" error={errors.eventName}>
        <Input id="eventName" name="eventName" defaultValue={booking.eventName} maxLength={120} />
      </Field>
      <Field id="eventType" label="Event type" error={errors.eventType}>
        <Select id="eventType" name="eventType" defaultValue={booking.eventType}>
          {eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </Select>
      </Field>
      <Field id="attendeeCount" label="Attendees" error={errors.attendeeCount}>
        <Input id="attendeeCount" name="attendeeCount" type="number" min={1} max={1000} defaultValue={booking.attendeeCount} />
      </Field>
      <Field id="purpose" label="Purpose" error={errors.purpose}>
        <Textarea id="purpose" name="purpose" rows={5} maxLength={1000} defaultValue={booking.purpose} />
      </Field>
      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending}>Cancel</Button>
        <Button type="submit" busy={pending} busyLabel="Saving changes…">Save changes</Button>
      </div>
    </form>
  );
}
