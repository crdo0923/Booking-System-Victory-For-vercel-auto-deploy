"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Download, Printer, TrendingDown, TrendingUp } from "lucide-react";
import type { InventoryItem, InventoryReportSummary, Room } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { StatusMark } from "@/components/ui/status";

interface InventoryReportsViewProps {
  summary: InventoryReportSummary;
  items: InventoryItem[];
  rooms: Room[];
}

export function InventoryReportsView({
  summary,
  items,
  rooms,
}: InventoryReportsViewProps) {
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("all");

  const filteredRoomConsumption = useMemo(() => {
    if (selectedRoomFilter === "all") return summary.consumedByRoom;
    return summary.consumedByRoom.filter((r) => r.roomId === selectedRoomFilter);
  }, [summary.consumedByRoom, selectedRoomFilter]);

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    const headers = ["Item Name", "Category", "Unit", "Current Stock", "Reorder Threshold", "Unit Cost", "Location"];
    const rows = items.map((i) => [
      `"${i.name.replace(/"/g, '""')}"`,
      i.category,
      i.unit,
      i.currentStock,
      i.reorderThreshold,
      i.unitCost ?? 0,
      `"${i.location.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `victory_inventory_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Action Header for Printable & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-line print:hidden">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">
            Inventory Movement & Stewardship Report
          </h3>
          <p className="text-xs text-muted">
            Aggregated usage trends across church ministries, venues, and active replenishment warnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="quiet"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="text-xs flex items-center gap-1.5"
          >
            <Printer className="size-3.5" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded border border-line bg-surface/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Active Catalog Items
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-ink tabular-nums">
            {summary.totalItems}
          </div>
          <div className="mt-0.5 text-xs text-muted">Tracked consumables</div>
        </div>

        <div className="p-4 rounded border border-line bg-surface/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
            <TrendingUp className="size-3 text-emerald-600" />
            Total Restocked
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
            {summary.totalRestockedQuantity}
          </div>
          <div className="mt-0.5 text-xs text-muted">Units received in period</div>
        </div>

        <div className="p-4 rounded border border-line bg-surface/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
            <TrendingDown className="size-3 text-amber-600" />
            Total Consumed
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-amber-800 dark:text-amber-300 tabular-nums">
            {summary.totalConsumedQuantity}
          </div>
          <div className="mt-0.5 text-xs text-muted">Distributed to services & rooms</div>
        </div>

        <div className="p-4 rounded border border-line bg-surface/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
            <AlertCircle className="size-3 text-rose-600" />
            Reorder Warnings
          </div>
          <div className="mt-1 font-serif text-2xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">
            {summary.lowStockItemsCount + summary.outOfStockItemsCount}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {summary.outOfStockItemsCount} out of stock · {summary.lowStockItemsCount} low
          </div>
        </div>
      </div>

      {/* Reorder Warnings Log */}
      <div className="space-y-3">
        <h4 className="font-serif text-base font-bold text-ink">
          Low Stock & Urgent Reorder Log
        </h4>

        {summary.activeReorderWarnings.length === 0 ? (
          <div className="p-4 rounded border border-line bg-canvas/40 text-xs text-muted">
            All inventory consumable items are currently well above their safe reorder thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="py-2.5 pr-4 font-normal">Item</th>
                  <th className="py-2.5 px-4 font-normal">Location</th>
                  <th className="py-2.5 px-4 font-normal text-right">Current Stock</th>
                  <th className="py-2.5 px-4 font-normal text-right">Reorder Point</th>
                  <th className="py-2.5 px-4 font-normal text-right">Deficit</th>
                  <th className="py-2.5 pl-4 font-normal">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {summary.activeReorderWarnings.map((item) => {
                  const isOut = item.currentStock <= 0;
                  const deficit = Math.max(0, item.reorderThreshold - item.currentStock);

                  return (
                    <tr key={item.id} className="hover:bg-canvas/50">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-ink text-xs">{item.name}</div>
                        <div className="text-[11px] text-muted capitalize">
                          {item.category.replace("_", " & ")} · {item.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-soft">
                        {item.location}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold tabular-nums text-xs text-rose-700 dark:text-rose-400">
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium tabular-nums text-xs text-muted">
                          {item.reorderThreshold} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold tabular-nums text-xs text-ink">
                          +{deficit} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 pl-4">
                        {isOut ? (
                          <StatusMark tone="cancelled" label="Immediate Action Required" />
                        ) : (
                          <StatusMark tone="pending" label="Reorder Needed" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Breakdown per Room and Ministry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Consumed by Room */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-base font-bold text-ink">
              Consumption by Venue / Room
            </h4>
            <div className="print:hidden">
              <Select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="text-xs h-8"
              >
                <option value="all">All Rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {filteredRoomConsumption.length === 0 ? (
            <div className="p-4 rounded border border-line bg-canvas/40 text-xs text-muted">
              No venue-specific consumptions logged yet.
            </div>
          ) : (
            <div className="border border-line rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas/40 text-[11px] font-semibold text-muted">
                    <th className="py-2 px-3">Room / Space</th>
                    <th className="py-2 px-3 text-right">Items Consumed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredRoomConsumption.map((row) => (
                    <tr key={row.roomId} className="hover:bg-canvas/50">
                      <td className="py-2.5 px-3 font-medium text-ink">
                        {row.roomName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums text-ink">
                        {row.quantity} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Consumed by Ministry */}
        <div className="space-y-3">
          <h4 className="font-serif text-base font-bold text-ink">
            Consumption by Ministry Purpose
          </h4>

          {summary.consumedByMinistry.length === 0 ? (
            <div className="p-4 rounded border border-line bg-canvas/40 text-xs text-muted">
              No ministry requisitions logged yet.
            </div>
          ) : (
            <div className="border border-line rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas/40 text-[11px] font-semibold text-muted">
                    <th className="py-2 px-3">Ministry / Department</th>
                    <th className="py-2 px-3 text-right">Items Requisitioned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {summary.consumedByMinistry.map((row) => (
                    <tr key={row.ministry} className="hover:bg-canvas/50">
                      <td className="py-2.5 px-3 font-medium text-ink">
                        {row.ministry}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums text-ink">
                        {row.quantity} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
