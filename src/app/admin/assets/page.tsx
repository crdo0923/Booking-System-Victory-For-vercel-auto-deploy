import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getActiveRooms, getAssetMovements, getRoomAssets } from "@/lib/data/queries";
import { PageHeader } from "@/components/ui/page-header";
import { AssetManager } from "@/components/admin/asset-manager";

export const metadata: Metadata = {
  title: "Room Assets & Movements",
  description: "Track church equipment, fixed installations, movable gear, and inter-room transfers.",
};

export default async function AdminAssetsPage() {
  await requireAdmin();

  const [assets, movements, rooms] = await Promise.all([
    getRoomAssets({ includeArchived: false }),
    getAssetMovements(),
    getActiveRooms(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        variant="operational"
        title="Room Assets & Physical Resources"
        description="Comprehensive inventory of fixed room fixtures and movable ministry gear with inter-room transfer tracking."
      />

      <AssetManager
        initialAssets={assets}
        initialMovements={movements}
        rooms={rooms}
      />
    </div>
  );
}
