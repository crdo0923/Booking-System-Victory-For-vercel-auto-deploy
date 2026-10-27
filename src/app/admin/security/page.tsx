import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getAuditLogs } from "@/lib/data/queries";
import { getRolePermissionRows, PERMISSION_DEFINITIONS } from "@/lib/domain/security-matrix";
import { PageHeader } from "@/components/ui/page-header";
import { SecurityAuditManager } from "@/components/admin/security-audit-manager";

export const metadata: Metadata = {
  title: "Security & Audit Trail",
  description: "Roles & permissions matrix and comprehensive system-wide audit logging for Victory room reservation.",
};

export default async function AdminSecurityPage() {
  await requireAdmin();

  const [initialLogs] = await Promise.all([
    getAuditLogs({ limit: 150 }),
  ]);

  const roleRows = getRolePermissionRows();

  return (
    <div className="space-y-6">
      <PageHeader
        variant="operational"
        title="Security & System Audit"
        description="Inspect the church role-based permission matrix and trace all operational events across rooms, bookings, displays, inventory, and assets."
      />

      <SecurityAuditManager
        initialLogs={initialLogs}
        roleRows={roleRows}
        permissionDefinitions={PERMISSION_DEFINITIONS}
      />
    </div>
  );
}
