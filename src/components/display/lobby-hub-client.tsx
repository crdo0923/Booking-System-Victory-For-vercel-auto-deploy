"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import type { Announcement, BookingDetails, Room } from "@/lib/data/types";
import { formatTimeRange } from "@/lib/domain/time";

function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("demo/")) return `/${path}`;
  return `/api/storage/${path.split("/").map(encodeURIComponent).join("/")}`;
}

interface LobbyHubClientProps {
  token: string;
  initialRooms: Room[];
  initialBookings: BookingDetails[];
  initialAnnouncements: Announcement[];
  displayLabel: string;
}

export function LobbyHubClient({
  token,
  initialRooms,
  initialBookings,
  initialAnnouncements,
  displayLabel,
}: LobbyHubClientProps) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [bookings, setBookings] = useState<BookingDetails[]>(initialBookings);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

  // Live Manila clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-Time High-Frequency Auto Sync (Every 3 seconds):
  // Instantly reflects admin room status edits, new bookings, or bulletin changes
  useEffect(() => {
    async function syncHub() {
      try {
        const res = await fetch(`/api/display/hub?token=${token}`, { cache: "no-store" });
        if (!res.ok) {
          setIsOnline(false);
          return;
        }
        const data = await res.json();
        if (data.rooms) setRooms(data.rooms);
        if (data.bookings) setBookings(data.bookings);
        if (data.announcements) setAnnouncements(data.announcements);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }

    // Sync on window focus / visibility change
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncHub();
      }
    }

    window.addEventListener("focus", syncHub);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(syncHub, 3000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", syncHub);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  // Rotate notices every 8s
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setActiveAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const nowMs = currentTime.getTime();

  const timeFormatted = currentTime.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const secondsFormatted = currentTime.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    second: "2-digit",
  });

  const dateFormatted = currentTime.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const roomStatusList = useMemo(() => {
    return rooms.map((room) => {
      const roomBookings = bookings
        .filter((b) => b.roomId === room.id)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      const current = roomBookings.find((b) => {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        return nowMs >= start && nowMs < end;
      });

      const upcoming = roomBookings.filter((b) => {
        const start = new Date(b.startTime).getTime();
        return start > nowMs;
      });

      const customStatus = room.customStatus ?? "auto";
      const isOccupied = customStatus === "auto" ? Boolean(current) : customStatus === "in_use";
      const isMaintenance = customStatus === "maintenance";
      const isCleaning = customStatus === "cleaning";
      const isAvailable = customStatus === "available" || (customStatus === "auto" && !current);

      return {
        room,
        current,
        upcoming,
        isOccupied,
        isMaintenance,
        isCleaning,
        isAvailable,
      };
    });
  }, [rooms, bookings, nowMs]);

  const activeAnnouncement = announcements[activeAnnouncementIndex] || null;

  // Format announcement active date/time range
  const noticeScheduleLabel = useMemo(() => {
    if (!activeAnnouncement) return null;
    try {
      const pubDate = new Date(activeAnnouncement.publishAt);
      const pubDateStr = pubDate.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
      });
      const pubTimeStr = pubDate.toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      if (activeAnnouncement.expiresAt) {
        const expDate = new Date(activeAnnouncement.expiresAt);
        const expDateStr = expDate.toLocaleDateString("en-US", {
          timeZone: "Asia/Manila",
          month: "short",
          day: "numeric",
        });
        const expTimeStr = expDate.toLocaleTimeString("en-US", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        return `${pubDateStr} (${pubTimeStr}) – ${expDateStr} (${expTimeStr})`;
      }

      return `Posted ${pubDateStr} at ${pubTimeStr}`;
    } catch {
      return null;
    }
  }, [activeAnnouncement]);

  const posterSrc = activeAnnouncement ? resolveImageUrl(activeAnnouncement.imagePath) : null;

  return (
    <div className="flex h-screen w-screen flex-col bg-canvas text-ink p-6 lg:p-8 select-none overflow-hidden font-sans">
      {/* Editorial Header */}
      <header className="flex items-center justify-between border-b border-ink pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <Image
            src="/brand/victory-mark.png"
            alt="Victory"
            width={44}
            height={44}
            priority
            className="size-11 shrink-0"
          />
          <div>
            <p className="eyebrow text-muted text-[10px]">
              Victory Church Facility Hub · {displayLabel}
            </p>
            <h1 className="headline text-2xl lg:text-3xl text-ink leading-none mt-1">
              Room Directory &               Today&apos;s Schedule
            </h1>
          </div>
        </div>

        {/* Status Legend, Live Clock & Status */}
        <div className="flex items-center gap-8">
          {/* Legend Guide: Red & Green Dots explanation with Victory StatusMark tokens */}
          <div className="hidden sm:flex items-center gap-4 border border-line bg-surface px-4 py-2 rounded-sm shadow-2xs">
            <span className="eyebrow text-[10px] text-muted">Status:</span>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-approved ring-2 ring-approved/20" />
              <span className="text-[13px] font-bold text-approved">Available</span>
            </div>
            <span className="text-line-strong font-light">|</span>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-denied ring-2 ring-denied/20" />
              <span className="text-[13px] font-bold text-denied">In use (Reserved)</span>
            </div>
          </div>

          <div className="text-right">
            <div
              suppressHydrationWarning
              className="text-3xl lg:text-4xl font-extrabold tracking-tight tabular-nums text-ink leading-none"
            >
              <span suppressHydrationWarning>{timeFormatted}</span>
              <span suppressHydrationWarning className="text-sm font-semibold text-muted ml-1">
                :{secondsFormatted}
              </span>
            </div>
            <p suppressHydrationWarning className="text-[11px] text-muted mt-1 font-medium">
              {dateFormatted} (Manila)
            </p>
          </div>
        </div>
      </header>

      {/* Main Room Grid */}
      <main className="mt-5 grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 min-h-0 overflow-hidden">
        {roomStatusList.map(({ room, current, upcoming, isOccupied, isMaintenance, isCleaning }) => {
          let cardBorder = "border-line bg-surface text-ink";
          let dotClass = "bg-approved ring-4 ring-approved/20";
          let statusText = "Available";

          if (isMaintenance) {
            cardBorder = "border-pending/40 bg-pending-bg/30 text-ink";
            dotClass = "bg-pending ring-2 ring-pending/20";
            statusText = "Maintenance";
          } else if (isCleaning) {
            cardBorder = "border-accent-ink/40 bg-sunken text-ink";
            dotClass = "bg-accent-ink ring-2 ring-accent/20";
            statusText = "Cleaning";
          } else if (isOccupied) {
            cardBorder = "border-denied/40 bg-denied-bg/40 text-ink";
            dotClass = "bg-denied ring-2 ring-denied/20";
            statusText = "In use";
          }

          const displayHeadline = room.customStatusMessage || (
            isMaintenance
              ? "Facility Maintenance"
              : isCleaning
                ? "Post-Service Cleaning"
                : isOccupied
                  ? current?.eventName || "Ongoing Session"
                  : "Available for Ministry"
          );

          const displaySubtitle = room.customStatusSubtitle || (
            isMaintenance
              ? "Aircon / equipment repair in progress"
              : isCleaning
                ? "Sanitizing & chair reset"
                : isOccupied
                  ? (current ? formatTimeRange(current.startTime, current.endTime) : "Session in progress")
                  : (upcoming[0] ? `Next: ${formatTimeRange(upcoming[0].startTime, upcoming[0].endTime)}` : "No further sessions today")
          );

          return (
            <div
              key={room.id}
              className={`flex flex-col justify-between border p-4 rounded-sm transition-all duration-500 shadow-2xs ${cardBorder}`}
            >
              {/* Room Top Section */}
              <div>
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="eyebrow text-[9.5px] text-muted truncate">
                      {room.locationLabel || "Main Floor"}
                    </p>
                    <h3 className="headline text-2xl text-ink truncate mt-0.5 font-bold">
                      {room.name}
                    </h3>
                  </div>

                  {/* Clean Single Status Dot Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      title={statusText}
                      className={`size-2.5 rounded-full shrink-0 shadow-2xs ${dotClass}`}
                    />
                  </div>
                </div>

                {/* Session or Status Callout */}
                <div className="mt-3.5">
                  <div className="border border-line bg-canvas/70 p-3 rounded-sm">
                    <span className="eyebrow text-[9px] text-muted block font-semibold">
                      {isMaintenance ? "Maintenance Notice" : isCleaning ? "Cleaning In Progress" : isOccupied ? "Ongoing Session" : "Next Scheduled"}
                    </span>
                    <p className="font-bold text-sm text-ink truncate mt-1">
                      {displayHeadline}
                    </p>
                    <p className="text-xs text-muted tabular-nums mt-0.5 font-mono line-clamp-2">
                      {displaySubtitle}
                    </p>
                  </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="mt-4">
                  <span className="eyebrow text-[9.5px] text-muted block mb-1.5">
                    Later today ({upcoming.length})
                  </span>
                  <div className="divide-y divide-line text-xs">
                    {upcoming.slice(0, 3).map((up) => (
                      <div
                        key={up.id}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="font-semibold text-ink truncate max-w-[125px]">
                          {up.eventName}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums shrink-0 font-mono">
                          {formatTimeRange(up.startTime, up.endTime)}
                        </span>
                      </div>
                    ))}
                    {upcoming.length === 0 && (
                      <p className="py-1.5 text-xs text-muted italic">
                        Schedule open
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Specs */}
              <div className="mt-3 pt-2.5 border-t border-line flex items-baseline justify-between text-xs text-muted">
                <span className="font-medium">Up to {room.capacity} seats</span>
                {room.dimensionsLM && (
                  <span className="tabular-nums font-mono text-[11px]">
                    {room.dimensionsLM}m × {room.dimensionsWM}m
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* Improved Prominent Church Bulletin Notice Section */}
      {activeAnnouncement && (
        <footer className="mt-5 border-t-2 border-ink pt-3 shrink-0 bg-surface/90 border border-line rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Bulletin Tag & Details */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Optional Poster Image thumbnail if exists */}
              {posterSrc && (
                <div className="relative h-14 w-24 rounded overflow-hidden shrink-0 border border-line bg-canvas">
                  <Image
                    src={posterSrc}
                    alt={activeAnnouncement.internalTitle}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-brand/10 text-brand font-mono text-[10px] font-extrabold uppercase tracking-wider">
                    Church Bulletin Notice
                  </span>
                  {noticeScheduleLabel && (
                    <span className="text-xs font-mono font-medium text-muted">
                      · {noticeScheduleLabel}
                    </span>
                  )}
                </div>
                <h3 className="text-base lg:text-lg font-bold text-ink truncate mt-0.5">
                  {activeAnnouncement.internalTitle}
                </h3>
              </div>
            </div>

            {/* Right: Counter badge & Auto-rotate indicator */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono font-semibold text-muted bg-sunken px-2.5 py-1 rounded border border-line">
                Notice {activeAnnouncementIndex + 1} of {announcements.length}
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
