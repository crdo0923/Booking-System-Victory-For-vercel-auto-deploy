"use client";

import { useActionState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import type { InventoryItem } from "@/lib/data/types";
import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from "@/lib/validation/inventory";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
  type InventoryActionState,
} from "@/app/actions/inventory";

interface InventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSuccess?: () => void;
}

const CATEGORY_LABELS: Record<(typeof INVENTORY_CATEGORIES)[number], string> = {
  communion: "Communion Elements",
  av_tech: "AV & Production Tech",
  hospitality: "Hospitality & Cafe",
  paper_office: "Office & Paper Supplies",
  cleaning: "Sanitation & Janitorial",
};

const UNIT_LABELS: Record<(typeof INVENTORY_UNITS)[number], string> = {
  pieces: "Pieces (pcs)",
  boxes: "Boxes (box)",
  packs: "Packs (pack)",
  rolls: "Rolls (roll)",
  bottles: "Bottles (btl)",
};

export function InventoryItemDialog({ open, onOpenChange, item, onSuccess }: InventoryItemDialogProps) {
  const isEditing = Boolean(item);
  const action = isEditing ? updateInventoryItemAction : createInventoryItemAction;
  const [state, formAction, isPending] = useActionState<InventoryActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      onSuccess?.();
    }
  }, [state, onOpenChange, onSuccess]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      locked={isPending}
      title={isEditing ? "Edit Consumable Item" : "Add Consumable Item"}
      description="Track ministry supplies, storage locations, stock balances, and automatic reorder warnings."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="inventory-form"
            variant="primary"
            busy={isPending}
            busyLabel={isEditing ? "Saving..." : "Adding..."}
          >
            {isEditing ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      }
    >
      <form id="inventory-form" ref={formRef} action={formAction} className="space-y-4">
        {isEditing && item ? <input type="hidden" name="id" value={item.id} /> : null}

        <Field id="inv-name" label="Item Name" error={errors.name}>
          <Input
            id="inv-name"
            name="name"
            defaultValue={item?.name ?? ""}
            placeholder="e.g. Communion Cups (Box of 500)"
            required
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="inv-category" label="Category" error={errors.category}>
            <Select
              id="inv-category"
              name="category"
              defaultValue={item?.category ?? "communion"}
              required
            >
              {INVENTORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </Select>
          </Field>

          <Field id="inv-unit" label="Unit of Measure" error={errors.unit}>
            <Select
              id="inv-unit"
              name="unit"
              defaultValue={item?.unit ?? "boxes"}
              required
            >
              {INVENTORY_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {UNIT_LABELS[unit]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id="inv-stock" label="Current Stock" error={errors.currentStock}>
            <Input
              id="inv-stock"
              name="currentStock"
              type="number"
              min="0"
              step="1"
              defaultValue={item?.currentStock ?? 0}
              required
              className="tabular-nums"
            />
          </Field>

          <Field id="inv-reorder" label="Reorder Threshold" error={errors.reorderThreshold}>
            <Input
              id="inv-reorder"
              name="reorderThreshold"
              type="number"
              min="0"
              step="1"
              defaultValue={item?.reorderThreshold ?? 5}
              required
              className="tabular-nums"
            />
          </Field>

          <Field id="inv-cost" label="Unit Cost (PHP)" optional error={errors.unitCost}>
            <Input
              id="inv-cost"
              name="unitCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={item?.unitCost ?? ""}
              placeholder="0.00"
              className="tabular-nums"
            />
          </Field>
        </div>

        <Field id="inv-location" label="Storage Location" error={errors.location}>
          <Input
            id="inv-location"
            name="location"
            defaultValue={item?.location ?? ""}
            placeholder="e.g. Sacristy Cabinet 2, Tech Booth Drawer A"
            required
            aria-invalid={Boolean(errors.location)}
          />
        </Field>

        {state && !state.ok ? (
          <Notice tone="error">{state.error ?? "Failed to save item."}</Notice>
        ) : null}
      </form>
    </Dialog>
  );
}
