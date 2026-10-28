"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateItemRequestAction } from "@/app/actions/item-requests";
import type { ItemRequest, ItemRequestHistory } from "@/lib/data/types";

const formatDateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function ItemRequestManager({ initialRequests, history }: { initialRequests: ItemRequest[]; history: Record<string, ItemRequestHistory[]> }) {
  const [requests, setRequests] = useState(initialRequests);
  const [pending, startTransition] = useTransition();
  const update = (id: string, status: "approved" | "fulfilled" | "rejected") => startTransition(async () => {
    const result = await updateItemRequestAction({ id, status });
    if (!result.ok) { toast.error(result.error); return; }
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
    toast.success(result.message);
  });
  if (!requests.length) return <p className="mt-8 border-y border-line py-10 text-center text-sm text-muted">No item requests yet.</p>;
  return (
    <ul className="divide-y divide-line border-b border-line">
      {requests.map((request) => (
        <li key={request.id} className="grid gap-3 py-5 lg:grid-cols-[minmax(0,1fr)_8rem_auto] lg:items-center">
          <div>
            <p className="font-bold">{request.quantity} × {request.itemName} <span className="font-normal text-muted">({request.itemUnit})</span></p>
            <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-2">
              <div><dt className="font-semibold text-ink-soft">Requested by</dt><dd>{request.requesterName} · {request.requesterEmail}</dd></div>
              <div><dt className="font-semibold text-ink-soft">Requested</dt><dd><time dateTime={request.createdAt}>{formatDateTime(request.createdAt)}</time></dd></div>
              <div><dt className="font-semibold text-ink-soft">Event</dt><dd>{request.eventName}</dd></div>
              <div><dt className="font-semibold text-ink-soft">When &amp; where</dt><dd>{request.roomName} · <time dateTime={request.eventStartTime}>{formatDateTime(request.eventStartTime)}</time>–<time dateTime={request.eventEndTime}>{new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(request.eventEndTime))}</time></dd></div>
            </dl>
            {request.notes && <p className="mt-2 text-sm text-ink-soft">{request.notes}</p>}
            {(history[request.id] ?? []).length > 0 && <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer font-semibold">History</summary><ul className="mt-2 space-y-1">{history[request.id].map((event) => <li key={event.id}>{event.fromStatus ?? "new"} → {event.toStatus}{event.note ? ` · ${event.note}` : ""}</li>)}</ul></details>}
          </div>
          <span className="eyebrow text-muted">{request.status}</span>
          <div className="flex flex-wrap gap-2">
            {request.status === "submitted" && <><button disabled={pending} onClick={() => update(request.id, "approved")} className="rounded-md bg-brand px-3 py-2 text-xs font-bold text-white">Approve</button><button disabled={pending} onClick={() => update(request.id, "rejected")} className="rounded-md border border-line px-3 py-2 text-xs font-bold">Reject</button></>}
            {request.status === "approved" && <button disabled={pending} onClick={() => update(request.id, "fulfilled")} className="rounded-md bg-brand px-3 py-2 text-xs font-bold text-white">Mark fulfilled</button>}
          </div>
        </li>
      ))}
    </ul>
  );
}
