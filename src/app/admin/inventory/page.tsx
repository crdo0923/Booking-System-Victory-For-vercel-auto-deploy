import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getActiveRooms, getInventoryItems, getInventoryReportSummary, getInventoryTransactions } from "@/lib/data/queries";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryManager } from "@/components/admin/inventory-manager";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage church consumables, stock in/out movements, and stewardship reports.",
};

export default async function AdminInventoryPage() {
  await requireAdmin();

  const [items, transactions, summary, rooms] = await Promise.all([
    getInventoryItems(false),
    getInventoryTransactions(),
    getInventoryReportSummary(),
    getActiveRooms(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        variant="operational"
        title="Inventory & Resource Stewardship"
        description="Master consumables catalog, stock in/out movement ledger, and church-wide consumption reports."
      />

      <InventoryManager
        initialItems={items}
        initialTransactions={transactions}
        initialSummary={summary}
        rooms={rooms}
      />
    </div>
  );
}
