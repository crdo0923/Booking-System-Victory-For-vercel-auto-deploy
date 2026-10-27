import { getRepository } from "@/lib/data";
import { reviewShuttleAction } from "@/app/actions/shuttles";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/domain/time";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusMark } from "@/components/ui/status";

const statusLabels = {
  pending: "Pending review",
  approved: "Approved",
  denied: "Denied",
} as const;

export default async function AdminShuttlesPage() {
  await requireAdmin();
  const repo = await getRepository();
  const [requests, drivers, summary] = await Promise.all([repo.listShuttleRequests(), repo.listShuttleDrivers(), repo.getShuttleCostSummary()]);

  return (
    <div>
      <PageHeader
        variant="operational"
        eyebrow="Transport"
        title="Shuttle requests"
        description={`Approved trips: ${summary.approvedCount} · Estimated PHP ${summary.estimated.toFixed(2)} · Final PHP ${summary.final.toFixed(2)}`}
      />

      {requests.length > 0 ? (
        <div className="overflow-x-auto border-y border-line">
          <table className="w-full min-w-[1060px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="py-3 pr-5 font-bold text-muted">Requester</th>
                <th scope="col" className="py-3 pr-5 font-bold text-muted">Route</th>
                <th scope="col" className="py-3 pr-5 font-bold text-muted">Dates / time</th>
                <th scope="col" className="py-3 pr-5 font-bold text-muted">People</th>
                <th scope="col" className="py-3 pr-5 font-bold text-muted">Estimated</th>
                <th scope="col" className="py-3 pr-5 font-bold text-muted">Status</th>
                <th scope="col" className="py-3 font-bold text-muted">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((request) => (
                <tr key={request.id} className="align-top transition-colors hover:bg-sunken/40">
                  <td className="py-5 pr-5">
                    <p className="font-bold text-ink">{request.requester.fullName}</p>
                    <p className="mt-1 text-xs text-muted">{request.requester.email}</p>
                  </td>
                  <td className="py-5 pr-5">
                    <p className="font-extrabold whitespace-nowrap">{request.origin} <span className="font-normal text-muted">to</span> {request.destination}</p>
                    <p className="mt-1 max-w-48 text-xs leading-relaxed text-muted">{request.purpose}</p>
                  </td>
                  <td className="py-5 pr-5">
                    <p className="max-w-36 font-semibold text-ink-soft">{request.dates.map((date) => formatDate(date, "d MMM")).join(", ")}</p>
                    <p className="mt-1 tabular-nums text-muted">{request.departureTime}{request.arrivalTime ? `–${request.arrivalTime}` : ""}</p>
                  </td>
                  <td className="py-5 pr-5 font-semibold text-ink-soft">{request.passengerCount}</td>
                  <td className="py-5 pr-5 whitespace-nowrap font-semibold text-ink-soft">
                    PHP {(request.estimatedGas + request.estimatedToll + request.estimatedOther).toFixed(2)}
                  </td>
                  <td className="py-5 pr-5">
                    <StatusMark tone={request.status} label={statusLabels[request.status]} />
                    {request.driver && <p className="mt-2 text-xs text-muted">Driver · {request.driver.fullName}</p>}
                  </td>
                  <td className="py-5">
                    {request.status === "pending" ? (
                      <details className="group min-w-56">
                        <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center rounded-md border border-line-strong bg-surface px-3 text-sm font-bold text-ink-soft transition-colors hover:border-ink/40 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand group-open:border-ink/40 group-open:bg-sunken group-open:text-ink">
                          Review request
                        </summary>
                        <form action={reviewShuttleAction} className="mt-4 space-y-3">
                          <input type="hidden" name="id" value={request.id} />
                          <Field id={`driver-${request.id}`} label="Driver" optional>
                            <Select id={`driver-${request.id}`} name="driverId" defaultValue="">
                              <option value="">No driver assigned</option>
                              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
                            </Select>
                          </Field>
                          <div className="grid grid-cols-3 gap-2">
                            <Field id={`finalGas-${request.id}`} label="Gas" optional>
                              <Input id={`finalGas-${request.id}`} name="finalGas" type="number" min="0" step="0.01" placeholder="PHP" />
                            </Field>
                            <Field id={`finalToll-${request.id}`} label="Toll" optional>
                              <Input id={`finalToll-${request.id}`} name="finalToll" type="number" min="0" step="0.01" placeholder="PHP" />
                            </Field>
                            <Field id={`finalOther-${request.id}`} label="Other" optional>
                              <Input id={`finalOther-${request.id}`} name="finalOther" type="number" min="0" step="0.01" placeholder="PHP" />
                            </Field>
                          </div>
                          <Field id={`denialReason-${request.id}`} label="Reason if denied" optional>
                            <Input id={`denialReason-${request.id}`} name="denialReason" placeholder="Optional reason" />
                          </Field>
                          <div className="flex gap-2 pt-1">
                            <Button type="submit" name="status" value="approved" size="sm">Approve</Button>
                            <Button type="submit" name="status" value="denied" variant="secondary" size="sm">Deny</Button>
                          </div>
                        </form>
                      </details>
                    ) : (
                      <span className="text-xs text-muted">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No shuttle requests" description="Member transport requests will appear here for review." />
      )}
    </div>
  );
}
