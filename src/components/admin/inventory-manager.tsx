"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Edit2,
  Filter,
  Package,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import type { InventoryCategory, InventoryItem } from "@/lib/data/types";
import { INVENTORY_CATEGORIES } from "@/lib/validation/inventory";
import { archiveInventoryItemAction } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { InventoryItemDialog } from "@/components/admin/inventory-item-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface InventoryManagerProps {
  initialItems: InventoryItem[];
}

const CATEGORY_NAMES: Record<InventoryCategory, string> = {
  communion: "Communion",
  av_tech: "AV & Tech",
  hospitality: "Hospitality",
  paper_office: "Office & Paper",
  cleaning: "Sanitation",
};

export function InventoryManager({ initialItems }: InventoryManagerProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Metrics
  const metrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const item of items) {
      if (item.currentStock <= 0) {
        outOfStock++;
      } else if (item.currentStock <= item.reorderThreshold) {
        lowStock++;
      } else {
        inStock++;
      }
    }

    return {
      total: items.length,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        CATEGORY_NAMES[item.category].toLowerCase().includes(query)
      );
    });
  }, [items, search, selectedCategory]);

  function handleOpenCreate() {
    setEditingItem(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(item: InventoryItem) {
    setEditingItem(item);
    setDialogOpen(true);
  }

  function handleArchive(item: InventoryItem) {
    if (!confirm(`Are you sure you want to archive "${item.name}"?`)) return;

    startTransition(async () => {
      const result = await archiveInventoryItemAction(item.id);
      if (result.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        alert(result.error ?? "Failed to archive item.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-subtle transition-colors">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total Items</span>
            <Package className="size-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
              {metrics.total}
            </span>
            <span className="text-xs text-muted">catalog items</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-subtle transition-colors">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">In Stock</span>
            <CheckCircle2 className="size-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300 tabular-nums">
              {metrics.inStock}
            </span>
            <span className="text-xs text-muted">healthy levels</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-subtle transition-colors">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="size-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-amber-800 dark:text-amber-300 tabular-nums">
              {metrics.lowStock}
            </span>
            <span className="text-xs text-muted">needs reorder</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-subtle transition-colors">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">Out of Stock</span>
            <XCircle className="size-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-rose-800 dark:text-rose-300 tabular-nums">
              {metrics.outOfStock}
            </span>
            <span className="text-xs text-muted">depleted</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter categories">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              selectedCategory === "all"
                ? "bg-ink text-canvas shadow-xs"
                : "bg-surface text-ink-soft hover:bg-surface/80 hover:text-ink border border-line",
            )}
          >
            All
          </button>
          {INVENTORY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                selectedCategory === cat
                  ? "bg-ink text-canvas shadow-xs"
                  : "bg-surface text-ink-soft hover:bg-surface/80 hover:text-ink border border-line",
              )}
            >
              {CATEGORY_NAMES[cat]}
            </button>
          ))}
        </div>

        {/* Search & Add Button */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              placeholder="Search items or location..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <Button variant="primary" onClick={handleOpenCreate} size="sm" className="gap-1.5 shrink-0">
            <Plus className="size-4" />
            Add Consumable
          </Button>
        </div>
      </div>

      {/* Item Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No consumable items found"
          description={
            search || selectedCategory !== "all"
              ? "No items match your selected filters. Try clearing the search or category."
              : "No consumable items have been added to the catalog yet."
          }
          action={
            search || selectedCategory !== "all" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleOpenCreate} className="gap-1.5">
                <Plus className="size-4" />
                Add your first item
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/40 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Item & Category
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Storage Location
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Stock Level
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Reorder At
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredItems.map((item) => {
                  const isOut = item.currentStock <= 0;
                  const isLow = !isOut && item.currentStock <= item.reorderThreshold;

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-canvas/50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-ink">{item.name}</div>
                        <div className="mt-0.5 text-xs text-muted">
                          {CATEGORY_NAMES[item.category]} ·{" "}
                          <span className="capitalize">{item.unit}</span>
                          {item.unitCost ? ` · ₱${Number(item.unitCost).toFixed(2)} / ${item.unit}` : ""}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-medium text-ink-soft">
                        {item.location}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={cn(
                            "font-bold tabular-nums text-sm",
                            isOut
                              ? "text-rose-700 dark:text-rose-400"
                              : isLow
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-ink",
                          )}
                        >
                          {item.currentStock}
                        </span>
                        <span className="ml-1 text-xs text-muted">{item.unit}</span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-xs font-bold text-muted tabular-nums">
                          {item.reorderThreshold}
                        </span>
                        <span className="ml-1 text-xs text-muted">{item.unit}</span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                            <span className="size-1.5 rounded-full bg-rose-600" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                            <span className="size-1.5 rounded-full bg-amber-600" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="size-1.5 rounded-full bg-emerald-600" />
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="quiet"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 px-2 text-xs text-muted hover:text-ink"
                            title="Edit Item"
                          >
                            <Edit2 className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="quiet"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleArchive(item)}
                            className="h-8 px-2 text-xs text-muted hover:text-rose-600"
                            title="Archive Item"
                          >
                            <Archive className="size-3.5" />
                            <span className="sr-only">Archive</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <InventoryItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onSuccess={() => {
          // Re-fetch or reload page data via router
          window.location.reload();
        }}
      />
    </div>
  );
}
