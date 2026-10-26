"use client";

import { useState } from "react";
import {
  Church,
  Grid,
  Maximize2,
  Minimize2,
  Plus,
  Users,
  Table as TableIcon,
  Columns,
  DoorOpen,
  HelpCircle,
} from "lucide-react";
import { PALETTE_ITEMS, type PaletteItem } from "./elements-meta";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  onAddElement: (item: PaletteItem) => void;
}

export function Toolbar({ onAddElement }: ToolbarProps) {
  const [activeCategory, setActiveCategory] = useState<PaletteItem["category"]>("church");

  const categories = [
    { key: "church" as const, label: "Church", icon: Church },
    { key: "seating" as const, label: "Rows & Blocks", icon: Users },
    { key: "tables" as const, label: "Tables", icon: TableIcon },
    { key: "architectural" as const, label: "Markers", icon: Columns },
  ];

  const filteredItems = PALETTE_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface select-none">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Element Palette</h2>
        <p className="mt-0.5 text-xs text-subtle">Click an element to place on canvas</p>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 gap-1 border-b border-line bg-sunken/40 p-1.5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-bold transition-colors",
                isActive
                  ? "bg-surface text-brand shadow-sm border border-line"
                  : "text-muted hover:bg-surface/50 hover:text-ink",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Elements List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredItems.map((item, idx) => (
          <button
            key={`${item.type}-${idx}`}
            type="button"
            onClick={() => onAddElement(item)}
            className="group flex w-full flex-col items-start rounded-md border border-line bg-surface p-2.5 text-left transition-all hover:border-brand/60 hover:bg-brand/[0.02] hover:shadow-sm"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-bold text-ink group-hover:text-brand">{item.label}</span>
              <Plus className="size-3.5 text-muted group-hover:text-brand" />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted line-clamp-2">{item.description}</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-subtle">
              <span>
                {item.width}m × {item.length}m
              </span>
              {item.defaultSeats > 0 && (
                <span className="rounded bg-brand/10 px-1 py-0.2 text-[10px] font-semibold text-brand">
                  {item.defaultSeats} seats
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Spandi Quick Instructions */}
      <div className="border-t border-line bg-sunken/30 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
          <HelpCircle className="size-3.5 text-muted" />
          <span>Editor Shortcuts</span>
        </div>
        <ul className="mt-1.5 space-y-1 text-[10px] text-muted">
          <li>• Drag elements to position (snaps to 0.5m)</li>
          <li>• Click element to select & edit rotation</li>
          <li>• Press <kbd className="rounded border border-line bg-surface px-1 py-0.5">Del</kbd> to delete selected</li>
          <li>• Drag canvas background to pan</li>
        </ul>
      </div>
    </div>
  );
}
