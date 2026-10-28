"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Monitor, Plus, PowerOff, Tablet } from "lucide-react";
import type { KioskDisplay, KioskDisplayType, Room } from "@/lib/data/types";
import { createDisplayAction, revokeDisplayAction } from "@/app/actions/displays";
import { formatDate } from "@/lib/domain/time";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusMark } from "@/components/ui/status";

interface DisplaysManagerProps {
  initialDisplays: KioskDisplay[];
  rooms: Room[];
}

export function DisplaysManager({ initialDisplays, rooms }: DisplaysManagerProps) {
  const [displays, setDisplays] = useState<KioskDisplay[]>(initialDisplays);
  const [isPending, startTransition] = useTransition();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state for creating new pairing
  const [label, setLabel] = useState("");
  const [displayType, setDisplayType] = useState<KioskDisplayType>("door_sign");
  const [roomId, setRoomId] = useState<string>(rooms[0]?.id || "");
  const [formError, setFormError] = useState<string | null>(null);

  function getDisplayUrl(display: KioskDisplay) {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    if (display.displayType === "door_sign") {
      const room = rooms.find((r) => r.id === display.roomId);
      const slug = room ? room.slug : "room-a";
      return `${origin}/display/rooms/${slug}?token=${display.token}`;
    }
    return `${origin}/display/hub?token=${display.token}`;
  }

  function handleCopy(display: KioskDisplay) {
    const url = getDisplayUrl(display);
    navigator.clipboard.writeText(url);
    setCopiedToken(display.token);
    setTimeout(() => {
      setCopiedToken((curr) => (curr === display.token ? null : curr));
    }, 2000);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const res = await createDisplayAction({
        label,
        displayType,
        roomId: displayType === "door_sign" ? roomId : null,
      });

      if (!res.ok || !res.display) {
        setFormError(res.error || "Failed to create display pairing.");
        return;
      }

      setDisplays((prev) => [res.display!, ...prev]);
      setLabel("");
      setDisplayType("door_sign");
      setRoomId(rooms[0]?.id || "");
    });
  }

  function handleRevoke(id: string) {
    if (!confirm("Revoke this display token? The paired screen will immediately stop loading.")) {
      return;
    }

    startTransition(async () => {
      const res = await revokeDisplayAction(id);
      if (res.ok) {
        setDisplays((prev) =>
          prev.map((d) => (d.id === id ? { ...d, isActive: false } : d)),
        );
      }
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Left Column: Registered Displays List */}
      <section aria-labelledby="displays-list-heading" className="min-w-0">
        <h2 id="displays-list-heading" className="sr-only">
          Registered Displays
        </h2>

        {displays.length === 0 ? (
          <EmptyState
            title="No paired displays"
            description="Register a door tablet or lobby TV hub using the pairing form."
          />
        ) : (
          <ol className="divide-y divide-line border-b border-line">
            {displays.map((display) => {
              const room = rooms.find((r) => r.id === display.roomId);
              const isCopied = copiedToken === display.token;
              const isDoor = display.displayType === "door_sign";

              return (
                <li
                  key={display.id}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Clean Minimal Icon (no circle pill, no background wrap) */}
                    <div className="mt-1 shrink-0 text-ink">
                      {isDoor ? (
                        <Tablet className="size-5 text-muted" aria-hidden />
                      ) : (
                        <Monitor className="size-5 text-muted" aria-hidden />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-ink">
                          {display.label}
                        </h3>
                        <StatusMark
                          tone={display.isActive ? "approved" : "cancelled"}
                          label={display.isActive ? "Active" : "Revoked"}
                        />
                      </div>

                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-semibold text-ink">
                          {isDoor ? "Door Sign Tablet" : "Lobby TV Hub"}
                        </span>
                        {isDoor && room && (
                          <>
                            {" "}· Assigned: <strong className="font-medium text-ink">{room.name}</strong> ({room.locationLabel})
                          </>
                        )}
                      </p>

                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
                        <span>
                          Created: {formatDate(display.createdAt, "d MMM yyyy")}
                        </span>
                        <span>
                          Last sync:{" "}
                          {display.lastSeenAt
                            ? formatDate(display.lastSeenAt, "d MMM yyyy, h:mm a")
                            : "Never"}
                        </span>
                        <span className="font-mono text-[11px] text-muted">
                          {display.token.substring(0, 14)}…
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {display.isActive ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopy(display)}
                          className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-sunken hover:text-ink active:scale-[0.98]"
                        >
                          {isCopied ? (
                            <>
                              <Check className="size-3.5 text-approved" />
                              <span>URL Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5 text-muted" />
                              <span>Copy URL</span>
                            </>
                          )}
                        </button>
                        <a
                          href={getDisplayUrl(display)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-8 items-center justify-center rounded-sm border border-line bg-canvas text-muted hover:text-ink hover:bg-sunken transition-colors"
                          title="Open display fullscreen"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRevoke(display.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-denied hover:underline disabled:opacity-50 ml-2"
                        >
                          <PowerOff className="size-3" />
                          Revoke
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-muted italic">Revoked</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Right Column: Clean Pair Display Form (Standard victory sidebar panel) */}
      <section aria-labelledby="pair-display-heading" className="lg:sticky lg:top-8 lg:self-start">
        <h2 id="pair-display-heading" className="border-b border-ink pb-2.5 text-[15px] font-extrabold text-ink">
          Pair new display
        </h2>

        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          {formError && (
            <div className="rounded-sm border border-denied/30 bg-denied/10 p-3 text-xs font-medium text-denied">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="display-label" className="block text-xs font-bold text-muted uppercase tracking-wider">
              Display Name / Location
            </label>
            <input
              id="display-label"
              type="text"
              required
              placeholder="e.g. Main Sanctuary East Door"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1.5 w-full rounded-sm border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider">
              Display Format
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDisplayType("door_sign")}
                className={`flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition-colors ${
                  displayType === "door_sign"
                    ? "border-brand bg-brand/5 text-ink font-bold"
                    : "border-line bg-canvas text-muted hover:border-ink/30"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Tablet className="size-4 text-brand" />
                  <span className="text-xs font-bold text-ink">Door Sign</span>
                </div>
                <span className="text-[11px] text-muted">10&quot; Wall tablet</span>
              </button>

              <button
                type="button"
                onClick={() => setDisplayType("lobby_hub")}
                className={`flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition-colors ${
                  displayType === "lobby_hub"
                    ? "border-brand bg-brand/5 text-ink font-bold"
                    : "border-line bg-canvas text-muted hover:border-ink/30"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Monitor className="size-4 text-brand" />
                  <span className="text-xs font-bold text-ink">Lobby Hub</span>
                </div>
                <span className="text-[11px] text-muted">50&quot;+ TV Display</span>
              </button>
            </div>
          </div>

          {displayType === "door_sign" && (
            <div>
              <label htmlFor="assigned-room" className="block text-xs font-bold text-muted uppercase tracking-wider">
                Assigned Room
              </label>
              <select
                id="assigned-room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.locationLabel})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="size-4" />
              {isPending ? "Generating..." : "Generate Pairing Token"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
