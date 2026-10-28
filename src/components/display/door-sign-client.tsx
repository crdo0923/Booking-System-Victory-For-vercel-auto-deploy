"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Maximize2, Minimize2, Play, Pause } from "lucide-react";
import type { BookingDetails, Room, RoomLayout, LayoutElement } from "@/lib/data/types";
import { formatTime, formatTimeRange } from "@/lib/domain/time";
import { StatusMark } from "@/components/ui/status";
import { calculateSeats } from "@/components/layout-editor/elements-meta";

interface DoorSignClientProps {
  token: string;
  room: Room;
  initialBookings: BookingDetails[];
  initialLayout: RoomLayout | null;
  displayLabel: string;
}

const PIXELS_PER_METER = 44; // Scale factor matching the editor canvas fidelity

export function DoorSignClient({
  token,
  room: initialRoom,
  initialBookings,
  initialLayout,
  displayLabel,
}: DoorSignClientProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [bookings, setBookings] = useState<BookingDetails[]>(initialBookings);
  const [layout, setLayout] = useState<RoomLayout | null>(initialLayout);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Fullscreen / Expanded configuration view state
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cycleCountdown, setCycleCountdown] = useState(8);

  const cacheKey = `victory_doorsign_${room.slug}`;

  // Live Manila clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dedicated Auto-Cycle Interval:
  // Decoupled from closure variables to ensure it NEVER stalls or desyncs
  useEffect(() => {
    if (!autoRotate) return;

    const timer = setInterval(() => {
      setCycleCountdown((prev) => {
        if (prev <= 1) {
          // Toggle view mode
          setIsExpanded((currentExpanded) => {
            const nextMode = !currentExpanded;
            return nextMode;
          });
          // When switching: stay in fullscreen for 6s, or in normal view for 10s
          // We can read isExpanded from a ref or infer: if we just hit 0, toggle duration
          return 8; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRotate]);

  // When view state changes, set the proper countdown duration
  useEffect(() => {
    if (!autoRotate) return;
    // 6 seconds for Fullscreen blueprint, 10 seconds for standard schedule view
    const timer = window.setTimeout(() => setCycleCountdown(isExpanded ? 6 : 10), 0);
    return () => window.clearTimeout(timer);
  }, [isExpanded, autoRotate]);

  // Poll room data every 3s with real-time focus & visibility sync
  useEffect(() => {
    async function syncData() {
      try {
        const res = await fetch(`/api/display/rooms/${room.slug}?token=${token}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) {
          setIsOnline(false);
          return;
        }
        const data = await res.json();
        if (data.room) setRoom(data.room);
        setBookings(data.bookings || []);
        if (data.layout) setLayout(data.layout);
        setIsOnline(true);

        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              room: data.room,
              bookings: data.bookings,
              layout: data.layout,
              cachedAt: Date.now(),
            })
          );
        } catch {
          // ignore
        }
      } catch {
        setIsOnline(false);
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.room) setRoom(parsed.room);
            setBookings(parsed.bookings || []);
            if (parsed.layout) setLayout(parsed.layout);
          }
        } catch {
          // ignore
        }
      }
    }

    const interval = setInterval(syncData, 3000);
    const onFocus = () => syncData();
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncData();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [room.slug, token, cacheKey]);

  const nowMs = currentTime.getTime();

  const currentBooking = useMemo(() => {
    return bookings.find((b) => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      return nowMs >= start && nowMs < end;
    });
  }, [bookings, nowMs]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const start = new Date(b.startTime).getTime();
        return start > nowMs;
      })
      .slice(0, 5);
  }, [bookings, nowMs]);

  const nextBooking = upcomingBookings[0] || null;

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

  const remainingMinutes = currentBooking
    ? Math.max(1, Math.round((new Date(currentBooking.endTime).getTime() - nowMs) / 60000))
    : 0;

  const minutesUntilNext = nextBooking
    ? Math.max(1, Math.round((new Date(nextBooking.startTime).getTime() - nowMs) / 60000))
    : 0;

  // Status computation honoring Admin's customStatus override
  const customStatus = room.customStatus ?? "auto";
  const isOccupied = customStatus === "auto" ? Boolean(currentBooking) : customStatus === "in_use";
  const isMaintenance = customStatus === "maintenance";
  const isCleaning = customStatus === "cleaning";

  // Status visual attributes
  const statusHeadline = useMemo(() => {
    if (room.customStatusMessage) return room.customStatusMessage;
    if (isMaintenance) return "Facility Maintenance";
    if (isCleaning) return "Post-Service Cleaning";
    if (isOccupied) return currentBooking?.eventName || "Room In Use";
    return "Available for Ministry";
  }, [room.customStatusMessage, isMaintenance, isCleaning, isOccupied, currentBooking]);

  const statusSubtitle = useMemo(() => {
    if (room.customStatusSubtitle) return room.customStatusSubtitle;
    if (isMaintenance) return "Equipment servicing and maintenance in progress. Room is currently closed.";
    if (isCleaning) return "Sanitizing, reset, and trash clearing in progress. Re-opens shortly.";
    if (isOccupied) return currentBooking?.purpose || "Ongoing session in progress. Please do not disturb.";
    return "Open for discipleship, ministry meetings, and personal prayer until the next scheduled booking.";
  }, [room.customStatusSubtitle, isMaintenance, isCleaning, isOccupied, currentBooking]);

  const statusLabel = useMemo(() => {
    if (isMaintenance) return "Maintenance Mode";
    if (isCleaning) return "Cleaning & Reset";
    if (isOccupied) return "Room In Use";
    return "Available Now";
  }, [isMaintenance, isCleaning, isOccupied]);

  const statusThemeClasses = useMemo(() => {
    if (isMaintenance) {
      return {
        card: "border-pending bg-pending-bg text-ink",
        dot: "bg-pending ring-2 ring-pending/20",
        tag: "text-pending",
      };
    }
    if (isCleaning) {
      return {
        card: "border-accent-ink bg-sunken text-ink",
        dot: "bg-accent-ink ring-2 ring-accent/20",
        tag: "text-accent-ink",
      };
    }
    if (isOccupied) {
      return {
        card: "border-denied bg-denied-bg text-ink",
        dot: "bg-denied ring-2 ring-denied/20",
        tag: "text-denied",
      };
    }
    return {
      card: "border-approved bg-approved-bg text-ink",
      dot: "bg-approved ring-2 ring-approved/20",
      tag: "text-approved",
    };
  }, [isMaintenance, isCleaning, isOccupied]);

  // Exact reproduction of the Layout Editor Canvas Architectural Blueprint
  function renderBlueprintPlan(isHero: boolean) {
    const roomW = room.dimensionsWM ?? 8;
    const roomL = room.dimensionsLM ?? 10;
    const pixelW = roomW * PIXELS_PER_METER;
    const pixelH = roomL * PIXELS_PER_METER;
    const gridCell = 0.5 * PIXELS_PER_METER;

    const elementsList = layout?.elements || [];

    return (
      <div className="relative size-full flex items-center justify-center p-2 select-none">
        <svg
          viewBox={`-40 -35 ${pixelW + 80} ${pixelH + 70}`}
          className="max-h-full max-w-full overflow-visible drop-shadow-xl"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Blueprint patterns */}
          <defs>
            <pattern
              id={`bp-grid-${isHero ? "hero" : "mini"}`}
              width={gridCell}
              height={gridCell}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridCell} 0 L 0 0 0 ${gridCell}`}
                fill="none"
                stroke="#e7e2d9"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
            </pattern>
            <pattern
              id={`bp-aisle-${isHero ? "hero" : "mini"}`}
              width="10"
              height="10"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="10" stroke="#02458d" strokeWidth="1" strokeOpacity="0.15" />
            </pattern>
          </defs>

          {/* Canvas paper background */}
          <rect
            x={0}
            y={0}
            width={pixelW}
            height={pixelH}
            fill="#faf8f4"
            className="shadow-sm"
          />
          <rect
            x={0}
            y={0}
            width={pixelW}
            height={pixelH}
            fill={`url(#bp-grid-${isHero ? "hero" : "mini"})`}
          />

          {/* Architectural Outer Wall */}
          <rect
            x={0}
            y={0}
            width={pixelW}
            height={pixelH}
            fill="none"
            stroke="#16181d"
            strokeWidth="4"
            rx={2}
          />

          {/* Architectural Dimension Annotations */}
          <text
            x={pixelW / 2}
            y="-14"
            textAnchor="middle"
            className="fill-ink font-mono text-[12px] font-bold"
          >
            {roomW}m (Width)
          </text>
          <text
            x="-18"
            y={pixelH / 2}
            textAnchor="middle"
            transform={`rotate(-90, -18, ${pixelH / 2})`}
            className="fill-ink font-mono text-[12px] font-bold"
          >
            {roomL}m (Length)
          </text>

          {/* Render Elements with Rich Editor Fidelity */}
          {elementsList.map((el) => {
            const w = el.width * PIXELS_PER_METER;
            const h = el.length * PIXELS_PER_METER;
            const x = el.x * PIXELS_PER_METER;
            const y = el.y * PIXELS_PER_METER;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const seats = calculateSeats(el);

            return (
              <g
                key={el.id}
                transform={`rotate(${el.rotation || 0}, ${cx}, ${cy})`}
              >
                {renderArchitecturalShape(el, x, y, w, h, seats, isHero, elementsList)}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  function renderArchitecturalShape(
    el: LayoutElement,
    x: number,
    y: number,
    w: number,
    h: number,
    seats: number,
    isHero: boolean,
    allElements?: LayoutElement[],
  ) {
    switch (el.type) {
      case "stage": {
        const defaultCx = x + w / 2;
        const defaultCy = y + h / 2 + 4;
        let labelX = defaultCx;
        let labelY = defaultCy;
        let textAnchor: "middle" | "start" | "end" = "middle";

        if (allElements && allElements.length > 0) {
          const labelBox = {
            x1: defaultCx - 40,
            x2: defaultCx + 40,
            y1: defaultCy - 14,
            y2: defaultCy + 10,
          };
          const isCovered = allElements.some((other) => {
            if (other.id === el.id) return false;
            const ox = other.x * PIXELS_PER_METER;
            const oy = other.y * PIXELS_PER_METER;
            const ow = other.width * PIXELS_PER_METER;
            const oh = other.length * PIXELS_PER_METER;
            return ox < labelBox.x2 && ox + ow > labelBox.x1 && oy < labelBox.y2 && oy + oh > labelBox.y1;
          });

          if (isCovered) {
            // Check top margin
            const topCovered = allElements.some((other) => {
              if (other.id === el.id) return false;
              const ox = other.x * PIXELS_PER_METER;
              const oy = other.y * PIXELS_PER_METER;
              const ow = other.width * PIXELS_PER_METER;
              const oh = other.length * PIXELS_PER_METER;
              return ox < defaultCx + 35 && ox + ow > defaultCx - 35 && oy < y + 14 + 8 && oy + oh > y + 14 - 12;
            });

            if (!topCovered) {
              labelY = y + 14;
            } else {
              // Check bottom margin
              const botCovered = allElements.some((other) => {
                if (other.id === el.id) return false;
                const ox = other.x * PIXELS_PER_METER;
                const oy = other.y * PIXELS_PER_METER;
                const ow = other.width * PIXELS_PER_METER;
                const oh = other.length * PIXELS_PER_METER;
                return ox < defaultCx + 35 && ox + ow > defaultCx - 35 && oy < y + h - 10 + 8 && oy + oh > y + h - 10 - 12;
              });
              if (!botCovered) {
                labelY = y + h - 10;
              } else {
                // Shift to left side
                labelX = x + 12;
                textAnchor = "start";
              }
            }
          }
        }

        return (
          <g>
            {/* Raised Stage Platform */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={4}
              fill="#ede8df"
              stroke="#646972"
              strokeWidth="1.5"
            />
            {/* Stage Front Trim line */}
            <line
              x1={x + 4}
              y1={y + h - 3}
              x2={x + w - 4}
              y2={y + h - 3}
              stroke="#02458d"
              strokeWidth="2.5"
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor={textAnchor}
              className="fill-ink font-sans text-[11px] font-extrabold select-none"
            >
              {el.label || "Main Platform"}
            </text>
          </g>
        );
      }

      case "podium":
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={2}
              fill="#d8cebe"
              stroke="#454952"
              strokeWidth="1.5"
            />
            <path
              d={`M ${x + 4} ${y + 4} L ${x + w - 4} ${y + 4}`}
              stroke="#16181d"
              strokeWidth="2"
            />
            <text
              x={x + w / 2}
              y={y + h / 2 + 4}
              textAnchor="middle"
              className="fill-ink font-sans text-[9px] font-extrabold select-none"
            >
              {el.label || "Pulpit"}
            </text>
          </g>
        );

      case "chair_row": {
        const chairsPerRow = el.chairsPerRow ?? 4;
        const rows = el.rowCount ?? 4;
        const chairW = (w - 8) / chairsPerRow;
        const rowH = (h - 8) / rows;

        return (
          <g>
            {/* Block boundary enclosure */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={3}
              fill="#f7f5f0"
              stroke="#c5bdb0"
              strokeWidth="1"
            />
            {/* Real individual chairs rendering */}
            {Array.from({ length: rows }).map((_, rIdx) =>
              Array.from({ length: chairsPerRow }).map((_, cIdx) => {
                const cx = x + 4 + cIdx * chairW;
                const cy = y + 4 + rIdx * rowH;
                return (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={cx + 1}
                    y={cy + 1}
                    width={chairW - 2}
                    height={rowH - 3}
                    rx={2}
                    fill="#02458d"
                    fillOpacity="0.85"
                    stroke="#012b59"
                    strokeWidth="0.6"
                  />
                );
              }),
            )}
            <text
              x={x + w / 2}
              y={y + h + 13}
              textAnchor="middle"
              className="fill-ink font-sans text-[10px] font-bold select-none"
            >
              {el.label || `${chairsPerRow * rows} seats`}
            </text>
          </g>
        );
      }

      case "sound_booth":
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={3}
              fill="#3a3d45"
              stroke="#16181d"
              strokeWidth="1.5"
            />
            <line
              x1={x + 6}
              y1={y + h / 2}
              x2={x + w - 6}
              y2={y + h / 2}
              stroke="#7b8190"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <text
              x={x + w / 2}
              y={y + h / 2 + 4}
              textAnchor="middle"
              className="fill-white font-sans text-[10px] font-bold select-none"
            >
              {el.label || "Sound & Livestream Booth"}
            </text>
          </g>
        );

      case "round_table": {
        const radius = Math.min(w, h) / 2;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const tableRadius = radius * 0.7;
        const chairCount = seats || 8;

        return (
          <g>
            {Array.from({ length: chairCount }).map((_, i) => {
              const angle = (i * 2 * Math.PI) / chairCount;
              const chairX = cx + Math.cos(angle) * (tableRadius + 8);
              const chairY = cy + Math.sin(angle) * (tableRadius + 8);
              return (
                <circle
                  key={i}
                  cx={chairX}
                  cy={chairY}
                  r={6}
                  fill="#02458d"
                  stroke="#012b59"
                  strokeWidth="0.8"
                />
              );
            })}
            <circle
              cx={cx}
              cy={cy}
              r={tableRadius}
              fill="#ede7dc"
              stroke="#646972"
              strokeWidth="1.5"
            />
            <text
              x={cx}
              y={cy + 3}
              textAnchor="middle"
              className="fill-ink font-sans text-[10px] font-bold select-none"
            >
              {el.label || `${chairCount}p`}
            </text>
          </g>
        );
      }

      case "rect_table": {
        const chairCount = seats || 3;
        const chairStep = (w - 12) / chairCount;

        return (
          <g>
            {Array.from({ length: chairCount }).map((_, i) => {
              const chairX = x + 6 + i * chairStep + (chairStep - 12) / 2;
              const chairY = y + h + 2;
              return (
                <rect
                  key={i}
                  x={chairX}
                  y={chairY}
                  width={12}
                  height={8}
                  rx={1.5}
                  fill="#02458d"
                  stroke="#012b59"
                  strokeWidth="0.5"
                />
              );
            })}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={2}
              fill="#ede7dc"
              stroke="#646972"
              strokeWidth="1.5"
            />
            <text
              x={x + w / 2}
              y={y + h / 2 + 4}
              textAnchor="middle"
              className="fill-ink font-sans text-[10px] font-bold select-none"
            >
              {el.label || `${chairCount} seats`}
            </text>
          </g>
        );
      }

      case "aisle":
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="url(#bp-aisle-hero)"
              stroke="#02458d"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              strokeOpacity="0.5"
            />
            <text
              x={x + w / 2}
              y={y + h / 2 + 3}
              textAnchor="middle"
              className="fill-brand font-mono text-[10px] font-extrabold uppercase tracking-widest select-none"
            >
              {el.label || "CENTER AISLE"}
            </text>
          </g>
        );

      case "door":
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="#ffffff"
              stroke="#16181d"
              strokeWidth="2"
            />
            <path
              d={`M ${x} ${y + h} A ${w} ${w} 0 0 1 ${x + w} ${y + h}`}
              fill="none"
              stroke="#646972"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <text
              x={x + w / 2}
              y={y - 5}
              textAnchor="middle"
              className="fill-ink font-sans text-[9px] font-bold select-none"
            >
              {el.label || "Entry Door"}
            </text>
          </g>
        );

      default:
        return (
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill="#dcdcdc"
            stroke="#666"
            strokeWidth="1"
          />
        );
    }
  }

  return (
    <div className="relative flex h-screen w-screen flex-col bg-canvas text-ink p-6 sm:p-8 lg:p-10 select-none overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-end justify-between border-b border-ink pb-5 shrink-0">
        <div className="flex items-center gap-3.5">
          <Image
            src="/brand/victory-mark.png"
            alt="Victory"
            width={36}
            height={36}
            priority
            className="size-9 shrink-0"
          />
          <div>
            <p className="eyebrow text-muted text-[10px]">
              Victory Room Display · {displayLabel}
            </p>
            <h1 className="headline text-3xl sm:text-4xl text-ink leading-none mt-1">
              {room.name}
            </h1>
          </div>
        </div>

        {/* Live Manila Clock & Auto-Rotate Controls */}
        <div className="flex items-center gap-6 text-right">
          {/* Tablet Auto-Zoom Cycle Indicator */}
          <div className="hidden md:flex items-center gap-2 border border-line bg-surface px-3 py-1.5 rounded-sm shadow-xs">
            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-ink hover:text-brand transition-colors"
              title={autoRotate ? "Pause auto zoom" : "Start auto zoom"}
            >
              {autoRotate ? (
                <>
                  <Pause className="size-3 text-muted" />
                  <span className="tabular-nums">Auto-Rotate: {cycleCountdown}s</span>
                </>
              ) : (
                <>
                  <Play className="size-3 text-brand" />
                  <span>Rotation Paused</span>
                </>
              )}
            </button>
          </div>

          <div>
            <div
              suppressHydrationWarning
              className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-ink leading-none"
            >
              <span suppressHydrationWarning>{timeFormatted}</span>
              <span suppressHydrationWarning className="text-sm font-semibold text-muted ml-1">
                :{secondsFormatted}
              </span>
            </div>
            <p suppressHydrationWarning className="text-xs text-muted mt-1 font-medium">
              {dateFormatted}
            </p>
          </div>

          <StatusMark
            tone={isOnline ? "approved" : "pending"}
            label={isOnline ? "Online" : "Offline"}
            className="hidden sm:inline-flex"
          />
        </div>
      </header>

      {/* Main 2-Column Standard View */}
      <main className="mt-8 grid flex-1 grid-cols-1 gap-8 lg:grid-cols-12 min-h-0">
        {/* Left Column: Bold Editorial Status Section (7 cols) */}
        <div
          className={`lg:col-span-7 flex flex-col justify-between border p-8 sm:p-10 transition-colors duration-500 rounded-sm ${statusThemeClasses.card}`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${statusThemeClasses.dot}`}
                aria-hidden
              />
              <span className={`eyebrow text-xs font-black tracking-wider ${statusThemeClasses.tag}`}>
                {statusLabel}
              </span>
            </div>

            <div className="mt-8">
              <div>
                <h2 className="headline text-4xl sm:text-5xl lg:text-6xl text-ink leading-[1.08]">
                  {statusHeadline}
                </h2>

                {isOccupied && currentBooking && (
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-base sm:text-lg font-bold text-ink-soft">
                    <span>
                      {formatTimeRange(currentBooking.startTime, currentBooking.endTime)}
                    </span>
                    {currentBooking.attendeeCount && (
                      <>
                        <span className="text-muted/40">·</span>
                        <span>{currentBooking.attendeeCount} Attendees</span>
                      </>
                    )}
                  </div>
                )}

                <p className="mt-4 text-base sm:text-lg text-ink-soft max-w-xl leading-relaxed">
                  {statusSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Countdown & Room Specs */}
          <div className="mt-8 pt-6 border-t border-ink/15 flex items-baseline justify-between">
            {isOccupied ? (
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-ink tabular-nums">
                  {remainingMinutes}m
                </span>
                <span className="text-xs uppercase tracking-wider text-muted font-bold ml-2">
                  Remaining in session
                </span>
              </div>
            ) : nextBooking ? (
              <div>
                <span className="text-xs eyebrow text-muted block">Next upcoming</span>
                <p className="text-base sm:text-lg font-bold text-ink mt-0.5">
                  {nextBooking.eventName} · {formatTime(nextBooking.startTime)}
                  <span className="text-xs text-muted font-medium ml-2">
                    (in {minutesUntilNext}m)
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-muted">
                No further reservations scheduled today.
              </p>
            )}

            <div className="text-right">
              <span className="eyebrow text-[10px] text-muted block">Room capacity</span>
              <span className="text-base font-extrabold text-ink tabular-nums">
                Up to {room.capacity} seats
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Spandi Configuration & Today's Schedule (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
          {/* Spandi Room Layout Card (Click to expand anytime) */}
          <div className="border border-line bg-surface p-5 rounded-sm flex flex-col shrink-0 shadow-sm">
            <div className="flex items-baseline justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Room Configuration & Setup
                </h3>
                <p className="headline text-lg text-ink mt-0.5 font-bold">
                  {layout?.name || "Standard Layout"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink tabular-nums bg-sunken px-2 py-0.5 border border-line">
                  {layout?.totalSeats || room.capacity} Seats Total
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex size-7 items-center justify-center rounded-sm border border-line bg-canvas text-muted hover:text-ink hover:bg-sunken transition-colors"
                  title="Fullscreen Blueprint"
                >
                  <Maximize2 className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Clickable Viewport */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsExpanded(true)}
              onKeyDown={(e) => e.key === "Enter" && setIsExpanded(true)}
              className="relative mt-3 h-60 w-full bg-[#f3efe6] border border-line rounded-sm overflow-hidden flex items-center justify-center cursor-zoom-in hover:border-brand/50 transition-colors group"
              style={{
                backgroundImage: `radial-gradient(circle, #ded6c8 1px, transparent 1px)`,
                backgroundSize: `16px 16px`,
              }}
            >
              {renderBlueprintPlan(false)}

              {/* Tap to zoom badge */}
              <div className="absolute top-2 right-2 rounded-sm bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-muted border border-line opacity-80 group-hover:opacity-100 transition-opacity">
                Tap to inspect
              </div>
            </div>

            {/* Color Legend / Key */}
            <div className="mt-3 pt-2.5 border-t border-line flex flex-wrap items-center justify-between gap-y-1.5 text-[11px] text-ink-soft">
              <span className="eyebrow text-[9px] text-muted uppercase tracking-wider">
                Key:
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2.5 rounded-[2px] bg-[#ede8df] border border-[#646972] shrink-0" aria-hidden />
                  Stage
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2.5 rounded-[2px] bg-[#02458d] shrink-0" aria-hidden />
                  Seating
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2.5 rounded-[2px] bg-[#3a3d45] shrink-0" aria-hidden />
                  AV Booth
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2.5 rounded-[2px] border border-dashed border-[#02458d] bg-[#02458d]/10 shrink-0" aria-hidden />
                  Aisle
                </span>
              </div>
            </div>
          </div>

          {/* Today's Schedule Timeline */}
          <div className="border border-line bg-surface p-5 rounded-sm flex-1 flex flex-col min-h-0">
            <div className="flex items-baseline justify-between pb-3 border-b border-line shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Today&apos;s Schedule
              </h3>
              <span className="text-xs font-bold text-muted tabular-nums">
                {bookings.length} reservations
              </span>
            </div>

            <div className="mt-3 divide-y divide-line overflow-y-auto flex-1 pr-1">
              {bookings.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted">
                  No reservations scheduled for this room today.
                </p>
              ) : (
                bookings.map((b) => {
                  const startMs = new Date(b.startTime).getTime();
                  const endMs = new Date(b.endTime).getTime();
                  const isActiveNow = nowMs >= startMs && nowMs < endMs;
                  const isPast = nowMs >= endMs;

                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between py-3 ${
                        isPast ? "opacity-40" : ""
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-ink tabular-nums">
                            {formatTimeRange(b.startTime, b.endTime)}
                          </span>
                          {isActiveNow && (
                            <StatusMark tone="denied" label="In progress" className="text-[11px]" />
                          )}
                        </div>
                        <p className="font-bold text-sm text-ink truncate mt-0.5">
                          {b.eventName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted tabular-nums font-medium">
                        {b.attendeeCount || 0} pax
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FULLSCREEN BLUEPRINT ZOOM VIEW */}
      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-canvas p-6 sm:p-10 animate-fade-in transition-all duration-700 ease-out"
          style={{
            backgroundImage: `radial-gradient(circle, #ded6c8 1.5px, transparent 1.5px)`,
            backgroundSize: `24px 24px`,
          }}
        >
          {/* Fullscreen Blueprint Header */}
          <div className="flex items-center justify-between border-b border-ink/20 pb-4 shrink-0 bg-surface/90 backdrop-blur-md px-6 py-3 rounded-sm border shadow-xs">
            <div className="flex items-center gap-4">
              <Image
                src="/brand/victory-mark.png"
                alt="Victory"
                width={36}
                height={36}
                className="size-9"
              />
              <div>
                <p className="eyebrow text-muted text-[10px]">
                  Room Arrangement Floor Plan · {room.name}
                </p>
                <h2 className="headline text-2xl sm:text-3xl font-extrabold text-ink leading-tight">
                  {layout?.name || "Standard Layout"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-ink tabular-nums bg-sunken px-3 py-1 border border-line">
                {layout?.totalSeats || room.capacity} Seats Configured
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-sunken transition-colors shadow-xs"
              >
                <Minimize2 className="size-4 text-muted" />
                <span>Return to Schedule</span>
                {autoRotate && <span className="tabular-nums font-mono text-muted text-[11px] ml-1">({cycleCountdown}s)</span>}
              </button>
            </div>
          </div>

          {/* Giant Hero Blueprint Canvas */}
          <div className="relative mt-6 flex-1 w-full bg-[#f3efe6] border border-line/40 rounded-sm overflow-hidden flex items-center justify-center p-4 min-h-0">
            {renderBlueprintPlan(true)}
          </div>

          {/* Bottom Bar Info */}
          <div className="mt-4 pt-3 border-t border-line/60 flex flex-wrap items-center justify-between text-xs text-ink-soft shrink-0">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="eyebrow text-[10px] text-muted uppercase font-bold">
                Detailed Blueprint Key:
              </span>
              <span className="inline-flex items-center gap-2 font-bold text-ink">
                <span className="size-3 rounded-[2px] bg-[#ede8df] border border-[#646972]" />
                Main Platform / Preaching Pulpit
              </span>
              <span className="inline-flex items-center gap-2 font-bold text-ink">
                <span className="size-3 rounded-[2px] bg-[#02458d]" />
                Audience Chairs ({layout?.totalSeats || room.capacity} Total)
              </span>
              <span className="inline-flex items-center gap-2 font-bold text-ink">
                <span className="size-3 rounded-[2px] bg-[#3a3d45]" />
                Sound & Livestream Console
              </span>
              <span className="inline-flex items-center gap-2 font-bold text-ink">
                <span className="size-3 rounded-[2px] border border-dashed border-[#02458d] bg-[#02458d]/10" />
                Center Aisle & Walkway
              </span>
            </div>

            <div className="text-xs text-muted font-mono font-medium">
              Auto-returning in a few moments · or tap button to return
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
