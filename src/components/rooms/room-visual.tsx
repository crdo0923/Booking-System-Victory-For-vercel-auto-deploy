"use client";

import { useState, useEffect } from "react";
import { MapPin, Armchair, Layers, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomImage } from "@/components/rooms/room-image";
import { RoomMap, type MapRoom } from "@/components/rooms/room-map";
import type { LayoutElement, RoomLayout } from "@/lib/data/types";
import { calculateSeats } from "@/components/layout-editor/elements-meta";

const PIXELS_PER_METER = 40;

interface RoomVisualProps {
  roomName: string;
  roomId: string;
  photoUrl: string | null;
  mapRooms: MapRoom[];
  locationLabel: string;
  roomDimensionsLM?: number;
  roomDimensionsWM?: number;
  layout: RoomLayout | null;
}

export function RoomVisual({
  roomName,
  roomId,
  photoUrl,
  mapRooms,
  locationLabel,
  roomDimensionsLM = 10,
  roomDimensionsWM = 8,
  layout,
}: RoomVisualProps) {
  const [view, setView] = useState<"photo" | "layout" | "map">("photo");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const elements = layout?.elements || [];
  const totalSeats = layout?.totalSeats || elements.reduce((acc, el) => acc + calculateSeats(el), 0);

  const roomPixelW = roomDimensionsWM * PIXELS_PER_METER;
  const roomPixelH = roomDimensionsLM * PIXELS_PER_METER;

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <>
      <figure>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-line sm:aspect-[16/11]">
          {/* Photo View */}
          <RoomImage
            name={roomName}
            url={photoUrl}
            eager
            sizes="(min-width: 1024px) 680px, 100vw"
            className={cn("absolute inset-0 transition-opacity duration-500", view !== "photo" && "opacity-0")}
          />

          {/* Floor Map View */}
          <div
            className={cn(
              "absolute inset-0 flex items-center bg-surface p-6 transition-opacity duration-500",
              view !== "map" ? "pointer-events-none opacity-0" : "opacity-100"
            )}
            aria-hidden={view !== "map"}
          >
            <RoomMap rooms={mapRooms} activeId={roomId} />
          </div>

          {/* Room Setup / Configuration Layout View */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center bg-canvas p-4 transition-opacity duration-500 overflow-hidden select-none",
              view !== "layout" ? "pointer-events-none opacity-0" : "opacity-100"
            )}
            aria-hidden={view !== "layout"}
          >
            {elements.length > 0 ? (
              <div className="relative flex h-full w-full flex-col items-center justify-center">
                {/* Layout Blueprint Card Header */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between border-b border-line pb-2 z-10 bg-canvas/90 backdrop-blur-sm px-2 rounded">
                  <div>
                    <span className="font-serif text-sm font-bold text-ink">
                      {layout?.name || `${roomName} Configuration`}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-muted">
                      {roomDimensionsWM}m × {roomDimensionsLM}m
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded bg-sunken px-2.5 py-1 text-xs font-bold text-ink border border-line">
                      <Armchair className="size-3.5 text-brand" />
                      <span>{totalSeats} Seats</span>
                    </div>

                    {/* Full Screen Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(true)}
                      className="flex items-center gap-1.5 rounded bg-surface hover:bg-sunken px-2.5 py-1 text-xs font-bold text-ink border border-line transition-colors shadow-xs"
                      title="Open full screen blueprint"
                      aria-label="View Fullscreen Blueprint"
                    >
                      <Maximize2 className="size-3.5 text-brand" />
                      <span className="hidden sm:inline">Fullscreen</span>
                    </button>
                  </div>
                </div>

                {/* Blueprint SVG Preview */}
                <div className="mt-8 flex h-[82%] w-full items-center justify-center">
                  <BlueprintSvg
                    roomPixelW={roomPixelW}
                    roomPixelH={roomPixelH}
                    roomDimensionsWM={roomDimensionsWM}
                    roomDimensionsLM={roomDimensionsLM}
                    elements={elements}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Layers className="size-10 text-muted/60 mb-2" />
                <p className="font-serif text-base font-bold text-ink">Standard Open Setup</p>
                <p className="mt-1 text-xs text-muted max-w-xs">
                  Walang specific setup configuration na naka-assign. Flexible open layout ang kwartong ito.
                </p>
              </div>
            )}
          </div>
        </div>

        <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4" aria-hidden />
            {locationLabel}
          </span>
          <div
            role="group"
            aria-label="Room view"
            className="inline-flex rounded-md bg-sunken p-0.5 text-[13px] font-bold border border-line"
          >
            <button
              type="button"
              onClick={() => setView("photo")}
              aria-pressed={view === "photo"}
              className={cn(
                "rounded-[5px] px-3 py-1.5 transition-colors",
                view === "photo" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => setView("layout")}
              aria-pressed={view === "layout"}
              className={cn(
                "rounded-[5px] px-3 py-1.5 transition-colors flex items-center gap-1.5",
                view === "layout" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              <Layers className="size-3.5 text-brand" />
              <span>Room Layout</span>
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
              className={cn(
                "rounded-[5px] px-3 py-1.5 transition-colors",
                view === "map" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              Floor map
            </button>
          </div>
        </figcaption>
      </figure>

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-canvas/98 backdrop-blur-md text-ink animate-fade-in p-4 sm:p-6 lg:p-8 select-none"
        >
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between border-b border-ink pb-4 shrink-0">
            <div className="flex items-center gap-4">
              <div>
                <span className="eyebrow text-muted text-[10px]">
                  Victory Church Facilities · Architectural Room Blueprint
                </span>
                <h2 className="headline text-2xl sm:text-3xl text-ink font-bold mt-0.5">
                  {roomName} — {layout?.name || "Room Configuration"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded bg-surface px-3 py-1.5 text-xs font-bold text-ink border border-line">
                <Armchair className="size-4 text-brand" />
                <span>{totalSeats} Total Seats</span>
                <span className="text-muted font-normal">({roomDimensionsWM}m × {roomDimensionsLM}m)</span>
              </div>

              {/* Close / Minimize button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 rounded-sm bg-sunken hover:bg-surface border border-line px-3 py-1.5 text-xs font-bold text-ink transition-colors"
                aria-label="Exit fullscreen"
              >
                <Minimize2 className="size-4 text-muted" />
                <span>Exit Fullscreen</span>
                <span className="font-mono text-[10px] text-muted ml-1">ESC</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Interactive Canvas Display */}
          <div className="relative flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto">
            <div className="h-full w-full flex items-center justify-center max-w-6xl max-h-[85vh]">
              <BlueprintSvg
                roomPixelW={roomPixelW}
                roomPixelH={roomPixelH}
                roomDimensionsWM={roomDimensionsWM}
                roomDimensionsLM={roomDimensionsLM}
                elements={elements}
                className="drop-shadow-md"
              />
            </div>
          </div>

          {/* Bottom Specs and Directives */}
          <div className="border-t border-line pt-3 flex flex-wrap items-center justify-between text-xs text-muted shrink-0">
            <div className="flex items-center gap-4">
              <span>• Dimension Ratio: 1:40 Metric Scale</span>
              <span>• Wall Thickness: 20cm</span>
              <span>• Emergency Aisles: Clear width ≥ 1.2m</span>
            </div>
            <span className="font-mono text-[11px] text-muted">Press ESC or click Exit to return</span>
          </div>
        </div>
      )}
    </>
  );
}

function BlueprintSvg({
  roomPixelW,
  roomPixelH,
  roomDimensionsWM,
  roomDimensionsLM,
  elements,
  className,
}: {
  roomPixelW: number;
  roomPixelH: number;
  roomDimensionsWM: number;
  roomDimensionsLM: number;
  elements: LayoutElement[];
  className?: string;
}) {
  return (
    <svg
      viewBox={`-35 -35 ${roomPixelW + 70} ${roomPixelH + 70}`}
      className={cn("max-h-full max-w-full drop-shadow-sm", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="viewer-blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ddd7cc" strokeWidth="0.8" />
        </pattern>
        <pattern id="viewer-aisle-pattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#02458d" strokeWidth="1.5" strokeOpacity="0.25" />
        </pattern>
      </defs>

      {/* Room Boundary Walls */}
      <rect
        x="0"
        y="0"
        width={roomPixelW}
        height={roomPixelH}
        fill="url(#viewer-blueprint-grid)"
        stroke="#16181d"
        strokeWidth="3.5"
        rx="3"
      />

      {/* Room Dimensions */}
      <text
        x={roomPixelW / 2}
        y="-12"
        textAnchor="middle"
        className="fill-muted font-mono text-[11px] font-bold"
      >
        {roomDimensionsWM}m (Width)
      </text>
      <text
        x="-14"
        y={roomPixelH / 2}
        textAnchor="middle"
        transform={`rotate(-90, -14, ${roomPixelH / 2})`}
        className="fill-muted font-mono text-[11px] font-bold"
      >
        {roomDimensionsLM}m (Length)
      </text>

      {/* Render Elements */}
      {elements.map((el) => {
        const w = el.width * PIXELS_PER_METER;
        const h = el.length * PIXELS_PER_METER;
        const x = el.x * PIXELS_PER_METER;
        const y = el.y * PIXELS_PER_METER;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const seats = calculateSeats(el);

        return (
          <g key={el.id} transform={`rotate(${el.rotation || 0}, ${cx}, ${cy})`}>
            {renderViewerShape(el, x, y, w, h, seats, elements)}
          </g>
        );
      })}
    </svg>
  );
}

function renderViewerShape(
  el: LayoutElement,
  x: number,
  y: number,
  w: number,
  h: number,
  seats: number,
  allElements: LayoutElement[],
) {
  switch (el.type) {
    case "stage": {
      const defaultCx = x + w / 2;
      const defaultCy = y + h / 2 + 4;
      const labelX = defaultCx;
      let labelY = defaultCy;
      const textAnchor: "middle" | "start" | "end" = "middle";

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
        labelY = y + 14;
      }

      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={4} fill="#ede8df" stroke="#646972" strokeWidth="1.5" />
          <line x1={x + 4} y1={y + h - 3} x2={x + w - 4} y2={y + h - 3} stroke="#02458d" strokeWidth="2.5" />
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
          <rect x={x} y={y} width={w} height={h} rx={2} fill="#d8cebe" stroke="#454952" strokeWidth="1.5" />
          <path d={`M ${x + 4} ${y + 4} L ${x + w - 4} ${y + 4}`} stroke="#16181d" strokeWidth="2" />
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
          <rect x={x} y={y} width={w} height={h} rx={3} fill="#f7f5f0" stroke="#c5bdb0" strokeWidth="1" />
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
            })
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
          <rect x={x} y={y} width={w} height={h} rx={3} fill="#3a3d45" stroke="#16181d" strokeWidth="1.5" />
          <line x1={x + 6} y1={y + h / 2} x2={x + w - 6} y2={y + h / 2} stroke="#7b8190" strokeWidth="1" strokeDasharray="3,3" />
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
          <circle cx={cx} cy={cy} r={tableRadius} fill="#ede7dc" stroke="#646972" strokeWidth="1.5" />
          <text x={cx} y={cy + 3} textAnchor="middle" className="fill-ink font-sans text-[10px] font-bold select-none">
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
          <rect x={x} y={y} width={w} height={h} rx={2} fill="#ede7dc" stroke="#646972" strokeWidth="1.5" />
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
            fill="url(#viewer-aisle-pattern)"
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
          <rect x={x} y={y} width={w} height={h} fill="#ffffff" stroke="#16181d" strokeWidth="2" />
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
        <rect x={x} y={y} width={w} height={h} rx={2} fill="#e5dfd5" stroke="#999" strokeWidth="1" />
      );
  }
}
