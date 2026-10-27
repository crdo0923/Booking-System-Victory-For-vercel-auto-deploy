import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getInventoryItems } from "@/lib/data/queries";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryManager } from "@/components/admin/inventory-manager";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage church consumables, stock levels, and automatic reorder thresholds.",
};

export default async function AdminInventoryPage() {
  await requireAdmin();

  const items = await getInventoryItems(false);

  return (
    <div className="space-y-6">
      <PageHeader
        variant="operational"
        title="Consumables Catalog"
        description="Master inventory of communion elements, AV batteries, hospitality supplies, and sanitation items with reorder triggers."
      />

      <InventoryManager initialItems={items} />
    </div>
  );
}
