"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import {
  Check,
  Clock,
  Download,
  Minus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";
import type {
  AuditLogEntry,
  PermissionDefinition,
  RolePermissionRow,
  SecurityModule,
} from "@/lib/data/types";
import { listAuditLogsAction } from "@/app/actions/audit";

interface SecurityAuditManagerProps {
  initialLogs: AuditLogEntry[];
  roleRows: RolePermissionRow[];
  permissionDefinitions: PermissionDefinition[];
}

export function SecurityAuditManager({
  initialLogs,
  roleRows,
  permissionDefinitions,
}: SecurityAuditManagerProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "audit">("matrix");
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [isPending, startTransition] = useTransition();

  // Filters for Audit Log
  const [moduleFilter, setModuleFilter] = useState<SecurityModule | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Group permission definitions by module
  const groupedDefinitions = useMemo(() => {
    const groups: Record<string, PermissionDefinition[]> = {};
    for (const def of permissionDefinitions) {
      groups[def.module] ??= [];
      groups[def.module].push(def);
    }
    return groups;
  }, [permissionDefinitions]);

  const moduleTitles: Record<SecurityModule, string> = {
    rooms: "Rooms & Physical Spaces",
    layouts: "Layouts & Floor Plans",
    bookings: "Reservations & Calendars",
    inventory: "Inventory & Consumables",
    assets: "Room Assets & Technical Equipment",
    displays: "Displays & Hall Tablets",
    auth_users: "User Access & Roles",
    security: "Audit & Security Governance",
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (moduleFilter !== "all" && log.module !== moduleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchActor =
          log.actorName.toLowerCase().includes(q) ||
          (log.actorEmail && log.actorEmail.toLowerCase().includes(q));
        const matchAction = log.action.toLowerCase().includes(q);
        const matchTarget = log.targetId ? log.targetId.toLowerCase().includes(q) : false;
        const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
        if (!matchActor && !matchAction && !matchTarget && !matchDetails) return false;
      }
      return true;
    });
  }, [logs, moduleFilter, searchQuery]);

  function refreshLogs() {
    startTransition(async () => {
      const res = await listAuditLogsAction({
        module: moduleFilter === "all" ? undefined : moduleFilter,
        limit: 200,
      });
      if (res.ok && res.data) {
        setLogs(res.data.logs);
      }
    });
  }

  function handleExportCsv() {
    const headers = ["Timestamp", "Actor Name", "Actor Email", "Role", "Module", "Action", "Target ID", "IP Address", "Details"];
    const rows = filteredLogs.map((l) => [
      l.createdAt,
      `"${l.actorName.replace(/"/g, '""')}"`,
      l.actorEmail ?? "",
      l.actorRole,
      l.module,
      l.action,
      l.targetId ?? "",
      l.ipAddress ?? "",
      l.details ? `"${JSON.stringify(l.details).replace(/"/g, '""')}"` : "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `victory_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Editorial Nav Tabs */}
      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "matrix"
              ? "border-primary text-ink"
              : "border-transparent text-muted hover:border-line hover:text-ink"
          }`}
        >
          <Shield className="size-4" />
          Roles & Permissions Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "audit"
              ? "border-primary text-ink"
              : "border-transparent text-muted hover:border-line hover:text-ink"
          }`}
        >
          <Clock className="size-4" />
          Audit Trail Log
          <span className="ml-1.5 rounded bg-sunken px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted">
            {logs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Roles & Permissions Matrix */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-canvas p-4 text-xs text-muted leading-relaxed">
            <p className="font-semibold text-ink mb-1">Church Authorization Architecture</p>
            Permissions are enforced at server boundary and database Row-Level Security policies (<code className="font-mono text-ink">app_member</code> role). Roles define functional responsibilities across ministry coordinators, facility caretakers, pastoral oversight, and church members.
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-canvas shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-sunken/60 text-muted">
                  <th className="py-3 px-4 font-semibold text-ink w-72">Functional Capability</th>
                  {roleRows.map((r) => (
                    <th key={r.role} className="py-3 px-3 text-center font-semibold text-ink">
                      <div>{r.roleLabel}</div>
                      <div className="font-normal text-[11px] text-muted">{r.role}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(Object.keys(groupedDefinitions) as SecurityModule[]).map((mod) => (
                  <Fragment key={mod}>
                    <tr>
                      <td colSpan={roleRows.length + 1} className="bg-sunken/40 py-2.5 px-4 font-semibold text-ink border-y border-line text-xs tracking-wider uppercase">
                        {moduleTitles[mod] || mod}
                      </td>
                    </tr>
                    {groupedDefinitions[mod]?.map((def) => (
                      <tr key={def.capability} className="hover:bg-sunken/20 transition-colors">
                        <td className="py-3 px-4 align-top">
                          <div className="font-medium text-ink">{def.label}</div>
                          <div className="text-[11px] text-muted mt-0.5 leading-snug">{def.description}</div>
                          <code className="mt-1 inline-block font-mono text-[10px] text-muted bg-sunken px-1 py-0.2 rounded border border-line">
                            {def.capability}
                          </code>
                        </td>
                        {roleRows.map((r) => {
                          const allowed = r.capabilities.includes(def.capability);
                          return (
                            <td key={r.role} className="py-3 px-3 text-center align-middle">
                              {allowed ? (
                                <span className="inline-flex items-center justify-center size-6 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="size-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center size-6 rounded text-muted/40">
                                  <Minus className="size-3.5" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Audit Trail Log */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
                <input
                  type="text"
                  placeholder="Filter by actor, action, details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-64 rounded-md border border-line bg-canvas pl-9 pr-3 text-xs placeholder:text-muted focus:border-ink focus:outline-none"
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value as SecurityModule | "all")}
                className="h-9 rounded-md border border-line bg-canvas px-3 text-xs text-ink focus:border-ink focus:outline-none"
              >
                <option value="all">All Modules</option>
                <option value="rooms">Rooms</option>
                <option value="layouts">Layouts</option>
                <option value="bookings">Bookings</option>
                <option value="inventory">Inventory</option>
                <option value="assets">Assets</option>
                <option value="displays">Displays</option>
                <option value="auth_users">Users</option>
                <option value="security">Security</option>
              </select>

              <button
                type="button"
                onClick={refreshLogs}
                disabled={isPending}
                className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-canvas px-3 text-xs font-medium text-ink transition-colors hover:bg-sunken disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-canvas px-3 text-xs font-medium text-ink transition-colors hover:bg-sunken"
              >
                <Download className="size-3.5 text-muted" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-canvas px-3 text-xs font-medium text-ink transition-colors hover:bg-sunken"
              >
                <Printer className="size-3.5 text-muted" />
                Print View
              </button>
            </div>
          </div>

          {/* Audit Ledger Table */}
          <div className="overflow-x-auto rounded-lg border border-line bg-canvas shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-sunken/60 text-muted">
                  <th className="py-3 px-4 font-semibold text-ink">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-ink">Actor</th>
                  <th className="py-3 px-4 font-semibold text-ink">Action</th>
                  <th className="py-3 px-4 font-semibold text-ink">Module</th>
                  <th className="py-3 px-4 font-semibold text-ink">Target / Context</th>
                  <th className="py-3 px-4 text-right font-semibold text-ink">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      No audit events match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-sunken/20 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] tabular-nums text-muted">
                        {new Date(entry.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-ink">{entry.actorName}</div>
                        <div className="font-mono text-[10px] text-muted">
                          {entry.actorEmail || entry.actorRole}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-medium text-[11px] px-1.5 py-0.5 rounded bg-sunken border border-line text-ink">
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap uppercase tracking-wider text-[10px] font-semibold text-muted">
                        {entry.module}
                      </td>
                      <td className="py-3 px-4 text-ink max-w-xs truncate">
                        {entry.targetId ? (
                          <span className="font-mono text-[11px] text-muted mr-1.5">{entry.targetId}</span>
                        ) : null}
                        {entry.details && typeof entry.details === "object" ? (
                          <span className="text-muted">
                            {String(
                              (entry.details as Record<string, unknown>).room ||
                              (entry.details as Record<string, unknown>).itemName ||
                              (entry.details as Record<string, unknown>).assetName ||
                              (entry.details as Record<string, unknown>).eventName ||
                              (entry.details as Record<string, unknown>).note ||
                              "",
                            )}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {entry.details ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLog(entry)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View metadata
                          </button>
                        ) : (
                          <span className="text-muted text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted px-1">
            <span>Showing {filteredLogs.length} of {logs.length} logged events</span>
            <span className="font-mono">Storage: audit_logs (Postgres + RLS)</span>
          </div>
        </div>
      )}

      {/* Metadata Detail Modal / Drawer */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-xl rounded-lg border border-line bg-canvas p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink">Audit Event Details</h3>
                <div className="font-mono text-xs text-muted mt-0.5">
                  ID: {selectedLog.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded p-1 text-muted hover:bg-sunken hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted block">Actor</span>
                <span className="font-medium text-ink">{selectedLog.actorName} ({selectedLog.actorRole})</span>
                {selectedLog.actorEmail && (
                  <span className="block text-muted text-[11px] font-mono">{selectedLog.actorEmail}</span>
                )}
              </div>
              <div>
                <span className="text-muted block">Timestamp</span>
                <span className="font-mono tabular-nums text-ink">{selectedLog.createdAt}</span>
              </div>
              <div>
                <span className="text-muted block">Action & Module</span>
                <span className="font-mono font-medium text-ink">{selectedLog.action}</span>
                <span className="text-muted text-[11px] block uppercase">{selectedLog.module}</span>
              </div>
              <div>
                <span className="text-muted block">Origin IP / Host</span>
                <span className="font-mono text-ink">{selectedLog.ipAddress || "Internal / System"}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-ink">Change Payload & Diff</span>
              <pre className="max-h-60 overflow-y-auto rounded border border-line bg-sunken p-3 font-mono text-[11px] text-ink leading-relaxed">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-md border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink hover:bg-sunken"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
