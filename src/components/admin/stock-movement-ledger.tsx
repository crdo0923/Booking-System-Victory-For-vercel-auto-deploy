"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import type { InventoryTransaction, InventoryTransactionType, Room } from "@/lib/data/types";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface StockMovementLedgerProps {
  transactions: InventoryTransaction[];
  rooms: Room[];
  onOpenStockAction?: (type: InventoryTransactionType) => void;
}

const TYPE_CONFIG: Record<
  InventoryTransactionType,
  { label: string; isStockIn: boolean }
> = {
  stock_in_restock: { label: "Restock In", isStockIn: true },
  stock_out_ministry: { label: "Ministry Out", isStockIn: false },
  stock_out_booking: { label: "Booking Out", isStockIn: false },
  adjustment_loss_waste: { label: "Waste / Loss", isStockIn: false },
};

export function StockMovementLedger({
  transactions,
  rooms,
}: StockMovementLedgerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [roomFilter, setRoomFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== "all" && tx.transactionType !== typeFilter) {
        return false;
      }
      if (roomFilter !== "all") {
        if (roomFilter === "none" && tx.roomId) return false;
        if (roomFilter !== "none" && tx.roomId !== roomFilter) return false;
      }
      if (!q) return true;
      return (
        tx.itemName?.toLowerCase().includes(q) ||
        tx.recipientOrMinistry?.toLowerCase().includes(q) ||
        tx.roomName?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q) ||
        tx.createdByName?.toLowerCase().includes(q)
      );
    });
  }, [transactions, search, typeFilter, roomFilter]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item, ministry, or note..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Movements</option>
            <option value="stock_in_restock">Restock In</option>
            <option value="stock_out_ministry">Ministry Requisitions</option>
            <option value="stock_out_booking">Room Booking Distributions</option>
            <option value="adjustment_loss_waste">Waste & Adjustments</option>
          </Select>

          <Select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Rooms / Central</option>
            <option value="none">Central Storage Only</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Ledger Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions logged"
          description={
            search || typeFilter !== "all" || roomFilter !== "all"
              ? "No inventory movement records match your active filters."
              : "No stock-in or stock-out activities recorded yet."
          }
        />
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="py-3 pr-4 font-normal">Date & Time</th>
                <th className="py-3 px-4 font-normal">Item</th>
                <th className="py-3 px-4 font-normal">Movement</th>
                <th className="py-3 px-4 font-normal text-right">Quantity</th>
                <th className="py-3 px-4 font-normal text-right">Balance After</th>
                <th className="py-3 px-4 font-normal">Destination / Purpose</th>
                <th className="py-3 pl-4 font-normal">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((tx) => {
                const conf = TYPE_CONFIG[tx.transactionType] || {
                  label: tx.transactionType,
                  isStockIn: false,
                  tone: "neutral",
                };

                const dateObj = new Date(tx.createdAt);
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const formattedTime = dateObj.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });

                return (
                  <tr
                    key={tx.id}
                    className="group transition-colors hover:bg-canvas/50"
                  >
                    {/* Timestamp */}
                    <td className="py-3 pr-4 text-xs">
                      <div className="font-medium text-ink">{formattedDate}</div>
                      <div className="text-[11px] text-muted">{formattedTime}</div>
                    </td>

                    {/* Item */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-ink">{tx.itemName || "Item"}</div>
                      {tx.notes && (
                        <div className="text-xs text-muted truncate max-w-xs" title={tx.notes}>
                          {tx.notes}
                        </div>
                      )}
                    </td>

                    {/* Movement Type */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                        {conf.isStockIn ? (
                          <ArrowDownLeft className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="size-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                        <span>{conf.label}</span>
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={cn(
                          "font-bold tabular-nums text-sm",
                          conf.isStockIn ? "text-emerald-700 dark:text-emerald-400" : "text-ink",
                        )}
                      >
                        {conf.isStockIn ? `+${tx.quantity}` : `-${tx.quantity}`}
                      </span>
                      <span className="ml-1 text-xs text-muted">
                        {tx.itemUnit || "units"}
                      </span>
                    </td>

                    {/* Balance After */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium tabular-nums text-ink text-xs">
                        {tx.balanceAfter}
                      </span>
                      <span className="ml-1 text-[11px] text-muted">
                        {tx.itemUnit || "units"}
                      </span>
                    </td>

                    {/* Destination / Purpose */}
                    <td className="py-3 px-4 text-xs">
                      {tx.roomName ? (
                        <div className="font-medium text-ink flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-accent" />
                          {tx.roomName}
                        </div>
                      ) : (
                        <div className="text-muted">Central Supply</div>
                      )}
                      {tx.recipientOrMinistry && (
                        <div className="text-[11px] text-muted truncate max-w-[200px]" title={tx.recipientOrMinistry}>
                          {tx.recipientOrMinistry}
                        </div>
                      )}
                    </td>

                    {/* Logged By */}
                    <td className="py-3 pl-4 text-xs text-muted">
                      {tx.createdByName || "Staff Admin"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
