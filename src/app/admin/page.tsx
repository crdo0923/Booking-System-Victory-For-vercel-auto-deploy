import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  CircleAlert,
  ClipboardList,
  Monitor,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getRepositoryForRequest, getBookingCounts, getUserCounts, getActiveRooms } from "@/lib/data/queries";
import { formatPhone } from "@/lib/domain/phone";
import { addDaysToKey, dateKeyInZone, formatDate, formatTimeRange, zonedDayRange } from "@/lib/domain/time";
import { RoomUsageTimeline } from "@/components/admin/room-usage-timeline";
import { PageHeader } from "@/components/ui/page-header";
import { StatusMark } from "@/components/ui/status";

export const metadata: Metadata = {
  title: "Admin dashboard",
  description: "A clear view of bookings, room availability, resources, and requests that need attention.",
};

type Result<T> = { value: T; error: boolean };

async function read<T>(operation: Promise<T>, fallback: T): Promise<Result<T>> {
  try {
    return { value: await operation, error: false };
  } catch {
    return { value: fallback, error: true };
  }
}

function SummaryStat({
  href,
  label,
  value,
  detail,
  icon: Icon,
  tone = "text-ink",
}: {
  href: string;
  label: string;
  value: number | string;
  detail: string;
  icon: typeof CalendarDays;
  tone?: string;
}) {
  return (
    <Link href={href} className="group border border-line bg-surface p-5 transition-colors hover:border-ink/40 hover:bg-sunken/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-bold text-muted">{label}</span>
        <Icon className="size-5 text-muted transition-colors group-hover:text-brand" aria-hidden />
      </div>
      <p className={`mt-4 text-3xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand">
        Review <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-ink pt-3" aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="text-[15px] font-extrabold">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-bold text-brand hover:underline">
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const repo = await getRepositoryForRequest();
  const now = new Date();
  const today = dateKeyInZone(now);
  const { start: dayStart, end: dayEnd } = zonedDayRange(today);
  const weekEnd = zonedDayRange(addDaysToKey(today, 7)).start;
  const [bookings, users, rooms, inventory, assets, itemRequests, shuttles, displays, pendingBookings, pendingReschedules, pendingUsers, todays, upcoming] = await Promise.all([
    read(getBookingCounts(), { pending: 0, approved: 0, denied: 0, cancelled: 0 }),
    read(getUserCounts(), { pending: 0, active: 0, denied: 0, revoked: 0 }),
    read(getActiveRooms(), []),
    read(repo.listInventoryItems(false), []),
    read(repo.listRoomAssets({ includeArchived: false }), []),
    read(repo.listItemRequests("submitted"), []),
    read(repo.listShuttleRequests("pending"), []),
    read(repo.listKioskDisplays(), []),
    read(repo.listBookingsByStatus("pending", 5), []),
    read(repo.listRescheduleRequestsByStatus("pending", 5), []),
    read(repo.listUsers("pending"), []),
    read(repo.listBookingsBetween(dayStart, dayEnd, ["pending", "approved"]), []),
    read(repo.listBookingsBetween(now, weekEnd, ["approved"]), []),
  ]);
  const hasReadError = [bookings, users, rooms, inventory, assets, itemRequests, shuttles, displays, pendingBookings, pendingReschedules, pendingUsers, todays, upcoming].some((result) => result.error);
  const lowStock = inventory.value.filter((item) => item.currentStock <= item.reorderThreshold);
  const needsRepair = assets.value.filter((asset) => asset.condition === "needs_repair" || asset.condition === "damaged");
  const availableRooms = rooms.value.filter((room) => !room.customStatus || room.customStatus === "auto" || room.customStatus === "available");

  const pending = [
    ...pendingBookings.value.map((booking) => ({
      id: booking.id,
      href: `/admin/bookings/${booking.id}`,
      title: booking.eventName,
      detail: `${booking.requester.fullName} · ${booking.room.name}`,
      date: booking.startTime,
      end: booking.endTime,
      reschedule: false,
    })),
    ...pendingReschedules.value.map((request) => ({
      id: request.id,
      href: `/admin/bookings/reschedule/${request.id}`,
      title: request.booking.eventName,
      detail: `${request.booking.requester.fullName} · ${request.booking.room.name}`,
      date: request.requestedStart,
      end: request.requestedEnd,
      reschedule: true,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        variant="operational"
        eyebrow={formatDate(now, "EEEE, d MMMM")}
        title="Admin dashboard"
        description="Today’s requests, room availability, and resource health in one place."
      />

      {hasReadError && (
        <div role="status" className="flex items-start gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Some live figures could not be loaded. The available sections are still shown; refresh to try again.</p>
        </div>
      )}

      <section aria-labelledby="summary-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="summary-heading" className="text-[15px] font-extrabold">At a glance</h2>
          <span className="text-xs text-muted">Live office records</span>
        </div>
        <div className="mt-3 grid border-y border-line bg-surface sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat href="/admin/bookings" label="Booking requests" value={bookings.value.pending} detail="Waiting for review" icon={CalendarDays} tone="text-brand" />
          <SummaryStat href="/admin/item-requests" label="Item requests" value={itemRequests.value.length} detail="For room setup" icon={ClipboardList} tone="text-brand" />
          <SummaryStat href="/admin/shuttles" label="Shuttle requests" value={shuttles.value.length} detail="Transport review" icon={CarFront} tone="text-brand" />
          <SummaryStat href="/admin/users" label="Account approvals" value={users.value.pending} detail="New accounts" icon={Users} tone="text-brand" />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)]">
        <Section title="Review queue" href="/admin/bookings">
          {pending.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {pending.map((item) => (
                <li key={`${item.reschedule ? "reschedule-" : ""}${item.id}`} className="relative flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link href={item.href} className="block truncate text-sm font-bold after:absolute after:inset-0 hover:text-brand">{item.title}</Link>
                    <p className="truncate text-[13px] text-muted">{item.reschedule && <span className="font-semibold text-accent-ink">Reschedule · </span>}{item.detail}</p>
                  </div>
                  <p className="shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink-soft">
                    {formatDate(item.date, "EEE d MMM")}
                    <span className="block font-normal text-muted">{formatTimeRange(item.date, item.end)}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : <p className="border-y border-line py-6 text-sm text-muted">No booking or reschedule requests are waiting.</p>}
        </Section>

        <Section title="Accounts awaiting approval" href="/admin/users">
          {pendingUsers.value.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {pendingUsers.value.slice(0, 6).map((user) => (
                <li key={user.id} className="relative flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${user.id}`} className="block truncate text-sm font-bold after:absolute after:inset-0 hover:text-brand">
                      {user.fullName || "Unnamed"}
                    </Link>
                    <p className="truncate text-[13px] text-muted">{user.email} · {formatPhone(user.phone)}</p>
                  </div>
                  <p className="shrink-0 text-[13px] text-muted">Joined {formatDate(user.createdAt, "d MMM")}</p>
                </li>
              ))}
            </ul>
          ) : <p className="border-y border-line py-6 text-sm text-muted">No accounts waiting for approval.</p>}
        </Section>
      </div>

      <Section title="Today's rooms" href="/admin/rooms">
        <div className="border-y border-line py-4">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted">Available now</span>
            <span className="font-extrabold tabular-nums">{availableRooms.length} of {rooms.value.length}</span>
          </div>
          <div className="mb-5 h-2 overflow-hidden bg-sunken" aria-label={`${availableRooms.length} of ${rooms.value.length} active rooms available`}>
            <div className="h-full bg-brand" style={{ width: `${rooms.value.length ? Math.round((availableRooms.length / rooms.value.length) * 100) : 0}%` }} />
          </div>
          <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span><StatusMark tone="approved" label="Available" /> {availableRooms.length}</span>
            <span><StatusMark tone="denied" label="In use / unavailable" /> {rooms.value.length - availableRooms.length}</span>
          </div>
          <RoomUsageTimeline dateKey={today} rooms={rooms.value} bookings={todays.value} now={now} />
          {!todays.value.length && <p className="mt-3 text-sm text-muted">No rooms are booked today.</p>}
        </div>
      </Section>

      <Section title="Next 7 days" href="/admin/bookings?status=approved">
        {upcoming.value.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {upcoming.value.map((booking) => (
              <li key={booking.id} className="relative grid gap-1 py-3 sm:grid-cols-[13rem_7rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="text-sm font-semibold tabular-nums">{formatDate(booking.startTime, "EEE d MMM")} · {formatTimeRange(booking.startTime, booking.endTime)}</span>
                <span className="text-sm text-muted">{booking.room.name}</span>
                <Link href={`/admin/bookings/${booking.id}`} className="truncate text-sm font-bold after:absolute after:inset-0 hover:text-brand">{booking.eventName}</Link>
                <span className="text-[13px] text-muted">{booking.requester.fullName}</span>
              </li>
            ))}
          </ul>
        ) : <p className="border-y border-line py-6 text-sm text-muted">No approved bookings in the next 7 days.</p>}
      </Section>

      <section aria-labelledby="resources-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="resources-heading" className="text-[15px] font-extrabold">Resource status</h2>
          <span className="text-xs text-muted">Readiness across the building</span>
        </div>
        <div className="mt-3 grid gap-8 lg:grid-cols-3">
          <Section title="Stock watch" href="/admin/inventory">
            {lowStock.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {lowStock.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0 truncate text-sm font-semibold">{item.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-amber-700">{item.currentStock} / {item.reorderThreshold} {item.unit}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="border-y border-line py-6 text-sm text-muted">All active inventory is above its reorder threshold.</p>}
          </Section>
          <Section title="Asset condition" href="/admin/assets">
          {needsRepair.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {needsRepair.slice(0, 5).map((asset) => <li key={asset.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="truncate font-semibold">{asset.name}</span><span className="shrink-0 text-amber-700">{asset.condition === "damaged" ? "Damaged" : "Needs repair"}</span></li>)}
            </ul>
          ) : <p className="border-y border-line py-6 text-sm text-muted">No assets are currently flagged for repair.</p>}
          </Section>
          <Section title="Display network" href="/admin/displays">
            <div className="border-y border-line py-4">
              <div className="flex items-center gap-3">
                <Monitor className="size-5 text-muted" aria-hidden />
                <div>
                  <p className="text-2xl font-extrabold tabular-nums">{displays.value.filter((display) => display.isActive).length}<span className="text-base font-semibold text-muted"> / {displays.value.length}</span></p>
                  <p className="text-xs text-muted">Active paired displays</p>
                </div>
              </div>
              <Link href="/admin/displays" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                Manage displays <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </Section>
        </div>
      </section>
    </div>
  );
}
