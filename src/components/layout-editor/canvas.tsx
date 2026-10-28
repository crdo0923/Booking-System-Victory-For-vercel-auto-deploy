"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type MouseEvent } from "react";
import { Copy, Trash2, RotateCw } from "lucide-react";
import type { LayoutElement } from "@/lib/data/types";
import { calculateSeats } from "./elements-meta";

interface CanvasProps {
  roomWidthMeters: number; // e.g. 10m
  roomLengthMeters: number; // e.g. 14m
  elements: LayoutElement[];
  selectedId: string | null;
  zoom: number; // 0.5 to 1.5
  gridSnapMeters: number; // 0.5m
  onSelect: (id: string | null) => void;
  onUpdateElement: (updated: LayoutElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement?: (id: string) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
}

const PIXELS_PER_METER = 48; // Base scale: 1 meter = 48px

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  elementId: string;
}

export function Canvas({
  roomWidthMeters,
  roomLengthMeters,
  elements,
  selectedId,
  zoom,
  gridSnapMeters = 0.5,
  onSelect,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan state
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Dragging element state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const elemDragStartRef = useRef<{
    elemX: number;
    elemY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Clipboard & Context menu states
  const [clipboard, setClipboard] = useState<LayoutElement | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const duplicateSpecificElement = useCallback((source: LayoutElement) => {
    if (onDuplicateElement) {
      onDuplicateElement(source.id);
      return;
    }
    const newX = Math.min(roomWidthMeters - source.width, source.x + 0.5);
    const newY = Math.min(roomLengthMeters - source.length, source.y + 0.5);
    const newEl: LayoutElement = {
      ...source,
      id: `elem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: Math.round(newX * 10) / 10,
      y: Math.round(newY * 10) / 10,
      label: source.label ? `${source.label} (Copy)` : undefined,
    };
    onUpdateElement(newEl);
    onSelect(newEl.id);
  }, [onDuplicateElement, onSelect, onUpdateElement, roomLengthMeters, roomWidthMeters]);

  // Close context menu on outside click or escape
  useEffect(() => {
    function handleClickOutside() {
      setContextMenu(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Keyboard shortcut listener for Delete, Backspace, Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+D (Duplicate)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      // Delete / Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onDeleteElement(selectedId);
        setContextMenu(null);
        return;
      }

      // Ctrl+C / Cmd+C: Copy
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C") && selectedId) {
        const el = elements.find((item) => item.id === selectedId);
        if (el) {
          e.preventDefault();
          setClipboard(el);
        }
        return;
      }

      // Ctrl+V / Cmd+V: Paste copied element
      if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V") && clipboard) {
        e.preventDefault();
        duplicateSpecificElement(clipboard);
        return;
      }

      // Ctrl+D / Cmd+D: Quick Duplicate
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D") && selectedId) {
        const el = elements.find((item) => item.id === selectedId);
        if (el) {
          e.preventDefault();
          duplicateSpecificElement(el);
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, elements, clipboard, onDeleteElement, duplicateSpecificElement]);

  function handleRotate(id: string) {
    const el = elements.find((item) => item.id === id);
    if (!el) return;
    const nextRotation = ((el.rotation + 45) % 360) as LayoutElement["rotation"];
    onUpdateElement({ ...el, rotation: nextRotation });
  }

  // Right-click Context Menu handler
  function handleElementContextMenu(e: MouseEvent<SVGGElement>, el: LayoutElement) {
    e.preventDefault();
    e.stopPropagation();
    onSelect(el.id);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      elementId: el.id,
    });
  }

  // Canvas background pointer down (Pan)
  function handleCanvasPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.target === containerRef.current || (e.target as HTMLElement).dataset.canvasBg) {
      setIsPanning(true);
      setContextMenu(null);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      onSelect(null);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (isPanning) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
      return;
    }

    if (draggingId && elemDragStartRef.current) {
      const currentElement = elements.find((el) => el.id === draggingId);
      if (!currentElement) return;

      const dxPx = e.clientX - elemDragStartRef.current.startX;
      const dyPx = e.clientY - elemDragStartRef.current.startY;

      const dxMeters = dxPx / (PIXELS_PER_METER * zoom);
      const dyMeters = dyPx / (PIXELS_PER_METER * zoom);

      let newX = elemDragStartRef.current.elemX + dxMeters;
      let newY = elemDragStartRef.current.elemY + dyMeters;

      // Snap to grid
      if (gridSnapMeters > 0) {
        newX = Math.round(newX / gridSnapMeters) * gridSnapMeters;
        newY = Math.round(newY / gridSnapMeters) * gridSnapMeters;
      }

      // Constrain within room bounds
      newX = Math.max(0, Math.min(roomWidthMeters - currentElement.width, newX));
      newY = Math.max(0, Math.min(roomLengthMeters - currentElement.length, newY));

      newX = Math.round(newX * 100) / 100;
      newY = Math.round(newY * 100) / 100;

      if (newX !== currentElement.x || newY !== currentElement.y) {
        onUpdateElement({
          ...currentElement,
          x: newX,
          y: newY,
        });
      }
    }
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
    if (draggingId) {
      setDraggingId(null);
      elemDragStartRef.current = null;
    }
  }

  // Element pointer down (Select + Drag)
  function handleElementPointerDown(e: PointerEvent<SVGGElement>, el: LayoutElement) {
    if (e.button === 2) return; // Ignore right click for drag
    e.stopPropagation();
    onSelect(el.id);
    setDraggingId(el.id);
    setContextMenu(null);
    elemDragStartRef.current = {
      elemX: el.x,
      elemY: el.y,
      startX: e.clientX,
      startY: e.clientY,
    };
    (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
  }

  const roomPixelW = roomWidthMeters * PIXELS_PER_METER;
  const roomPixelH = roomLengthMeters * PIXELS_PER_METER;
  const gridCellSize = gridSnapMeters * PIXELS_PER_METER;

  return (
    <div
      ref={containerRef}
      data-canvas-bg="true"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => {
        // Prevent default browser menu on background
        e.preventDefault();
      }}
      className={`relative size-full overflow-hidden bg-[#f3efe6] select-none ${
        isPanning ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
      style={{
        backgroundImage: `radial-gradient(circle, #ded6c8 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* SVG Container scaled and positioned */}
      <div
        className="absolute origin-top-left transition-transform duration-75"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        }}
      >
        <svg
          width={roomPixelW}
          height={roomPixelH}
          viewBox={`0 0 ${roomPixelW} ${roomPixelH}`}
          className="overflow-visible shadow-2xl rounded-sm"
          style={{ background: "#faf8f4" }}
        >
          {/* Defs for Grid patterns and markers */}
          <defs>
            <pattern
              id="grid-snap-pattern"
              width={gridCellSize}
              height={gridCellSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridCellSize} 0 L 0 0 0 ${gridCellSize}`}
                fill="none"
                stroke="#e7e2d9"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
            </pattern>
            <pattern
              id="aisle-hatch"
              width="10"
              height="10"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="10" stroke="#02458d" strokeWidth="1" strokeOpacity="0.15" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width={roomPixelW} height={roomPixelH} fill="url(#grid-snap-pattern)" />

          {/* Room Boundary Walls */}
          <rect
            width={roomPixelW}
            height={roomPixelH}
            fill="none"
            stroke="#16181d"
            strokeWidth="4"
          />

          {/* Room Dimension Labels */}
          <text
            x={roomPixelW / 2}
            y="-10"
            textAnchor="middle"
            className="fill-muted font-mono text-[11px] font-bold"
          >
            {roomWidthMeters}m (Width)
          </text>
          <text
            x="-12"
            y={roomPixelH / 2}
            textAnchor="middle"
            transform={`rotate(-90, -12, ${roomPixelH / 2})`}
            className="fill-muted font-mono text-[11px] font-bold"
          >
            {roomLengthMeters}m (Length)
          </text>

          {/* Render Elements */}
          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            const w = el.width * PIXELS_PER_METER;
            const h = el.length * PIXELS_PER_METER;
            const x = el.x * PIXELS_PER_METER;
            const y = el.y * PIXELS_PER_METER;
            const cx = x + w / 2;
            const cy = y + h / 2;

            return (
              <g
                key={el.id}
                transform={`rotate(${el.rotation}, ${cx}, ${cy})`}
                onPointerDown={(e) => handleElementPointerDown(e, el)}
                onContextMenu={(e) => handleElementContextMenu(e, el)}
                className="cursor-move group"
              >
                {/* Visual shape based on element type */}
                {renderElementShape(el, x, y, w, h, isSelected, elements)}

                {/* Selection outline and rotation anchor */}
                {isSelected && (
                  <rect
                    x={x - 3}
                    y={y - 3}
                    width={w + 6}
                    height={h + 6}
                    fill="none"
                    stroke="#02458d"
                    strokeWidth="2"
                    strokeDasharray="4,3"
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT-CLICK SHORTCUT CONTEXT MENU */}
      {contextMenu && (
        <div
          role="menu"
          aria-label="Element shortcuts"
          className="fixed z-50 min-w-44 rounded-sm border border-line bg-surface p-1.5 shadow-xl text-xs font-semibold text-ink animate-in fade-in-50 zoom-in-95 duration-100"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const el = elements.find((item) => item.id === contextMenu.elementId);
              if (el) duplicateSpecificElement(el);
              setContextMenu(null);
            }}
            className="flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left hover:bg-sunken text-ink transition-colors"
          >
            <span className="flex items-center gap-2">
              <Copy className="size-3.5 text-muted" />
              Duplicate / Copy
            </span>
            <span className="font-mono text-[10px] text-muted">Ctrl+D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleRotate(contextMenu.elementId);
              setContextMenu(null);
            }}
            className="flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left hover:bg-sunken text-ink transition-colors"
          >
            <span className="flex items-center gap-2">
              <RotateCw className="size-3.5 text-muted" />
              Rotate +45°
            </span>
            <span className="font-mono text-[10px] text-muted">R</span>
          </button>

          <div className="my-1 border-t border-line" />

          <button
            type="button"
            onClick={() => {
              onDeleteElement(contextMenu.elementId);
              setContextMenu(null);
            }}
            className="flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left hover:bg-denied-bg text-denied transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="size-3.5 text-denied" />
              Delete Element
            </span>
            <span className="font-mono text-[10px] text-denied/70">Del</span>
          </button>
        </div>
      )}
    </div>
  );
}

function getDynamicLabelPosition(
  el: LayoutElement,
  x: number,
  y: number,
  w: number,
  h: number,
  allElements?: LayoutElement[],
) {
  const defaultCx = x + w / 2;
  const defaultCy = y + h / 2 + 4;
  if (!allElements || allElements.length === 0) {
    return { x: defaultCx, y: defaultCy, anchor: "middle" as const };
  }

  // Check if any other element overlaps our center label area
  // Label bounding box estimation (approx 80px wide x 24px high)
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

    // AABB intersection check with label area
    return ox < labelBox.x2 && ox + ow > labelBox.x1 && oy < labelBox.y2 && oy + oh > labelBox.y1;
  });

  if (!isCovered) {
    return { x: defaultCx, y: defaultCy, anchor: "middle" as const };
  }

  // If covered, find an unblocked position inside or nearby the container
  // Option 1: Top margin (e.g. y + 14)
  const topPos = { x: defaultCx, y: y + 14, anchor: "middle" as const };
  const topCovered = allElements.some((other) => {
    if (other.id === el.id) return false;
    const ox = other.x * PIXELS_PER_METER;
    const oy = other.y * PIXELS_PER_METER;
    const ow = other.width * PIXELS_PER_METER;
    const oh = other.length * PIXELS_PER_METER;
    return ox < topPos.x + 35 && ox + ow > topPos.x - 35 && oy < topPos.y + 8 && oy + oh > topPos.y - 12;
  });
  if (!topCovered) return topPos;

  // Option 2: Bottom margin (e.g. y + h - 10)
  const botPos = { x: defaultCx, y: y + h - 10, anchor: "middle" as const };
  const botCovered = allElements.some((other) => {
    if (other.id === el.id) return false;
    const ox = other.x * PIXELS_PER_METER;
    const oy = other.y * PIXELS_PER_METER;
    const ow = other.width * PIXELS_PER_METER;
    const oh = other.length * PIXELS_PER_METER;
    return ox < botPos.x + 35 && ox + ow > botPos.x - 35 && oy < botPos.y + 8 && oy + oh > botPos.y - 12;
  });
  if (!botCovered) return botPos;

  // Option 3: Left side
  const leftPos = { x: x + 12, y: defaultCy, anchor: "start" as const };
  const leftCovered = allElements.some((other) => {
    if (other.id === el.id) return false;
    const ox = other.x * PIXELS_PER_METER;
    const oy = other.y * PIXELS_PER_METER;
    const ow = other.width * PIXELS_PER_METER;
    const oh = other.length * PIXELS_PER_METER;
    return ox < leftPos.x + 70 && ox + ow > leftPos.x && oy < leftPos.y + 8 && oy + oh > leftPos.y - 12;
  });
  if (!leftCovered) return leftPos;

  // Option 4: Right side
  return { x: x + w - 12, y: defaultCy, anchor: "end" as const };
}

function renderElementShape(
  el: LayoutElement,
  x: number,
  y: number,
  w: number,
  h: number,
  isSelected: boolean,
  allElements?: LayoutElement[],
) {
  const seats = calculateSeats(el);

  switch (el.type) {
    case "stage": {
      const labelPos = getDynamicLabelPosition(el, x, y, w, h, allElements);
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
          <line x1={x + 4} y1={y + h - 3} x2={x + w - 4} y2={y + h - 3} stroke="#02458d" strokeWidth="2" />
          <text
            x={labelPos.x}
            y={labelPos.y}
            textAnchor={labelPos.anchor}
            className="fill-ink font-sans text-[11px] font-bold select-none"
          >
            {el.label || "STAGE / PLATFORM"}
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
            className="fill-ink font-sans text-[9px] font-bold select-none"
          >
            {el.label || "PULPIT"}
          </text>
        </g>
      );

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
          <line x1={x + 6} y1={y + h / 2} x2={x + w - 6} y2={y + h / 2} stroke="#7b8190" strokeWidth="1" strokeDasharray="3,3" />
          <text
            x={x + w / 2}
            y={y + h / 2 + 4}
            textAnchor="middle"
            className="fill-white font-sans text-[10px] font-bold select-none"
          >
            {el.label || "SOUND / AV BOOTH"}
          </text>
        </g>
      );

    case "chair_row": {
      const chairsPerRow = el.chairsPerRow ?? 5;
      const rows = el.rowCount ?? 1;
      const chairW = (w - 8) / chairsPerRow;
      const rowH = (h - 8) / rows;

      return (
        <g>
          {/* Block boundary */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={3}
            fill="#f7f5f0"
            stroke={isSelected ? "#02458d" : "#c5bdb0"}
            strokeWidth="1"
          />
          {/* Render individual chairs */}
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
                  fillOpacity="0.8"
                  stroke="#012b59"
                  strokeWidth="0.5"
                />
              );
            }),
          )}
          {/* Seat count label */}
          <text
            x={x + w / 2}
            y={y + h + 12}
            textAnchor="middle"
            className="fill-muted font-mono text-[9px] font-bold select-none"
          >
            {el.label || `${chairsPerRow * rows} seats`}
          </text>
        </g>
      );
    }

    case "round_table": {
      const radius = Math.min(w, h) / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const tableRadius = radius * 0.7;
      const chairCount = seats || 8;

      return (
        <g>
          {/* Chairs surrounding round table */}
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
          {/* Central Table */}
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
      const chairCount = seats || (el.tableDimensionsInches === "30x96" ? 3 : 2);
      const chairStep = (w - 12) / chairCount;

      return (
        <g>
          {/* Chairs aligned along bottom */}
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
          {/* Rect Table Surface */}
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
            fill="url(#aisle-hatch)"
            stroke="#02458d"
            strokeWidth="1"
            strokeDasharray="4,4"
            strokeOpacity="0.4"
          />
          <text
            x={x + w / 2}
            y={y + h / 2 + 3}
            textAnchor="middle"
            className="fill-brand font-mono text-[9px] font-bold uppercase tracking-widest select-none opacity-80"
          >
            {el.label || "AISLE"}
          </text>
        </g>
      );

    case "pillar":
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill="#2c2f36"
            stroke="#16181d"
            strokeWidth="1.5"
          />
          <line x1={x} y1={y} x2={x + w} y2={y + h} stroke="#646972" strokeWidth="1" />
          <line x1={x + w} y1={y} x2={x} y2={y + h} stroke="#646972" strokeWidth="1" />
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
          {/* Door swing arc */}
          <path
            d={`M ${x} ${y + h} A ${w} ${w} 0 0 1 ${x + w} ${y + h}`}
            fill="none"
            stroke="#646972"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <text
            x={x + w / 2}
            y={y - 4}
            textAnchor="middle"
            className="fill-ink font-sans text-[9px] font-bold select-none"
          >
            {el.label || "DOOR"}
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
