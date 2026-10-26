"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Maximize2,
  Minimize2,
  Grid,
  Check,
} from "lucide-react";
import type { LayoutElement, LayoutPreset, Room, RoomLayout } from "@/lib/data/types";
import { Toolbar } from "./toolbar";
import { Canvas } from "./canvas";
import { PropertiesPanel } from "./properties-panel";
import { TemplateSelector } from "./template-selector";
import { UsherPrintModal } from "./usher-print-modal";
import { type PaletteItem, calculateSeats } from "./elements-meta";
import { saveRoomLayoutAction, saveLayoutPresetAction } from "@/app/actions/layouts";
import { Button } from "@/components/ui/button";

interface RoomLayoutEditorProps {
  room: Room;
  allRooms?: Room[];
  initialLayout: RoomLayout | null;
  presets: LayoutPreset[];
}

export function RoomLayoutEditor({ room, allRooms, initialLayout, presets: initialPresets }: RoomLayoutEditorProps) {
  // Room dimensions
  const roomWidthM = room.dimensionsWM ?? 8;
  const roomLengthM = room.dimensionsLM ?? 10;

  // Presets state
  const [presets, setPresets] = useState<LayoutPreset[]>(initialPresets);

  // Layout state
  const [elements, setElements] = useState<LayoutElement[]>(() => {
    if (initialLayout?.elements && initialLayout.elements.length > 0) {
      return initialLayout.elements;
    }
    // Default to first preset elements if available
    return initialPresets[0]?.elements ?? [];
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [gridSnap, setGridSnap] = useState(0.5);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Compute total seats
  const totalSeats = elements.reduce((acc, el) => acc + calculateSeats(el), 0);

  // Selected element object
  const selectedElement = elements.find((el) => el.id === selectedId) ?? null;

  // Add Element from Toolbar
  function handleAddElement(item: PaletteItem) {
    const id = `elem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    // Center it in the room or offset slightly
    const newElement: LayoutElement = {
      id,
      type: item.type,
      x: Math.round(((roomWidthM - item.width) / 2) / gridSnap) * gridSnap,
      y: Math.round(((roomLengthM - item.length) / 2) / gridSnap) * gridSnap,
      width: item.width,
      length: item.length,
      rotation: 0,
      label: item.label,
      seats: item.defaultSeats,
      tableDiameterInches: item.tableDiameterInches,
      tableDimensionsInches: item.tableDimensionsInches,
      chairsPerRow: item.chairsPerRow,
      rowCount: item.rowCount,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedId(id);
    toast.info(`Added ${item.label}`);
  }

  // Update Element
  function handleUpdateElement(updated: LayoutElement) {
    setElements((prev) => prev.map((el) => (el.id === updated.id ? updated : el)));
  }

  // Delete Element
  function handleDeleteElement(id: string) {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.info("Item removed from canvas");
  }

  // Apply Preset
  function handleApplyPreset(preset: LayoutPreset) {
    setElements(preset.elements);
    setSelectedId(null);
    toast.success(`Loaded preset: ${preset.name}`);
  }

  // Save as Preset
  async function handleSaveAsPreset(presetData: Omit<LayoutPreset, "id">) {
    const res = await saveLayoutPresetAction(presetData);
    if (res.ok) {
      setPresets((prev) => [...prev, res.preset]);
      toast.success("Saved new layout preset!");
    } else {
      toast.error(res.error);
    }
  }

  // Save Room Layout
  function handleSaveLayout() {
    startTransition(async () => {
      const res = await saveRoomLayoutAction({
        roomId: room.id,
        name: `${room.name} Layout`,
        elements,
        gridSnapMeters: gridSnap,
        totalSeats,
      });

      if (res.ok) {
        toast.success(`Saved layout for ${room.name}!`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div data-full-bleed className="flex h-[calc(100vh-3.5rem)] lg:h-screen flex-col bg-surface overflow-hidden">
      {/* Top Header & Action Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-3 sm:px-4 bg-surface z-20 gap-2 sm:gap-4">
        {/* Left: Back & Room selection */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <Link
            href="/admin/rooms"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-muted transition-colors hover:bg-sunken hover:text-ink shrink-0"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Rooms</span>
          </Link>

          <div className="h-4 w-px bg-line shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            {allRooms && allRooms.length > 1 ? (
              <select
                value={room.id}
                onChange={(e) => {
                  window.location.href = `/admin/rooms/${e.target.value}/layout`;
                }}
                className="max-w-[180px] sm:max-w-[220px] truncate rounded-md border border-line bg-surface py-1 pl-2.5 pr-7 text-xs font-bold text-ink hover:border-ink/30 focus:border-brand focus:outline-none"
              >
                {allRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.dimensionsWM ?? 8}m × {r.dimensionsLM ?? 10}m)
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="text-sm font-bold text-ink flex items-center gap-2 truncate">
                <span>{room.name}</span>
                <span className="font-mono text-xs font-normal text-muted">
                  ({roomWidthM}m × {roomLengthM}m)
                </span>
              </h1>
            )}
          </div>
        </div>

        {/* Center Canvas Controls (Zoom & Snap) */}
        <div className="hidden xl:flex items-center gap-3 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center rounded-md border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
              disabled={zoom <= 0.5}
              className="p-1.5 text-muted hover:text-ink disabled:opacity-40"
              title="Zoom out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="w-12 text-center font-mono text-xs font-bold text-ink">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
              disabled={zoom >= 1.5}
              className="p-1.5 text-muted hover:text-ink disabled:opacity-40"
              title="Zoom in"
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>

          {/* Grid Snap selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Grid className="size-3.5" />
            <span>Snap:</span>
            <select
              value={gridSnap}
              onChange={(e) => setGridSnap(parseFloat(e.target.value))}
              className="rounded border border-line bg-surface px-1.5 py-1 font-mono text-xs text-ink"
            >
              <option value="0.5">0.5m</option>
              <option value="0.25">0.25m</option>
              <option value="1.0">1.0m</option>
            </select>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <TemplateSelector
            presets={presets}
            currentLayout={{
              id: initialLayout?.id ?? "",
              roomId: room.id,
              name: `${room.name} Layout`,
              elements,
              gridSnapMeters: gridSnap,
              totalSeats,
              updatedAt: new Date().toISOString(),
            }}
            onApplyPreset={handleApplyPreset}
            onSaveAsPreset={handleSaveAsPreset}
          />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPrintModalOpen(true)}
            className="flex items-center gap-1.5 text-xs shrink-0"
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Usher Sheet</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveLayout}
            busy={isPending}
            className="flex items-center gap-1.5 text-xs font-bold shrink-0 px-3.5 shadow-sm"
          >
            <Save className="size-3.5" />
            <span>Save Layout</span>
          </Button>
        </div>
      </header>

      {/* Main 3-Column Studio Editor */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Elements Palette Toolbar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <Toolbar onAddElement={handleAddElement} />
        </aside>

        {/* Center Interactive Canvas */}
        <main className="flex-1 relative overflow-hidden bg-[#faf8f4]">
          <Canvas
            roomWidthMeters={roomWidthM}
            roomLengthMeters={roomLengthM}
            elements={elements}
            selectedId={selectedId}
            zoom={zoom}
            gridSnapMeters={gridSnap}
            onSelect={setSelectedId}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
          />
        </main>

        {/* Right Properties Panel */}
        <aside className="w-72 shrink-0 hidden md:block">
          <PropertiesPanel
            selectedElement={selectedElement}
            roomCapacity={room.capacity}
            totalSeats={totalSeats}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
          />
        </aside>
      </div>

      {/* Usher Printable View Modal */}
      <UsherPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        room={room}
        elements={elements}
        totalSeats={totalSeats}
      />
    </div>
  );
}
