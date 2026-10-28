import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getRepositoryForRequest } from "@/lib/data/queries";
import type { BookingWithRoom, RescheduleRequest } from "@/lib/data/types";
import { formatDate } from "@/lib/domain/time";
import { RESCHEDULE_SUBMITTED_MESSAGE } from "@/lib/services/reschedules";
import { firstParam, parseUuid } from "@/lib/validation/params";
import { BookingRow } from "@/components/bookings/booking-row";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkTabs } from "@/components/ui/link-tabs";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "My Bookings" };

const views = ["upcoming", "pending", "approved", "denied", "cancelled", "past"] as const;
type View = (typeof views)[number];
const viewSchema = z.enum(views).catch("upcoming");

const labels: Record<View, string> = { upcoming: "Upcoming", pending: "Pending", approved: "Approved", denied: "Denied", cancelled: "Cancelled", past: "Past" };

const emptyCopy: Record<View, { title: string; description?: string }> = {
  upcoming: { title: "Nothing coming up", description: "Find a room for your next gathering — approved bookings appear here and on your Google Calendar." },
  pending: { title: "No requests waiting", description: "Requests you send stay here until the church office reviews them." },
  approved: { title: "No approved bookings yet" },
  denied: { title: "No denied requests" },
  cancelled: { title: "No cancelled bookings" },
  past: { title: "No past bookings yet" },
};

function filterBookings(all: BookingWithRoom[], view: View, now: Date): BookingWithRoom[] {
  const isFuture = (b: BookingWithRoom) => new Date(b.endTime) > now;
  const ascending = (a: BookingWithRoom, b: BookingWithRoom) => a.startTime.localeCompare(b.startTime);
  switch (view) {
    case "upcoming":
      return all.filter((b) => isFuture(b) && (b.status === "pending" || b.status === "approved")).sort(ascending);
    case "past":
      return all.filter((b) => !isFuture(b) && b.status !== "cancelled");
    default:
      return all.filter((b) => b.status === view);
  }
}

function groupByMonth(list: BookingWithRoom[]): [string, BookingWithRoom[]][] {
  const groups = new Map<string, BookingWithRoom[]>();
  for (const booking of list) {
    const key = formatDate(booking.startTime, "MMMM yyyy");
    groups.set(key, [...(groups.get(key) ?? []), booking]);
  }
  return [...groups.entries()];
}

export default async function MyBookingsPage({ searchParams }: PageProps<"/bookings">) {
  const user = await requireUser();
  const query = await searchParams;
  const view = viewSchema.parse(firstParam(query.view));
  const highlightId = parseUuid(firstParam(query.new));
  const rescheduledId = parseUuid(firstParam(query.rescheduled));

  const now = new Date();
  const repo = await getRepositoryForRequest();
  const [all, requests, itemRequests] = await Promise.all([repo.listBookingsForUser(user.id), repo.listRescheduleRequestsForUser(user.id), repo.listItemRequestsForUser(user.id)]);
  const itemRequestHistory = Object.fromEntries(await Promise.all(itemRequests.map(async (request) => [request.id, await repo.listItemRequestHistory(request.id)] as const)));
  const requestsByBooking = new Map<string, RescheduleRequest[]>();
  for (const request of requests) requestsByBooking.set(request.bookingId, [...(requestsByBooking.get(request.bookingId) ?? []), request]);
  const counts = Object.fromEntries(views.map((v) => [v, filterBookings(all, v, now).length])) as Record<View, number>;
  const list = filterBookings(all, view, now);
  const empty = emptyCopy[view];

  return (
    <div>
      <PageHeader
        eyebrow="Your requests"
        title="My bookings"
        description="Requests stay pending until the church office reviews them. You'll get an email either way."
        actions={
          <Link href="/rooms" className={buttonStyles()}>
            Book a room
          </Link>
        }
      />

      {highlightId && all.some((b) => b.id === highlightId) && (
        <Notice tone="success" title="Request sent" className="mb-8">
          It&apos;s pending review. Once approved, it&apos;s added to your Google Calendar automatically.
        </Notice>
      )}

      {rescheduledId && requests.some((r) => r.bookingId === rescheduledId && r.status === "pending") && (
        <Notice tone="success" title="Reschedule request sent" className="mb-8">
          {RESCHEDULE_SUBMITTED_MESSAGE}
        </Notice>
      )}

      <LinkTabs
        label="Filter bookings"
        tabs={views.map((v) => ({ href: v === "upcoming" ? "/bookings" : `/bookings?view=${v}`, label: labels[v], count: counts[v], active: v === view }))}
      />

      {itemRequests.length > 0 && (
        <section className="mt-10 border-y border-line py-5" aria-labelledby="item-request-history">
          <h2 id="item-request-history" className="text-lg font-extrabold">Room setup requests</h2>
          <p className="mt-1 text-sm text-muted">Track chairs, equipment, and supplies requested with your bookings.</p>
          <ul className="mt-4 divide-y divide-line">
            {itemRequests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold">{request.quantity} × {request.itemName}</span>
                <span className="eyebrow text-muted">{request.status[0].toUpperCase() + request.status.slice(1)}</span>
                {(itemRequestHistory[request.id] ?? []).length > 0 && (
                  <details className="w-full text-xs text-muted">
                    <summary className="cursor-pointer font-semibold">Status history</summary>
                    <ul className="mt-2 space-y-1">
                      {itemRequestHistory[request.id].map((event) => (
                        <li key={event.id}>{event.fromStatus ?? "New"} → {event.toStatus}{event.note ? ` · ${event.note}` : ""}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length > 0 ? (
        <div className="mt-2">
          {groupByMonth(list).map(([month, bookings]) => (
            <section key={month} aria-label={month} className="mt-8">
              <h2 className="eyebrow border-b border-line pb-3 text-muted">{month}</h2>
              <ol className="divide-y divide-line">
                {bookings.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} now={now} highlight={booking.id === highlightId} reschedules={requestsByBooking.get(booking.id)} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-10"
          title={empty.title}
          description={empty.description}
          action={
            view === "upcoming" ? (
              <Link href="/rooms" className={buttonStyles({ variant: "secondary" })}>
                Browse rooms
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
