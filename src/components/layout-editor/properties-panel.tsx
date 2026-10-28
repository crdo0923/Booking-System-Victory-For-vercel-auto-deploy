"use client";

import { Trash2, Sliders, Move } from "lucide-react";
import type { LayoutElement } from "@/lib/data/types";
import { calculateSeats } from "./elements-meta";
import { Input, Select } from "@/components/ui/field";

interface PropertiesPanelProps {
  selectedElement: LayoutElement | null;
  roomCapacity: number;
  totalSeats: number;
  onUpdateElement: (updated: LayoutElement) => void;
  onDeleteElement: (id: string) => void;
}

export function PropertiesPanel({
  selectedElement,
  roomCapacity,
  totalSeats,
  onUpdateElement,
  onDeleteElement,
}: PropertiesPanelProps) {
  const isOverCapacity = totalSeats > roomCapacity;

  return (
    <div className="flex h-full flex-col border-l border-line bg-surface select-none">
      {/* Capacity Counter */}
      <div className="border-b border-line bg-sunken/30 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Room Capacity</span>
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
              isOverCapacity
                ? "bg-denied-bg text-denied"
                : totalSeats >= roomCapacity * 0.9
                  ? "bg-amber-100 text-amber-800"
                  : "bg-brand/10 text-brand"
            }`}
          >
            {isOverCapacity ? "Exceeded" : `${Math.round((totalSeats / (roomCapacity || 1)) * 100)}%`}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-ink">{totalSeats}</span>
            <span className="text-xs text-muted">configured seats</span>
          </div>
          <span className="text-xs font-mono text-muted">/ max {roomCapacity}</span>
        </div>

        {/* Meter bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className={`h-full transition-all duration-300 ${
              isOverCapacity ? "bg-denied" : totalSeats >= roomCapacity * 0.9 ? "bg-amber-500" : "bg-brand"
            }`}
            style={{ width: `${Math.min(100, (totalSeats / (roomCapacity || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Selected Element Properties */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedElement ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div className="flex items-center gap-1.5">
                <Sliders className="size-4 text-brand" />
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Item Settings</span>
              </div>
              <button
                type="button"
                onClick={() => onDeleteElement(selectedElement.id)}
                className="flex items-center gap-1 text-xs font-bold text-denied hover:underline"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>

            {/* Label input */}
            <div>
              <label className="block text-xs font-bold text-ink">Label</label>
              <Input
                type="text"
                value={selectedElement.label ?? ""}
                onChange={(e) => onUpdateElement({ ...selectedElement, label: e.target.value })}
                placeholder="Element label"
                className="mt-1 h-9 text-xs"
              />
            </div>

            {/* Rotation Selector */}
            <div>
              <label className="block text-xs font-bold text-ink flex items-center justify-between">
                <span>Rotation</span>
                <span className="text-muted font-mono">{selectedElement.rotation}°</span>
              </label>
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                {([0, 45, 90, 180] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onUpdateElement({ ...selectedElement, rotation: deg })}
                    className={`flex items-center justify-center rounded border py-1.5 text-xs font-mono font-bold transition-colors ${
                      selectedElement.rotation === deg
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-surface text-ink hover:bg-sunken"
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions (Read-only or adjusted) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-muted">Width (m)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={selectedElement.width}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val > 0) onUpdateElement({ ...selectedElement, width: val });
                  }}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted">Length (m)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={selectedElement.length}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val > 0) onUpdateElement({ ...selectedElement, length: val });
                  }}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Coordinates (m) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-muted">Position X (m)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={selectedElement.x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onUpdateElement({ ...selectedElement, x: val });
                  }}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted">Position Y (m)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={selectedElement.y}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onUpdateElement({ ...selectedElement, y: val });
                  }}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Specific Type Settings */}
            {selectedElement.type === "chair_row" && (
              <div className="rounded-md border border-line bg-sunken/20 p-3 space-y-3">
                <span className="text-xs font-bold text-ink">Chair Block Layout</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-muted">Chairs per row</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={selectedElement.chairsPerRow ?? 5}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10);
                        if (count > 0) {
                          const updated = {
                            ...selectedElement,
                            chairsPerRow: count,
                            seats: count * (selectedElement.rowCount ?? 1),
                            width: Math.max(1, count * 0.5),
                          };
                          onUpdateElement(updated);
                        }
                      }}
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted">Row count</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={selectedElement.rowCount ?? 1}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10);
                        if (count > 0) {
                          const updated = {
                            ...selectedElement,
                            rowCount: count,
                            seats: (selectedElement.chairsPerRow ?? 5) * count,
                            length: Math.max(0.9, count * 0.85),
                          };
                          onUpdateElement(updated);
                        }
                      }}
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-brand font-bold pt-1">
                  <span>Calculated Seats:</span>
                  <span className="font-mono text-sm">{calculateSeats(selectedElement)}</span>
                </div>
              </div>
            )}

            {selectedElement.type === "round_table" && (
              <div className="rounded-md border border-line bg-sunken/20 p-3 space-y-2">
                <label className="block text-xs font-bold text-ink">Table Diameter</label>
                <Select
                  value={String(selectedElement.tableDiameterInches ?? 60)}
                  onChange={(e) => {
                    const dia = parseInt(e.target.value, 10) as 36 | 48 | 60 | 72;
                    let seats = 8;
                    let size = 2.4;
                    if (dia === 36) { seats = 4; size = 1.6; }
                    if (dia === 48) { seats = 6; size = 2.0; }
                    if (dia === 60) { seats = 8; size = 2.4; }
                    if (dia === 72) { seats = 10; size = 2.8; }
                    onUpdateElement({
                      ...selectedElement,
                      tableDiameterInches: dia,
                      seats,
                      width: size,
                      length: size,
                    });
                  }}
                  className="h-8 text-xs"
                >
                  <option value="36">36&quot; Round (4 seats)</option>
                  <option value="48">48&quot; Round (6 seats)</option>
                  <option value="60">60&quot; Round (8 seats)</option>
                  <option value="72">72&quot; Round (10 seats)</option>
                </Select>
              </div>
            )}

            {selectedElement.type === "rect_table" && (
              <div className="rounded-md border border-line bg-sunken/20 p-3 space-y-2">
                <label className="block text-xs font-bold text-ink">Classroom Size</label>
                <Select
                  value={selectedElement.tableDimensionsInches ?? "30x96"}
                  onChange={(e) => {
                    const dim = e.target.value as "30x72" | "30x96";
                    const is96 = dim === "30x96";
                    onUpdateElement({
                      ...selectedElement,
                      tableDimensionsInches: dim,
                      seats: is96 ? 3 : 2,
                      width: is96 ? 2.44 : 1.83,
                      length: 0.9,
                    });
                  }}
                  className="h-8 text-xs"
                >
                  <option value="30x72">30&quot;×72&quot; Seminar (2 seats)</option>
                  <option value="30x96">30&quot;×96&quot; Seminar (3 seats)</option>
                </Select>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <Move className="size-8 text-muted/50 mb-2" />
            <p className="text-xs font-bold text-muted">No element selected</p>
            <p className="mt-1 text-[11px] text-subtle max-w-[180px]">
              Click any element on the floor plan canvas to modify its properties or rotation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
