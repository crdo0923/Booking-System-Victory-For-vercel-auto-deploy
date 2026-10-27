import type { SessionUser } from "@/lib/auth/provider";
import type { Repository } from "@/lib/data/repository";
import type { AuditLogEntry, AuditLogFilter, CreateAuditLogInput } from "@/lib/data/types";
import { failure, success, type ServiceResult } from "@/lib/services/result";

export interface AuditDeps {
  repo: Repository;
}

/**
 * High-level audit recording helper. Never throws - failures to log an audit event
 * are logged to console.error so business transactions aren't broken by audit telemetry.
 */
export async function logAuditEvent(
  repo: Repository,
  input: CreateAuditLogInput,
): Promise<AuditLogEntry | null> {
  try {
    return await repo.recordAuditLog(input);
  } catch (error) {
    console.error("[audit] Failed to record audit log entry:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Service to query audit logs. Requires active admin privileges.
 */
export async function listAuditLogsService(
  filter: AuditLogFilter | undefined,
  actor: SessionUser | null,
  deps: AuditDeps,
): Promise<ServiceResult<{ logs: AuditLogEntry[] }>> {
  if (!actor) {
    return failure("unauthenticated", "Your session has expired. Please sign in again.");
  }
  if (actor.role !== "admin" || actor.accessStatus !== "active") {
    return failure("forbidden", "Only administrators can view the security audit trail.");
  }

  try {
    const logs = await deps.repo.listAuditLogs(filter);
    return success({ logs }, "Audit logs retrieved successfully.");
  } catch (error) {
    console.error("[audit] Failed to list audit logs:", error);
    return failure("unknown", "Could not retrieve audit logs.");
  }
}
