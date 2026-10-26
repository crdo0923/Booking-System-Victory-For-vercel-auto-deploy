import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getAllRooms, getKioskDisplays } from "@/lib/data/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DisplaysManager } from "@/components/admin/displays-manager";

export const metadata: Metadata = {
  title: "Displays",
  description: "Manage door signs and lobby wall TV pairing tokens.",
};

export default async function AdminDisplaysPage() {
  await requireAdmin();

  const [displays, rooms] = await Promise.all([
    getKioskDisplays(),
    getAllRooms({ includeArchived: false }),
  ]);

  return (
    <div>
      <PageHeader
        variant="operational"
        title="Displays"
        description="Persistent pairing tokens for wall-mounted door tablets and lobby TV hub displays. No passwords required."
      />

      <DisplaysManager initialDisplays={displays} rooms={rooms} />
    </div>
  );
}
