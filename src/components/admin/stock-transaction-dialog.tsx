"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import type { InventoryItem, InventoryTransactionType, Room } from "@/lib/data/types";
import { INVENTORY_TRANSACTION_TYPES } from "@/lib/validation/inventory";
import {
  recordStockTransactionAction,
  type InventoryActionState,
} from "@/app/actions/inventory";

interface StockTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  rooms: Room[];
  initialItemId?: string | null;
  initialType?: InventoryTransactionType;
  onSuccess?: () => void;
}

const TRANSACTION_TYPE_LABELS: Record<(typeof INVENTORY_TRANSACTION_TYPES)[number], { label: string; description: string }> = {
  stock_in_restock: {
    label: "Stock In · Restock & Delivery",
    description: "Receive new supply shipment or replenishment into central inventory.",
  },
  stock_out_ministry: {
    label: "Stock Out · Ministry / Service Requisition",
    description: "Dispense items for Sunday services, youth ministry, or departmental use.",
  },
  stock_out_booking: {
    label: "Stock Out · Room Booking / Event",
    description: "Consume items dedicated to an approved room booking or church gathering.",
  },
  adjustment_loss_waste: {
    label: "Stock Out · Waste, Damage or Expiry",
    description: "Write off broken items, spoiled hospitality stock, or damaged cords.",
  },
};

export function StockTransactionDialog({
  open,
  onOpenChange,
  items,
  rooms,
  initialItemId,
  initialType = "stock_in_restock",
  onSuccess,
}: StockTransactionDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemId || items[0]?.id || "");
  const [txType, setTxType] = useState<InventoryTransactionType>(initialType);
  const [quantity, setQuantity] = useState<number>(1);
  const [state, formAction, isPending] = useActionState<InventoryActionState, FormData>(
    recordStockTransactionAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (initialItemId) {
      setTimeout(() => setSelectedItemId(initialItemId), 0);
    } else if (!selectedItemId && items.length > 0) {
      setTimeout(() => setSelectedItemId(items[0].id), 0);
    }
  }, [initialItemId, items, selectedItemId]);

  useEffect(() => {
    if (initialType) {
      setTimeout(() => setTxType(initialType), 0);
    }
  }, [initialType]);

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      onSuccess?.();
      setTimeout(() => setQuantity(1), 0);
    }
  }, [state, onOpenChange, onSuccess]);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const isStockIn = txType === "stock_in_restock";
  const projectedBalance = selectedItem
    ? isStockIn
      ? selectedItem.currentStock + (Number(quantity) || 0)
      : Math.max(0, selectedItem.currentStock - (Number(quantity) || 0))
    : 0;

  const isOverdraft = !isStockIn && selectedItem && Number(quantity) > selectedItem.currentStock;

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={isStockIn ? "Record Stock In (Restock)" : "Record Stock Out (Requisition)"}
      description="Maintain transparent accountability of church materials across services, rooms, and ministries."
      size="md"
    >
      <form ref={formRef} action={formAction} className="space-y-4">
        {state && !state.ok && (
          <Notice tone="error" title="Action failed">
            {state.error}
          </Notice>
        )}

        {/* Item Selection */}
        <Field
          id="stock-tx-item"
          label="Consumable Item"
          error={state && !state.ok ? state.fieldErrors?.itemId : undefined}
        >
          <Select
            id="stock-tx-item"
            name="itemId"
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            disabled={isPending}
            className="w-full"
            required
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (Current: {i.currentStock} {i.unit}) · {i.location}
              </option>
            ))}
          </Select>
        </Field>

        {/* Transaction Type */}
        <Field
          id="stock-tx-type"
          label="Movement Reason / Flow"
          error={state && !state.ok ? state.fieldErrors?.transactionType : undefined}
        >
          <Select
            id="stock-tx-type"
            name="transactionType"
            value={txType}
            onChange={(e) => setTxType(e.target.value as InventoryTransactionType)}
            disabled={isPending}
            className="w-full"
            required
          >
            {INVENTORY_TRANSACTION_TYPES.map((typeKey) => (
              <option key={typeKey} value={typeKey}>
                {TRANSACTION_TYPE_LABELS[typeKey].label}
              </option>
            ))}
          </Select>
          <div className="mt-1 text-xs text-muted">
            {TRANSACTION_TYPE_LABELS[txType]?.description}
          </div>
        </Field>

        {/* Quantity & Balance Projection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <Field
            id="stock-tx-quantity"
            label={`Quantity (${selectedItem?.unit || "units"})`}
            error={state && !state.ok ? state.fieldErrors?.quantity : undefined}
          >
            <Input
              id="stock-tx-quantity"
              name="quantity"
              type="number"
              min={1}
              max={10000}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={isPending}
              required
            />
          </Field>

          {selectedItem && (
            <div className="p-2.5 rounded border border-line bg-canvas/60 text-xs">
              <div className="text-muted flex justify-between">
                <span>Current Stock:</span>
                <span className="font-medium text-ink tabular-nums">
                  {selectedItem.currentStock} {selectedItem.unit}
                </span>
              </div>
              <div className="text-muted flex justify-between mt-1">
                <span>Projected Balance:</span>
                <span
                  className={`font-bold tabular-nums ${
                    isOverdraft ? "text-rose-700 dark:text-rose-400" : "text-ink"
                  }`}
                >
                  {projectedBalance} {selectedItem.unit}
                </span>
              </div>
            </div>
          )}
        </div>

        {isOverdraft && (
          <div className="text-xs text-rose-700 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-900/40">
            Warning: The requested quantity exceeds the current stock on hand.
          </div>
        )}

        {/* Room Link (Optional / Contextual) */}
        <Field
          id="stock-tx-room"
          label="Assigned Room / Venue"
          hint="Link this distribution to a specific room or hall, if applicable."
          optional
          error={state && !state.ok ? state.fieldErrors?.roomId : undefined}
        >
          <Select
            id="stock-tx-room"
            name="roomId"
            defaultValue=""
            disabled={isPending}
            className="w-full"
          >
            <option value="">None / Central Storage</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.locationLabel})
              </option>
            ))}
          </Select>
        </Field>

        {/* Recipient / Ministry */}
        <Field
          id="stock-tx-recipient"
          label="Recipient Ministry, Event or Vendor"
          hint={isStockIn ? "e.g., Central Supply Vendor, Direct Donation" : "e.g., Music Ministry, Kids Church, Sunday 10AM Service"}
          optional
          error={state && !state.ok ? state.fieldErrors?.recipientOrMinistry : undefined}
        >
          <Input
            id="stock-tx-recipient"
            name="recipientOrMinistry"
            placeholder={isStockIn ? "Vendor name or supplier" : "Ministry or volunteer leader"}
            disabled={isPending}
          />
        </Field>

        {/* Notes */}
        <Field
          id="stock-tx-notes"
          label="Ledger Notes & Reference"
          hint="Delivery receipt #, purpose of use, or notes."
          optional
          error={state && !state.ok ? state.fieldErrors?.notes : undefined}
        >
          <Textarea
            id="stock-tx-notes"
            name="notes"
            rows={2}
            placeholder="Add relevant notes or PO / invoice numbers..."
            disabled={isPending}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button
            type="button"
            variant="quiet"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || Boolean(isOverdraft)}
          >
            {isPending ? "Recording..." : isStockIn ? "Confirm Restock" : "Confirm Stock Out"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
