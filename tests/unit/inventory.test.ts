import { describe, expect, it } from "vitest";
import { createDemoRepository } from "@/lib/demo/repository";
import {
  createInventoryItemService,
  updateInventoryItemService,
  archiveInventoryItemService,
  recordStockTransactionService,
  getInventoryReportsService,
} from "@/lib/services/inventory";
import { admin, member } from "./fakes";

describe("Inventory Consumables Service & Repository", () => {
  it("lists seeded inventory items with healthy, low, and out of stock levels", async () => {
    const repo = createDemoRepository();
    const items = await repo.listInventoryItems(false);

    expect(items.length).toBeGreaterThanOrEqual(10);
    const communionCups = items.find((i) => i.name.includes("Communion Cups"));
    expect(communionCups).toBeDefined();
    expect(communionCups?.category).toBe("communion");
    expect(communionCups?.currentStock).toBeLessThanOrEqual(communionCups!.reorderThreshold);

    const outOfStock = items.filter((i) => i.currentStock <= 0);
    expect(outOfStock.length).toBeGreaterThanOrEqual(1);
  });

  it("denies non-admin members from creating inventory items", async () => {
    const repo = createDemoRepository();
    const formData = new FormData();
    formData.set("name", "Test Item");
    formData.set("category", "av_tech");
    formData.set("unit", "pieces");
    formData.set("currentStock", "10");
    formData.set("reorderThreshold", "2");
    formData.set("location", "Booth");

    const result = await createInventoryItemService(formData, member, { repo });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("forbidden");
    }
  });

  it("validates inventory fields properly and creates an item for admins", async () => {
    const repo = createDemoRepository();
    const formData = new FormData();
    formData.set("name", "Gaffer Tape 2-inch Black");
    formData.set("category", "av_tech");
    formData.set("unit", "rolls");
    formData.set("currentStock", "6");
    formData.set("reorderThreshold", "3");
    formData.set("unitCost", "450.50");
    formData.set("location", "Stage Left Cabinet");

    const result = await createInventoryItemService(formData, admin, { repo });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const created = await repo.getInventoryItem(result.data.id);
      expect(created).toBeDefined();
      expect(created?.name).toBe("Gaffer Tape 2-inch Black");
      expect(created?.currentStock).toBe(6);
      expect(created?.unitCost).toBe(450.5);
      expect(created?.isArchived).toBe(false);
    }
  });

  it("updates inventory stock and thresholds for existing items", async () => {
    const repo = createDemoRepository();
    const items = await repo.listInventoryItems(false);
    const item = items[0];

    const formData = new FormData();
    formData.set("id", item.id);
    formData.set("name", item.name);
    formData.set("category", item.category);
    formData.set("unit", item.unit);
    formData.set("currentStock", "99");
    formData.set("reorderThreshold", "20");
    formData.set("location", "Updated Shelf 4B");

    const result = await updateInventoryItemService(formData, admin, { repo });
    expect(result.ok).toBe(true);

    const updated = await repo.getInventoryItem(item.id);
    expect(updated?.currentStock).toBe(99);
    expect(updated?.reorderThreshold).toBe(20);
    expect(updated?.location).toBe("Updated Shelf 4B");
  });

  it("archives an inventory item and excludes it from the active catalog", async () => {
    const repo = createDemoRepository();
    const items = await repo.listInventoryItems(false);
    const itemToArchive = items[items.length - 1];

    const result = await archiveInventoryItemService(itemToArchive.id, admin, { repo });
    expect(result.ok).toBe(true);

    const activeItems = await repo.listInventoryItems(false);
    expect(activeItems.some((i) => i.id === itemToArchive.id)).toBe(false);

    const allItems = await repo.listInventoryItems(true);
    expect(allItems.some((i) => i.id === itemToArchive.id && i.isArchived)).toBe(true);
  });

  it("records stock-in (restock) and updates the item balance atomically", async () => {
    const repo = createDemoRepository();
    const items = await repo.listInventoryItems(false);
    const item = items[0];
    const initialStock = item.currentStock;

    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("transactionType", "stock_in_restock");
    formData.set("quantity", "15");
    formData.set("recipientOrMinistry", "Direct Delivery Supplier");
    formData.set("notes", "Invoice #PO-8821");

    const result = await recordStockTransactionService(formData, admin, { repo });
    expect(result.ok).toBe(true);

    const updatedItem = await repo.getInventoryItem(item.id);
    expect(updatedItem?.currentStock).toBe(initialStock + 15);

    const txs = await repo.listInventoryTransactions({ itemId: item.id });
    expect(txs.length).toBeGreaterThanOrEqual(1);
    expect(txs[0].transactionType).toBe("stock_in_restock");
    expect(txs[0].quantity).toBe(15);
    expect(txs[0].balanceAfter).toBe(initialStock + 15);
  });

  it("records stock-out and prevents overdraft when quantity exceeds on-hand stock", async () => {
    const repo = createDemoRepository();
    const items = await repo.listInventoryItems(false);
    const item = items.find((i) => i.currentStock > 0)!;

    // Overdraft attempt
    const overdraftForm = new FormData();
    overdraftForm.set("itemId", item.id);
    overdraftForm.set("transactionType", "stock_out_ministry");
    overdraftForm.set("quantity", String(item.currentStock + 500));

    const overdraftResult = await recordStockTransactionService(overdraftForm, admin, { repo });
    expect(overdraftResult.ok).toBe(false);
    if (!overdraftResult.ok) {
      expect(overdraftResult.code).toBe("invalid");
    }

    // Valid stock out
    const validForm = new FormData();
    validForm.set("itemId", item.id);
    validForm.set("transactionType", "stock_out_ministry");
    validForm.set("quantity", "1");
    validForm.set("recipientOrMinistry", "Sunday School");

    const validResult = await recordStockTransactionService(validForm, admin, { repo });
    expect(validResult.ok).toBe(true);

    const afterItem = await repo.getInventoryItem(item.id);
    expect(afterItem?.currentStock).toBe(item.currentStock - 1);
  });

  it("generates aggregated inventory reports with movement trends and low stock warnings", async () => {
    const repo = createDemoRepository();
    const reportResult = await getInventoryReportsService(admin, { repo });

    expect(reportResult.ok).toBe(true);
    if (reportResult.ok) {
      const summary = reportResult.data;
      expect(summary.totalItems).toBeGreaterThanOrEqual(10);
      expect(summary.totalRestockedQuantity).toBeGreaterThan(0);
      expect(summary.totalConsumedQuantity).toBeGreaterThan(0);
      expect(summary.activeReorderWarnings.length).toBeGreaterThan(0);
      expect(summary.consumedByMinistry.length).toBeGreaterThan(0);
    }
  });
});
