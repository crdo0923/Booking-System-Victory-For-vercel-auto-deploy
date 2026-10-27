import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EVENT_TYPES } from "@/lib/config";
import { requireAdmin } from "@/lib/auth/session";
import { getActiveRooms, getRepositoryForRequest } from "@/lib/data/queries";
import { dateKeyInZone, timeKeyInZone } from "@/lib/domain/time";
import { parseUuid } from "@/lib/validation/params";
import { AdminBookingEditForm } from "@/components/admin/admin-booking-edit-form";

export const metadata: Metadata = { title: "Edit booking" };

export default async function AdminBookingEditPage({ params }: PageProps<"/admin/bookings/[id]/edit">) {
  await requireAdmin();
  const id = parseUuid((await params).id);
  if (!id) notFound();
  const repo = await getRepositoryForRequest();
  const [booking, rooms] = await Promise.all([repo.getBookingDetails(id), getActiveRooms()]);
  if (!booking || booking.status !== "approved") notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <Link href={`/admin/bookings/${booking.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Booking details
      </Link>
      <header className="border-b border-line pb-6">
        <p className="eyebrow text-[10px] text-accent-ink">Approved booking</p>
        <h1 className="title mt-1 text-3xl">Edit {booking.eventName}</h1>
        <p className="mt-2 text-sm text-muted">Changes update the room calendar and the requester&apos;s Google Calendar when connected.</p>
      </header>
      <AdminBookingEditForm
        booking={booking}
        rooms={rooms}
        eventTypes={EVENT_TYPES}
        initialDate={dateKeyInZone(booking.startTime)}
        initialStart={timeKeyInZone(booking.startTime)}
        initialEnd={timeKeyInZone(booking.endTime)}
      />
    </div>
  );
}
