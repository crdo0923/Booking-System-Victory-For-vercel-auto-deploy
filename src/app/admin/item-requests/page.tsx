import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getRepositoryForRequest } from "@/lib/data/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ItemRequestManager } from "@/components/admin/item-request-manager";

export const metadata: Metadata = { title: "Item requests" };

export default async function AdminItemRequestsPage() {
  await requireAdmin();
  const repo = await getRepositoryForRequest();
  const requests = await repo.listItemRequests();
  const historyEntries = await Promise.all(requests.map(async (request) => [request.id, await repo.listItemRequestHistory(request.id)] as const));
  return <div><PageHeader variant="operational" title="Room setup requests" description="Review requested chairs, equipment, and supplies, then track readiness through return." /><ItemRequestManager initialRequests={requests} history={Object.fromEntries(historyEntries)} /></div>;
}
