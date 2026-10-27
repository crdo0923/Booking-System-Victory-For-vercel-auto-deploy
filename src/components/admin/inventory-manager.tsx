"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Edit2,
  FileSpreadsheet,
  Plus,
  Search,
} from "lucide-react";
import type {
  InventoryCategory,
  InventoryItem,
  InventoryReportSummary,
  InventoryTransaction,
  InventoryTransactionType,
  Room,
} from "@/lib/data/types";
import { INVENTORY_CATEGORIES } from "@/lib/validation/inventory";
import { archiveInventoryItemAction } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { InventoryItemDialog } from "@/components/admin/inventory-item-dialog";
import { StockTransactionDialog } from "@/components/admin/stock-transaction-dialog";
import { StockMovementLedger } from "@/components/admin/stock-movement-ledger";
import { InventoryReportsView } from "@/components/admin/inventory-reports-view";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusMark } from "@/components/ui/status";
import { cn } from "@/lib/utils";

interface InventoryManagerProps {
  initialItems: InventoryItem[];
  initialTransactions?: InventoryTransaction[];
  initialSummary?: InventoryReportSummary;
  rooms: Room[];
}

const CATEGORY_NAMES: Record<InventoryCategory, string> = {
  communion: "Communion",
  av_tech: "AV & Tech",
  hospitality: "Hospitality",
  paper_office: "Office & Paper",
  cleaning: "Sanitation",
};

type ActiveTab = "catalog" | "ledger" | "reports";

export function InventoryManager({
  initialItems,
  initialTransactions = [],
  initialSummary,
  rooms,
}: InventoryManagerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog");
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(initialTransactions);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | "all">("all");

  // Dialogs
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogItemId, setStockDialogItemId] = useState<string | null>(null);
  const [stockDialogType, setStockDialogType] = useState<InventoryTransactionType>("stock_in_restock");

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

  // Derived or initial summary
  const summary: InventoryReportSummary = useMemo(() => {
    if (initialSummary && items === initialItems && transactions === initialTransactions) {
      return initialSummary;
    }
    const active = items.filter((i) => !i.isArchived);
    let lowCount = 0;
    let outCount = 0;
    const warnings: InventoryItem[] = [];

    for (const i of active) {
      if (i.currentStock <= 0) {
        outCount++;
        warnings.push(i);
      } else if (i.currentStock <= i.reorderThreshold) {
        lowCount++;
        warnings.push(i);
      }
    }

    let restocked = 0;
    let consumed = 0;
    const roomMap = new Map<string, { roomName: string; quantity: number }>();
    const minMap = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.transactionType === "stock_in_restock") {
        restocked += tx.quantity;
      } else {
        consumed += tx.quantity;
        if (tx.roomId) {
          const c = roomMap.get(tx.roomId) ?? { roomName: tx.roomName || "Room", quantity: 0 };
          c.quantity += tx.quantity;
          roomMap.set(tx.roomId, c);
        }
        if (tx.recipientOrMinistry) {
          const c = minMap.get(tx.recipientOrMinistry) ?? 0;
          minMap.set(tx.recipientOrMinistry, c + tx.quantity);
        }
      }
    }

    return {
      totalItems: active.length,
      lowStockItemsCount: lowCount,
      outOfStockItemsCount: outCount,
      totalRestockedQuantity: restocked,
      totalConsumedQuantity: consumed,
      consumedByRoom: Array.from(roomMap.entries()).map(([roomId, data]) => ({
        roomId,
        roomName: data.roomName,
        quantity: data.quantity,
      })),
      consumedByMinistry: Array.from(minMap.entries()).map(([ministry, quantity]) => ({
        ministry,
        quantity,
      })),
      activeReorderWarnings: warnings,
    };
  }, [items, transactions, initialSummary, initialItems, initialTransactions]);

  // Filtered items for Catalog
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

  function handleOpenCreateItem() {
    setEditingItem(null);
    setItemDialogOpen(true);
  }

  function handleOpenEditItem(item: InventoryItem) {
    setEditingItem(item);
    setItemDialogOpen(true);
  }

  function handleOpenStockAction(type: InventoryTransactionType, item?: InventoryItem) {
    setStockDialogType(type);
    setStockDialogItemId(item ? item.id : null);
    setStockDialogOpen(true);
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
    <div className="space-y-6">
      {/* Top Module Subnavigation: Editorial Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-line gap-4 pb-0">
        <nav aria-label="Inventory Sections" className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={cn(
              "flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-colors",
              activeTab === "catalog"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            <Boxes className="size-4" />
            Consumables Catalog
            <span className="text-xs text-muted tabular-nums">({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={cn(
              "flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-colors",
              activeTab === "ledger"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            <ClipboardList className="size-4" />
            Stock In / Out Ledger
            <span className="text-xs text-muted tabular-nums">({transactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-colors",
              activeTab === "reports"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            <FileSpreadsheet className="size-4" />
            Reports & Movements
            {summary.lowStockItemsCount + summary.outOfStockItemsCount > 0 && (
              <span className="size-2 rounded-full bg-rose-600" title="Low stock alerts" />
            )}
          </button>
        </nav>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 pb-3 sm:pb-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenStockAction("stock_in_restock")}
            className="text-xs flex items-center gap-1.5"
          >
            <ArrowDownLeft className="size-3.5 text-emerald-600" />
            Stock In (Restock)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenStockAction("stock_out_ministry")}
            className="text-xs flex items-center gap-1.5"
          >
            <ArrowUpRight className="size-3.5 text-amber-600" />
            Stock Out (Requisition)
          </Button>

          {activeTab === "catalog" && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateItem}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              New Item
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: ITEM MASTER (CATALOG) */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Metrics Row: Editorial tabular stats */}
          <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line border-y border-line sm:grid-cols-4">
            <div className="py-4 pr-4 sm:pr-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Catalog</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
                  {metrics.total}
                </span>
                <span className="text-xs text-muted">items</span>
              </div>
            </div>

            <div className="py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Healthy Stock</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
                  {metrics.inStock}
                </span>
                <span className="text-xs text-muted">items</span>
              </div>
            </div>

            <div className="py-4 pr-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Low Stock</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
                  {metrics.lowStock}
                </span>
                <span className="text-xs text-muted">need reorder</span>
              </div>
            </div>

            <div className="py-4 sm:pl-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Out of Stock</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
                  {metrics.outOfStock}
                </span>
                <span className="text-xs text-muted">depleted</span>
              </div>
            </div>
          </div>

          {/* Control Bar: Filter Tabs & Search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
            <nav aria-label="Filter categories" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <ul className="flex min-w-max gap-6" role="tablist">
                <li>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === "all"}
                    onClick={() => setSelectedCategory("all")}
                    className={cn(
                      "-mb-4 flex items-center gap-2 border-b-2 pt-1 pb-4 text-sm font-bold transition-colors",
                      selectedCategory === "all"
                        ? "border-ink text-ink"
                        : "border-transparent text-muted hover:text-ink",
                    )}
                  >
                    All
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        selectedCategory === "all" ? "text-ink-soft" : "text-subtle",
                      )}
                    >
                      {items.length}
                    </span>
                  </button>
                </li>
                {INVENTORY_CATEGORIES.map((cat) => {
                  const count = items.filter((i) => i.category === cat).length;
                  return (
                    <li key={cat}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedCategory === cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "-mb-4 flex items-center gap-2 border-b-2 pt-1 pb-4 text-sm font-bold transition-colors",
                          selectedCategory === cat
                            ? "border-ink text-ink"
                            : "border-transparent text-muted hover:text-ink",
                        )}
                      >
                        {CATEGORY_NAMES[cat]}
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            selectedCategory === cat ? "text-ink-soft" : "text-subtle",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

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
          </div>

          {/* Catalog Table */}
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No items found"
              description={
                search || selectedCategory !== "all"
                  ? "No consumables matched your search and filter criteria."
                  : "No inventory consumables cataloged yet."
              }
            />
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="py-3 pr-4 font-normal">Item Details</th>
                    <th className="py-3 px-4 font-normal">Storage Location</th>
                    <th className="py-3 px-4 font-normal text-right">In Stock</th>
                    <th className="py-3 px-4 font-normal text-right">Reorder At</th>
                    <th className="py-3 px-4 font-normal text-left">Status</th>
                    <th className="py-3 pl-4 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredItems.map((item) => {
                    const isOut = item.currentStock <= 0;
                    const isLow = !isOut && item.currentStock <= item.reorderThreshold;

                    return (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-canvas/60"
                      >
                        <td className="py-4 pr-4">
                          <div className="font-bold text-ink">{item.name}</div>
                          <div className="mt-0.5 text-xs text-muted">
                            {CATEGORY_NAMES[item.category]} ·{" "}
                            <span className="capitalize">{item.unit}</span>
                            {item.unitCost ? ` · ₱${Number(item.unitCost).toFixed(2)} / ${item.unit}` : ""}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs font-medium text-ink-soft">
                          {item.location}
                        </td>

                        <td className="py-4 px-4 text-right">
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

                        <td className="py-4 px-4 text-right">
                          <span className="text-xs font-bold text-muted tabular-nums">
                            {item.reorderThreshold}
                          </span>
                          <span className="ml-1 text-xs text-muted">{item.unit}</span>
                        </td>

                        <td className="py-4 px-4 text-left">
                          {isOut ? (
                            <StatusMark tone="cancelled" label="Out of Stock" />
                          ) : isLow ? (
                            <StatusMark tone="pending" label="Low Stock" />
                          ) : (
                            <StatusMark tone="approved" label="Healthy" />
                          )}
                        </td>

                        <td className="py-4 pl-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => handleOpenStockAction("stock_in_restock", item)}
                              className="h-8 px-2 text-xs text-emerald-700 hover:text-emerald-800"
                              title="Stock In / Restock"
                            >
                              <ArrowDownLeft className="size-3.5" />
                              <span className="sr-only">Stock In</span>
                            </Button>
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => handleOpenStockAction("stock_out_ministry", item)}
                              className="h-8 px-2 text-xs text-amber-700 hover:text-amber-800"
                              title="Stock Out / Requisition"
                            >
                              <ArrowUpRight className="size-3.5" />
                              <span className="sr-only">Stock Out</span>
                            </Button>
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => handleOpenEditItem(item)}
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
          )}
        </div>
      )}

      {/* TAB 2: STOCK IN / OUT LEDGER */}
      {activeTab === "ledger" && (
        <StockMovementLedger
          transactions={transactions}
          rooms={rooms}
          onOpenStockAction={(t) => handleOpenStockAction(t)}
        />
      )}

      {/* TAB 3: REPORTS & MOVEMENTS */}
      {activeTab === "reports" && (
        <InventoryReportsView
          summary={summary}
          items={items}
          rooms={rooms}
        />
      )}

      {/* Dialog: Create/Edit Consumable Item */}
      <InventoryItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* Dialog: Record Stock In / Stock Out Transaction */}
      <StockTransactionDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        items={items}
        rooms={rooms}
        initialItemId={stockDialogItemId}
        initialType={stockDialogType}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
