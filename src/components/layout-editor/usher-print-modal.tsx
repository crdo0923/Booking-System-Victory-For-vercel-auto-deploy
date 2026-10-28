"use client";

import { Printer } from "lucide-react";
import type { LayoutElement, Room } from "@/lib/data/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { calculateSeats } from "./elements-meta";

interface UsherPrintModalProps {
  open: boolean;
  onClose: () => void;
  room: Room;
  elements: LayoutElement[];
  totalSeats: number;
}

export function UsherPrintModal({
  open,
  onClose,
  room,
  elements,
  totalSeats,
}: UsherPrintModalProps) {
  function handlePrint() {
    window.print();
  }

  const roomLM = room.dimensionsLM ?? 10;
  const roomWM = room.dimensionsWM ?? 8;
  const scale = 36; // 36px per meter in print preview

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Usher & Volunteer Floor Plan Sheet"
      description="Clean architectural schematic optimized for printing and church setup clipboards."
      size="lg"
    >
      <div className="space-y-4">
        {/* Print preview controls */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="text-xs text-muted">
            Format: High-contrast monochrome vector. Suitable for standard 8.5&quot;×11&quot; / A4 paper.
          </div>
          <Button variant="primary" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
            <Printer className="size-4" />
            <span>Print Sheet</span>
          </Button>
        </div>

        {/* Printable Card Area */}
        <div
          id="usher-printable-area"
          className="rounded border border-ink/20 bg-white p-6 text-black print:border-0 print:p-0"
        >
          {/* Header block */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Victory Church Facilities · Room Setup Directive
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight text-black">{room.name}</h1>
              <p className="text-xs text-zinc-700">
                {room.building ?? "Main Building"} · {room.floorLevel ?? "Ground Floor"} · {room.locationLabel}
              </p>
            </div>

            <div className="text-right">
              <div className="font-mono text-2xl font-black">{totalSeats} SEATS</div>
              <div className="text-[11px] text-zinc-600 font-medium">Max Limit: {room.capacity}</div>
              <div className="mt-1 text-[10px] font-mono text-zinc-400">
                Generated: {new Date().toLocaleDateString("en-PH", { dateStyle: "medium" })}
              </div>
            </div>
          </div>

          {/* SVG Floor Plan Rendering */}
          <div className="my-6 flex justify-center overflow-x-auto py-2">
            <svg
              width={roomWM * scale}
              height={roomLM * scale}
              viewBox={`0 0 ${roomWM * scale} ${roomLM * scale}`}
              className="border-2 border-black bg-zinc-50"
            >
              {/* Grid lines */}
              <defs>
                <pattern id="usher-grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={roomWM * scale} height={roomLM * scale} fill="url(#usher-grid)" />

              {/* Elements in clean high-contrast black/white */}
              {elements.map((el) => {
                const w = el.width * scale;
                const h = el.length * scale;
                const x = el.x * scale;
                const y = el.y * scale;
                const cx = x + w / 2;
                const cy = y + h / 2;

                return (
                  <g key={el.id} transform={`rotate(${el.rotation}, ${cx}, ${cy})`}>
                    {renderUsherShape(el, x, y, w, h)}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Summary Checklist */}
          <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-4 text-xs">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-black">Inventory Checklist</h3>
              <ul className="mt-1.5 space-y-1 text-zinc-700 font-mono text-[11px]">
                <li>• Chairs to deploy: {totalSeats} padded sanctuary chairs</li>
                <li>• Round tables: {elements.filter((e) => e.type === "round_table").length} units</li>
                <li>• Rectangular tables: {elements.filter((e) => e.type === "rect_table").length} units</li>
                <li>• Stage/Pulpit: {elements.filter((e) => e.type === "stage" || e.type === "podium").length} units</li>
              </ul>
            </div>

            <div className="border-l border-zinc-300 pl-4">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-black">Usher & Security Notes</h3>
              <ul className="mt-1.5 space-y-1 text-zinc-700 text-[11px]">
                <li>• Ensure aisle pathways remain at minimum 1.2m clear width.</li>
                <li>• Keep all emergency exit doorways completely unobstructed.</li>
                <li>• Turn on air conditioning units 45 minutes before call time.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function renderUsherShape(el: LayoutElement, x: number, y: number, w: number, h: number) {
  const seats = calculateSeats(el);

  if (el.type === "stage") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#e5e5e5" stroke="#000" strokeWidth="1.5" />
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="font-sans text-[10px] font-bold fill-black">
          {el.label || "STAGE / PLATFORM"}
        </text>
      </g>
    );
  }

  if (el.type === "chair_row") {
    const chairs = el.chairsPerRow ?? 5;
    const rows = el.rowCount ?? 1;
    const cw = w / chairs;
    const rh = h / rows;

    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#000" strokeWidth="1" strokeDasharray="2,2" />
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: chairs }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={x + c * cw + 1}
              y={y + r * rh + 1}
              width={cw - 2}
              height={rh - 2}
              fill="#000"
              rx={1}
            />
          )),
        )}
      </g>
    );
  }

  if (el.type === "round_table") {
    const r = Math.min(w, h) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;

    return (
      <g>
        <circle cx={cx} cy={cy} r={r * 0.7} fill="#fff" stroke="#000" strokeWidth="1.5" />
        <text x={cx} y={cy + 3} textAnchor="middle" className="font-sans text-[9px] font-bold fill-black">
          {seats}p
        </text>
      </g>
    );
  }

  if (el.type === "rect_table") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#000" strokeWidth="1.5" />
        <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" className="font-sans text-[9px] font-bold fill-black">
          {seats}p
        </text>
      </g>
    );
  }

  return (
    <rect x={x} y={y} width={w} height={h} fill="#e5e5e5" stroke="#000" strokeWidth="1" />
  );
}
