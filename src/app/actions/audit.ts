"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { AuditLogFilter } from "@/lib/data/types";
import { listAuditLogsService } from "@/lib/services/audit";

export async function listAuditLogsAction(filter?: AuditLogFilter) {
  const [actor, repo] = await Promise.all([getCurrentUser(), getRepository()]);
  return listAuditLogsService(filter, actor, { repo });
}
