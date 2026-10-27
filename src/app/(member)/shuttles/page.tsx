import type { Metadata } from "next";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/session";
import { getRepositoryForRequest } from "@/lib/data/queries";
import { requestShuttleAction } from "@/app/actions/shuttles";
import { formatDate } from "@/lib/domain/time";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusMark } from "@/components/ui/status";
import { ShuttleDatePicker } from "@/components/shuttles/shuttle-date-picker";

const timeOptions = Array.from({ length: 33 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export const metadata: Metadata = { title: "Shuttle requests" };

function ShuttleStatus({ status }: { status: "pending" | "approved" | "denied" }) {
  const labels = {
    pending: "Pending review",
    approved: "Approved",
    denied: "Denied",
  } as const;

  return <StatusMark tone={status} label={labels[status]} />;
}

export default async function ShuttlesPage() {
  const user = await requireUser();
  const requests = await (await getRepositoryForRequest()).listShuttleRequestsForUser(user.id);
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div>
      <PageHeader
        eyebrow="Transport"
        title="Request a shuttle"
        description="Submit one or more travel dates for office review."
      />

      <section aria-labelledby="shuttle-request-heading" className="border-t border-ink pt-8">
        <div className="max-w-2xl">
          <h2 id="shuttle-request-heading" className="text-lg font-extrabold">
            Trip details
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Include the route, schedule, passenger count, and your estimated costs.
          </p>
        </div>

        <form action={requestShuttleAction} className="mt-7 w-full">
          <div className="grid gap-8 lg:grid-cols-[minmax(22rem,0.85fr)_minmax(34rem,1.15fr)]">
            <div className="max-w-none">
              <Field id="travel-date" label="Travel dates" hint="Select one or more dates from the calendar.">
                <ShuttleDatePicker today={today} />
              </Field>
            </div>

            <div className="rounded-lg bg-surface p-5 shadow-[0_0_0_1px_var(--color-line),0_12px_32px_-24px_rgb(22_24_29/0.4)] sm:p-6">
              <h3 className="text-lg font-extrabold">Your request</h3>
              <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field id="origin" label="Origin">
                  <Input id="origin" name="origin" required />
                </Field>
                <Field id="destination" label="Destination">
                  <Input id="destination" name="destination" required />
                </Field>
                <Field id="departureTime" label="Departure">
                  <Select id="departureTime" name="departureTime" defaultValue="" required>
                    <option value="" disabled>Choose a time…</option>
                    {timeOptions.map((value) => <option key={value} value={value}>{timeLabel(value)}</option>)}
                  </Select>
                </Field>
                <Field id="arrivalTime" label="Arrival" optional>
                  <Select id="arrivalTime" name="arrivalTime" defaultValue="">
                    <option value="">Not specified</option>
                    {timeOptions.map((value) => <option key={value} value={value}>{timeLabel(value)}</option>)}
                  </Select>
                </Field>
                <Field id="passengerCount" label="Passengers">
                  <Input id="passengerCount" name="passengerCount" type="number" min="1" required placeholder="Number of passengers" />
                </Field>
                <Field id="purpose" label="Purpose">
                  <Input id="purpose" name="purpose" required />
                </Field>
                <div className="border-t border-line pt-5">
                  <p className="text-[13px] font-bold text-ink">Estimated costs <span className="font-semibold text-muted">· Optional</span></p>
                  <p className="mt-1 text-[13px] text-muted">For office planning only.</p>
                </div>
                <div className="hidden sm:block" aria-hidden />
                <Field id="estimatedGas" label="Gas (PHP)" optional>
                  <Input id="estimatedGas" name="estimatedGas" type="number" min="0" step="0.01" placeholder="Optional" />
                </Field>
                <Field id="estimatedToll" label="Toll (PHP)" optional>
                  <Input id="estimatedToll" name="estimatedToll" type="number" min="0" step="0.01" placeholder="Optional" />
                </Field>
                <Field id="estimatedOther" label="Other (PHP)" optional>
                  <Input id="estimatedOther" name="estimatedOther" type="number" min="0" step="0.01" placeholder="Optional" />
                </Field>
                <button type="submit" className={`${buttonStyles({ size: "lg" })} w-full sm:col-span-2`}>
                  Submit shuttle request
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section aria-labelledby="requests-heading" className="mt-16">
        <div className="flex items-end justify-between border-b border-ink pb-3">
          <h2 id="requests-heading" className="text-lg font-extrabold">
            Your requests
          </h2>
          <span className="text-sm text-muted">{requests.length} total</span>
        </div>

        {requests.length > 0 ? (
          <ol className="divide-y divide-line">
            {requests.map((request) => (
              <li key={request.id} className="grid gap-x-5 gap-y-3 py-6 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
                <div className="text-center sm:text-left">
                  <span className="block font-serif text-3xl leading-none tabular-nums">{formatDate(request.dates[0], "d")}</span>
                  <span className="eyebrow mt-1.5 block text-[10px] text-muted">{formatDate(request.dates[0], "MMM yyyy")}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[17px] font-extrabold leading-snug">
                    {request.origin} <span className="font-normal text-muted">to</span> {request.destination}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {request.dates.length > 1 ? `${request.dates.length} travel dates` : formatDate(request.dates[0], "EEE, d MMM")} ·{" "}
                    <span className="tabular-nums">
                      {request.departureTime}
                      {request.arrivalTime ? `–${request.arrivalTime}` : ""}
                    </span>{" "}
                    · {request.passengerCount} {request.passengerCount === 1 ? "passenger" : "passengers"}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{request.purpose}</p>
                  {request.denialReason && <p className="mt-3 border-l-2 border-denied pl-3 text-sm text-ink-soft"><span className="font-bold text-denied">Reason · </span>{request.denialReason}</p>}
                </div>
                <div className="sm:pt-1">
                  <ShuttleStatus status={request.status} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState className="mt-8" title="No shuttle requests yet" description="Your submitted transport requests will appear here." />
        )}
      </section>
    </div>
  );
}
